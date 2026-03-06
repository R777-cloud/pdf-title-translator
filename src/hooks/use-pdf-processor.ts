"use client";

import { useState, useCallback, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

export interface AnalysisItem {
  // Translate mode
  original?: string;
  translated?: string;
  
  // Proofread mode
  context?: string;
  correction?: string;
  explanation?: string;

  [key: string]: string | undefined;
}

export interface PageResult {
  pageNumber: number;
  status: "pending" | "processing" | "completed" | "failed";
  items: AnalysisItem[];
  error?: string;
  originalImage?: string;
}

// const CONCURRENT_LIMIT = 1; // Removed constant

export function usePdfProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [results, setResults] = useState<PageResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskType, setTaskType] = useState<"translate" | "proofread">("translate");
  const [apiKey, setApiKey] = useState<string>("");
  const [accessCode, setAccessCode] = useState<string>("");
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadPdf = useCallback(async (file: File) => {
    try {
      // Dynamic import to avoid SSR issues with DOMMatrix
      const pdfjsLib = await import("pdfjs-dist");
      
      // Initialize worker
      if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      
      setFile(file);
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      
      const initialResults: PageResult[] = Array.from({ length: doc.numPages }, (_, i) => ({
        pageNumber: i + 1,
        status: "pending",
        items: [],
      }));
      setResults(initialResults);
    } catch (error) {
      console.error("Error loading PDF:", error);
      alert("Failed to load PDF. Please try a valid file.");
    }
  }, []);

  const processPage = async (pageIndex: number, doc: PDFDocumentProxy, task: string) => {
    try {
      const page = await doc.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) throw new Error("Canvas context not available");
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // v4+ requires canvas property if context is provided or intended.
      // Use scale 1.5 but cap resolution to avoid 4.5MB limit
      // If image is too large, reduce quality or scale
      // For now, let's keep scale 1.5 but reduce JPEG quality slightly to 0.7 to be safe
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas, 
      }).promise;

      const imageData = canvas.toDataURL("image/jpeg", 0.7);

      const response = await fetch("/api/analyze-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, task, apiKey, accessCode }),
      });

      if (!response.ok) {
        // Attempt to parse JSON error message, fallback to status text if parse fails (e.g. 413 Payload Too Large HTML)
        let errorMessage = `API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If response body is not JSON (e.g. Vercel 413 HTML page), keep default message
          if (response.status === 413) {
            errorMessage = "Payload Too Large (Image size exceeds limit)";
          }
        }
        throw new Error(errorMessage);
      }

      const { data } = await response.json();
      return Array.isArray(data) ? data : [];

    } catch (error) {
      console.error(`Error processing page ${pageIndex + 1}:`, error);
      throw error;
    }
  };

  const startProcessing = useCallback(async (task: "translate" | "proofread" = "translate") => {
    if (!pdfDoc) return;
    
    setTaskType(task);
    setIsProcessing(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Reset results if task type changes or just restart pending/failed
    // For simplicity, we just process pending/failed. 
    // If user switches task, they might want to reset. 
    // But let's assume UI handles reset if needed. 
    // Actually, if we switch tasks, previous results are invalid.
    // Let's NOT clear results automatically to allow "resume", but UI should probably prompt reset.
    // For now, we just process what's pending.

    const queueIndices = results
      .map((r, i) => (r.status === "pending" || r.status === "failed" ? i : -1))
      .filter((i) => i !== -1);

    // Limit batch size if we are resuming from failure to avoid overwhelming the system
    const hasFailures = results.some(r => r.status === "failed");
    const BATCH_SIZE = hasFailures ? 5 : 20; 
    
    const limitedQueueIndices = queueIndices.slice(0, BATCH_SIZE);

    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < limitedQueueIndices.length && !signal.aborted) {
        const queueIndex = currentIndex++;
        if (queueIndex >= limitedQueueIndices.length) break;

        const pageIndex = limitedQueueIndices[queueIndex];

        setResults((prev) => {
          const next = [...prev];
          next[pageIndex] = { ...next[pageIndex], status: "processing", error: undefined };
          return next;
        });

        let retries = 0;
        const maxRetries = 2;
        let success = false;

        while (retries <= maxRetries && !success && !signal.aborted) {
          try {
            const items = await processPage(pageIndex, pdfDoc, task);
            
            if (!signal.aborted) {
              setResults((prev) => {
                const next = [...prev];
                next[pageIndex] = { 
                  ...next[pageIndex], 
                  status: "completed", 
                  items: items 
                };
                return next;
              });
              success = true;
            }
          } catch (err: any) {
            console.warn(`Page ${pageIndex + 1} attempt ${retries + 1} failed:`, err);
            
            if (retries === maxRetries) {
              if (!signal.aborted) {
                setResults((prev) => {
                  const next = [...prev];
                  next[pageIndex] = { 
                    ...next[pageIndex], 
                    status: "failed", 
                    error: err.message 
                  };
                  return next;
                });
              }
              // CRITICAL FIX: Break the loop on final failure so we can move to the next item in queue
              retries++; 
            } else {
              // Wait before retry (exponential backoff: 2s, 4s...)
              await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retries)));
              retries++;
            }
          }
        }
      }
    };

    const concurrencyLimit = 3; // Always allow concurrency even for retries/proofread to avoid getting stuck

    const workers = Array(Math.min(concurrencyLimit, limitedQueueIndices.length))
      .fill(null)
      .map(() => worker());

    await Promise.all(workers);
    
    if (!signal.aborted) {
      setIsProcessing(false);
    }
  }, [pdfDoc, results]);

  const stopProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  const updateTranslation = useCallback((pageIndex: number, itemIndex: number, field: string, value: string) => {
    setResults(prev => {
      const next = [...prev];
      const page = { ...next[pageIndex] };
      const items = [...page.items];
      items[itemIndex] = { ...items[itemIndex], [field]: value };
      page.items = items;
      next[pageIndex] = page;
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setPdfDoc(null);
    setNumPages(0);
    setResults([]);
    setIsProcessing(false);
    setTaskType("translate");
  }, []);

  const progress = numPages > 0 
    ? Math.round((results.filter(r => r.status === "completed").length / numPages) * 100) 
    : 0;

  return {
    file,
    numPages,
    results,
    isProcessing,
    progress,
    taskType,
    loadPdf,
    startProcessing,
    stopProcessing,
    updateTranslation,
    reset,
    apiKey,
    setApiKey,
    accessCode,
    setAccessCode
  };
}
