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

const CONCURRENT_LIMIT = 1;

export function usePdfProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [results, setResults] = useState<PageResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskType, setTaskType] = useState<"translate" | "proofread">("translate");
  
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

      // Note: page.render signature depends on pdfjs-dist version.
      // v4+ requires canvas property if context is provided or intended.
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas, // Explicitly pass canvas for v5 compatibility
      }).promise;

      const imageData = canvas.toDataURL("image/jpeg", 0.8);

      const response = await fetch("/api/analyze-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, task }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.statusText}`);
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

    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < queueIndices.length && !signal.aborted) {
        const queueIndex = currentIndex++;
        if (queueIndex >= queueIndices.length) break;

        const pageIndex = queueIndices[queueIndex];

        setResults((prev) => {
          const next = [...prev];
          next[pageIndex] = { ...next[pageIndex], status: "processing", error: undefined };
          return next;
        });

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
          }
        } catch (err: any) {
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
        }
      }
    };

    const workers = Array(Math.min(CONCURRENT_LIMIT, queueIndices.length))
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
    reset
  };
}
