"use client";

import { FileUpload } from "@/components/FileUpload";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { TranslationTable } from "@/components/TranslationTable";
import { usePdfProcessor } from "@/hooks/use-pdf-processor";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/DownloadButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Home() {
  const { 
    file, 
    numPages, 
    results, 
    isProcessing, 
    progress, 
    loadPdf, 
    startProcessing, 
    stopProcessing, 
    updateTranslation,
    reset,
    taskType
  } = usePdfProcessor();

  const handleFileSelect = (file: File) => {
    loadPdf(file);
  };

  return (
    <main className="container mx-auto py-8 px-4 space-y-8 min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PDF 智能助手</h1>
          <p className="text-muted-foreground mt-1">
            利用 AI 提取并翻译 PDF 标题，或进行智能纠错。
          </p>
        </div>
        {file && (
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={reset} disabled={isProcessing}>
              重置
            </Button>
            <DownloadButton results={results} disabled={isProcessing || results.filter(r => r.items.length > 0).length === 0} />
          </div>
        )}
      </header>

      {!file ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>上传文档</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFileSelect={handleFileSelect} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  文件信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm font-medium truncate" title={file.name}>
                  {file.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  共发现 {numPages} 页
                </div>
                
                <div className="pt-4 border-t space-y-4">
                  <ProcessingStatus progress={progress} total={numPages} results={results} />
                  
                  <div className="flex flex-col gap-2">
                    {!isProcessing && progress < 100 && (
                      <>
                        <Button onClick={() => startProcessing("translate")} className="w-full">
                          {progress > 0 ? "继续翻译" : "开始标题翻译"}
                        </Button>
                        <Button onClick={() => startProcessing("proofread")} className="w-full" variant="secondary">
                          {progress > 0 ? "继续纠错" : "开始智能纠错"}
                        </Button>
                      </>
                    )}
                    {isProcessing && (
                      <Button onClick={stopProcessing} variant="destructive" className="w-full">
                        停止
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                 <CardTitle className="text-sm font-medium">提示</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• 处理过程完全在浏览器中进行，保护您的隐私。</p>
                <p>• 基于视觉分析仅提取标题内容。</p>
                <p>• 下载前，您可以直接在表格中编辑翻译结果。</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 h-[calc(100vh-200px)] min-h-[500px]">
             {/* Pass results to TranslationTable. Since it is scrollable, we need to ensure container height. */}
            <TranslationTable results={results} mode={taskType} onUpdate={updateTranslation} />
          </div>
        </div>
      )}
    </main>
  );
}
