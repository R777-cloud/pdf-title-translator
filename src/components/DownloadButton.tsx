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

      const rows = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 1000, type: WidthType.DXA },
              children: [new Paragraph({ text: "页码", style: "Heading2" })],
            }),
            new TableCell({
              width: { size: 4250, type: WidthType.DXA },
              children: [new Paragraph({ text: "原文标题", style: "Heading2" })],
            }),
            new TableCell({
              width: { size: 4250, type: WidthType.DXA },
              children: [new Paragraph({ text: "英文翻译", style: "Heading2" })],
            }),
          ],
        }),
      ];

      results.forEach((page) => {
        if (page.items.length > 0) {
          page.items.forEach((item, index) => {
            rows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: index === 0 ? page.pageNumber.toString() : "" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: item.original })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: item.translated })],
                  }),
                ],
              })
            );
          });
        }
      });

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: "翻译报告",
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
      a.download = "标题翻译报告.docx";
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
