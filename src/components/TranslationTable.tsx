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
import { PageResult, TranslationItem } from "@/hooks/use-pdf-processor";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { memo } from "react";

interface TranslationTableProps {
  results: PageResult[];
  onUpdate: (pageIndex: number, itemIndex: number, field: "original" | "translated", value: string) => void;
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
        <TableCell colSpan={2} className="text-muted-foreground text-center italic h-16">
          {pageResult.status === "processing" ? "正在分析..." : 
           pageResult.status === "failed" ? "分析失败" :
           pageResult.status === "pending" ? "等待中..." : "未发现标题"}
        </TableCell>
      </TableRow>
    );
  }

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
          <TableCell className="align-top p-2">
            <Textarea
              value={item.original}
              onChange={(e) => onUpdate(pageIndex, itemIndex, "original", e.target.value)}
              className="min-h-[60px] resize-none border-transparent focus:border-input hover:bg-muted/50"
            />
          </TableCell>
          <TableCell className="align-top p-2">
            <Textarea
              value={item.translated}
              onChange={(e) => onUpdate(pageIndex, itemIndex, "translated", e.target.value)}
              className="min-h-[60px] resize-none border-transparent focus:border-input hover:bg-muted/50 font-medium text-blue-600 dark:text-blue-400"
            />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
});

TranslationRow.displayName = "TranslationRow";

export function TranslationTable({ results, onUpdate }: TranslationTableProps) {
  return (
    <div className="rounded-md border h-full flex flex-col bg-background">
      <div className="border-b bg-muted/40 p-4">
        <div className="grid grid-cols-[80px_1fr_1fr] gap-4 font-semibold text-sm text-muted-foreground px-2">
          <div>页码</div>
          <div>原文标题 (中文)</div>
          <div>译文标题 (英文)</div>
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
