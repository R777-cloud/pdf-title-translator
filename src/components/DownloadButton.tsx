"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle } from "docx";
import { PageResult } from "@/hooks/use-pdf-processor";
import { useState } from "react";

interface DownloadButtonProps {
  results: PageResult[];
  disabled?: boolean;
}

export function DownloadButton({ results, disabled }: DownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    try {
      setIsGenerating(true);

      const firstCompleted = results.find(r => r.items.length > 0);
      const isProofreadMode = firstCompleted ? "correction" in firstCompleted.items[0] : false;

      const headerRow = new TableRow({
        tableHeader: true,
        children: isProofreadMode ? [
          new TableCell({ width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ text: "页码", style: "Heading2" })] }),
          new TableCell({ width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ text: "错误片段", style: "Heading2" })] }),
          new TableCell({ width: { size: 2800, type: WidthType.DXA }, children: [new Paragraph({ text: "修正建议", style: "Heading2" })] }),
          new TableCell({ width: { size: 2900, type: WidthType.DXA }, children: [new Paragraph({ text: "修改原因", style: "Heading2" })] }),
        ] : [
          new TableCell({ width: { size: 1000, type: WidthType.DXA }, children: [new Paragraph({ text: "页码", style: "Heading2" })] }),
          new TableCell({ width: { size: 4250, type: WidthType.DXA }, children: [new Paragraph({ text: "原文标题", style: "Heading2" })] }),
          new TableCell({ width: { size: 4250, type: WidthType.DXA }, children: [new Paragraph({ text: "英文翻译", style: "Heading2" })] }),
        ],
      });

      const rows = [headerRow];

      results.forEach((page) => {
        if (page.items.length > 0) {
          page.items.forEach((item, index) => {
            const rowChildren = isProofreadMode ? [
              new TableCell({ children: [new Paragraph({ text: index === 0 ? page.pageNumber.toString() : "" })] }),
              new TableCell({ children: [new Paragraph({ text: item.context || "" })] }),
              new TableCell({ children: [new Paragraph({ text: item.correction || "" })] }),
              new TableCell({ children: [new Paragraph({ text: item.explanation || "" })] }),
            ] : [
              new TableCell({ children: [new Paragraph({ text: index === 0 ? page.pageNumber.toString() : "" })] }),
              new TableCell({ children: [new Paragraph({ text: item.original || "" })] }),
              new TableCell({ children: [new Paragraph({ text: item.translated || "" })] }),
            ];

            rows.push(new TableRow({ children: rowChildren }));
          });
        }
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: isProofreadMode ? "智能纠错报告" : "翻译报告",
                heading: "Heading1",
                spacing: { after: 200 },
              }),
              new Table({
                rows: rows,
                width: { size: 9500, type: WidthType.DXA },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1 },
                  bottom: { style: BorderStyle.SINGLE, size: 1 },
                  left: { style: BorderStyle.SINGLE, size: 1 },
                  right: { style: BorderStyle.SINGLE, size: 1 },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1 },
                },
              }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = isProofreadMode ? "智能纠错报告.docx" : "标题翻译报告.docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating Word document:", error);
      alert("生成文档失败。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      onClick={handleDownload} 
      disabled={disabled || isGenerating}
      className="w-full sm:w-auto"
    >
      <Download className="mr-2 h-4 w-4" />
      {isGenerating ? "生成中..." : "下载 Word"}
    </Button>
  );
}
