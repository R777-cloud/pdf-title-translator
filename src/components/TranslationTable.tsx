"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageResult, AnalysisItem } from "@/hooks/use-pdf-processor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { memo } from "react";

interface TranslationTableProps {
  results: PageResult[];
  mode: "translate" | "proofread";
  isProcessing: boolean;
  onUpdate: (pageIndex: number, itemIndex: number, field: string, value: string) => void;
  onRetry: (pageIndex: number) => void;
}

const TranslationRow = memo(({
  pageResult,
  pageIndex,
  isProcessing,
  mode,
  onUpdate,
  onRetry,
}: {
  pageResult: PageResult,
  pageIndex: number,
  isProcessing: boolean,
  mode: "translate" | "proofread",
  onUpdate: TranslationTableProps["onUpdate"],
  onRetry: TranslationTableProps["onRetry"],
}) => {
  const canRetry = pageResult.status === "failed" || pageResult.status === "completed";
  const retryButton = (
    <Button
      variant="ghost"
      size="sm"
      disabled={isProcessing || !canRetry}
      onClick={() => onRetry(pageIndex)}
      className={`h-7 px-2 text-xs ${
        canRetry && !isProcessing
          ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950"
          : "text-muted-foreground"
      }`}
    >
      <RotateCw className="h-3 w-3 mr-1" />
      重试
    </Button>
  );

  if (pageResult.items.length === 0) {
    return (
      <TableRow>
        <TableCell className="font-medium w-[80px] align-top text-muted-foreground">
          第 {pageResult.pageNumber} 页
        </TableCell>
        <TableCell colSpan={mode === "proofread" ? 3 : 2} className="text-muted-foreground h-16">
          {pageResult.status === "processing" ? "正在分析..." :
           pageResult.status === "failed" ? (
             <div className="space-y-1 py-2 text-left">
               <div className="text-red-500 font-medium">分析失败</div>
               <pre className="whitespace-pre-wrap break-words text-xs text-red-500/90 font-mono">
                 {pageResult.error || "未知错误"}
               </pre>
             </div>
           ) :
           pageResult.status === "pending" ? <div className="text-center italic">等待中...</div> : <div className="text-center italic">未发现相关内容</div>}
        </TableCell>
        <TableCell className="align-middle text-center w-[70px]">
          {retryButton}
        </TableCell>
      </TableRow>
    );
  }

  // Determine mode based on first item keys
  const firstItem = pageResult.items[0];
  const isProofread = "correction" in firstItem;

  return (
    <>
      {pageResult.items.map((item, itemIndex) => (
        <TableRow key={`${pageIndex}-${itemIndex}`}>
          {itemIndex === 0 && (
            <TableCell
              rowSpan={pageResult.items.length}
              className="font-medium w-[80px] align-top border-r bg-muted/10"
            >
              第 {pageResult.pageNumber} 页
            </TableCell>
          )}
          
          {isProofread ? (
            // Proofread Mode Columns
            <>
              <TableCell className="align-top p-2 w-1/3">
                <div className="text-sm text-muted-foreground mb-1">原文片段:</div>
                <Textarea
                  value={item.context || ""}
                  onChange={(e) => onUpdate(pageIndex, itemIndex, "context", e.target.value)}
                  className="min-h-[80px] resize-none border-transparent focus:border-input hover:bg-muted/50 text-sm"
                />
              </TableCell>
              <TableCell className="align-top p-2 w-1/3">
                <div className="text-sm text-green-600 mb-1 font-medium">修正建议:</div>
                <Textarea
                  value={item.correction || ""}
                  onChange={(e) => onUpdate(pageIndex, itemIndex, "correction", e.target.value)}
                  className="min-h-[80px] resize-none border-transparent focus:border-input hover:bg-muted/50 font-medium text-green-700 dark:text-green-400"
                />
              </TableCell>
              <TableCell className="align-top p-2 w-1/3">
                <div className="text-sm text-blue-600 mb-1 font-medium">原因:</div>
                <Textarea
                  value={item.explanation || ""}
                  onChange={(e) => onUpdate(pageIndex, itemIndex, "explanation", e.target.value)}
                  className="min-h-[80px] resize-none border-transparent focus:border-input hover:bg-muted/50 text-sm text-muted-foreground"
                />
              </TableCell>
            </>
          ) : (
            // Translate Mode Columns
            <>
              <TableCell className="align-top p-2">
                <Textarea
                  value={item.original || ""}
                  onChange={(e) => onUpdate(pageIndex, itemIndex, "original", e.target.value)}
                  className="min-h-[60px] resize-none border-transparent focus:border-input hover:bg-muted/50"
                />
              </TableCell>
              <TableCell className="align-top p-2">
                <Textarea
                  value={item.translated || ""}
                  onChange={(e) => onUpdate(pageIndex, itemIndex, "translated", e.target.value)}
                  className="min-h-[60px] resize-none border-transparent focus:border-input hover:bg-muted/50 font-medium text-blue-600 dark:text-blue-400"
                />
              </TableCell>
            </>
          )}
          {itemIndex === 0 && (
            <TableCell
              rowSpan={pageResult.items.length}
              className="align-middle text-center w-[70px] border-l"
            >
              {retryButton}
            </TableCell>
          )}
        </TableRow>
      ))}
    </>
  );
});

TranslationRow.displayName = "TranslationRow";

export function TranslationTable({ results, mode, isProcessing, onUpdate, onRetry }: TranslationTableProps) {
  // Determine global mode from props
  const isProofreadMode = mode === "proofread";

  return (
    <div className="rounded-md border h-full flex flex-col bg-background">
      <div className="border-b bg-muted/40 p-4">
        <div className={`grid gap-4 font-semibold text-sm text-muted-foreground px-2 ${isProofreadMode ? 'grid-cols-[80px_1fr_1fr_1fr_70px]' : 'grid-cols-[80px_1fr_1fr_70px]'}`}>
          <div>页码</div>
          {isProofreadMode ? (
            <>
              <div>错误上下文</div>
              <div>修正建议</div>
              <div>修改原因</div>
            </>
          ) : (
            <>
              <div>原文标题 (中文)</div>
              <div>译文标题 (英文)</div>
            </>
          )}
          <div>操作</div>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <Table>
          <TableBody>
            {results.map((page, index) => (
              <TranslationRow
                key={page.pageNumber}
                pageResult={page}
                pageIndex={index}
                isProcessing={isProcessing}
                mode={mode}
                onUpdate={onUpdate}
                onRetry={onRetry}
              />
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
