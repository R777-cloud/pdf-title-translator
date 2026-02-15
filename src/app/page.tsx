"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/FileUpload";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { TranslationTable } from "@/components/TranslationTable";
import { usePdfProcessor } from "@/hooks/use-pdf-processor";
import { Button } from "@/components/ui/button";
import { DownloadButton } from "@/components/DownloadButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FileText, KeyRound, ArrowRight } from "lucide-react";

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
    taskType,
    apiKey,
    setApiKey
  } = usePdfProcessor();

  const [isConfigured, setIsConfigured] = useState(false);

  const handleFileSelect = (file: File) => {
    loadPdf(file);
  };

  const handleEnterApp = () => {
    setIsConfigured(true);
  };

  if (!isConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">欢迎使用 PDF 智能助手</CardTitle>
            <CardDescription>
              请输入您的 Google Gemini API Key 或团队访问密码以开始使用
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="API Key (sk-...) 或 团队密码" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="text-center h-12 text-lg"
              />
              <p className="text-xs text-muted-foreground text-center">
                如果您是应用所有者，请使用预设的团队密码或 API Key。
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full h-11 text-base" onClick={handleEnterApp}>
              进入应用 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4 space-y-8 min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PDF 智能助手</h1>
          <p className="text-muted-foreground mt-1">
            利用 AI 提取并翻译 PDF 标题，或进行智能纠错。
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setIsConfigured(false)}>
            <KeyRound className="mr-2 h-4 w-4" />
            {apiKey ? "已配置 Key" : "使用默认 Key"}
          </Button>
          {file && (
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={reset} disabled={isProcessing}>
                重置
              </Button>
              <DownloadButton results={results} disabled={isProcessing || results.filter(r => r.items.length > 0).length === 0} />
            </div>
          )}
        </div>
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
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => startProcessing("proofread")} 
                          className="flex-1" 
                          variant={progress > 0 && taskType === "proofread" ? "default" : "outline"}
                        >
                          {progress > 0 ? "继续纠错" : "开始智能纠错"}
                        </Button>
                        <Button 
                          onClick={() => startProcessing("translate")} 
                          className="flex-1" 
                          variant={progress > 0 && taskType === "translate" ? "default" : "outline"}
                        >
                          {progress > 0 ? "继续翻译" : "开始标题翻译"}
                        </Button>
                      </div>
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
