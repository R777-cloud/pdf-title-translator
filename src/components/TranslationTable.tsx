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
import { memo } from "react";

interface TranslationTableProps {
  results: PageResult[];
  onUpdate: (pageIndex: number, itemIndex: number, field: string, value: string) => void;
}

const TranslationRow = memo(({ 
  pageResult, 
  pageIndex, 
  onUpdate 
}: { 
  pageResult: PageResult, 
  pageIndex: number, 
  onUpdate: TranslationTableProps["onUpdate"] 
}) => {
  if (pageResult.items.length === 0) {
    return (
      <TableRow>
        <TableCell className="font-medium w-[80px] align-top text-muted-foreground">
          第 {pageResult.pageNumber} 页
        </TableCell>
        <TableCell colSpan={4} className="text-muted-foreground text-center italic h-16">
          {pageResult.status === "processing" ? "正在分析..." : 
           pageResult.status === "failed" ? (
             <span title={pageResult.error} className="text-red-500 cursor-help border-b border-dotted border-red-500">
               分析失败: {pageResult.error || "未知错误"}
             </span>
           ) :
           pageResult.status === "pending" ? "等待中..." : "未发现相关内容"}
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
        </TableRow>
      ))}
    </>
  );
});

TranslationRow.displayName = "TranslationRow";

export function TranslationTable({ results, onUpdate }: TranslationTableProps) {
  // Determine global mode from first completed result to set headers
  const firstCompleted = results.find(r => r.items.length > 0);
  const isProofreadMode = firstCompleted ? "correction" in firstCompleted.items[0] : false;

  return (
    <div className="rounded-md border h-full flex flex-col bg-background">
      <div className="border-b bg-muted/40 p-4">
        <div className={`grid gap-4 font-semibold text-sm text-muted-foreground px-2 ${isProofreadMode ? 'grid-cols-[80px_1fr_1fr_1fr]' : 'grid-cols-[80px_1fr_1fr]'}`}>
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
                onUpdate={onUpdate} 
              />
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
