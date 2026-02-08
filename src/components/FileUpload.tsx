"use client";

import { UploadCloud } from "lucide-react";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  className?: string;
}

export function FileUpload({ onFileSelect, className }: FileUploadProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      className={cn(
        "border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-upload")?.click()}
    >
      <input
        id="file-upload"
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleChange}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-muted rounded-full">
          <UploadCloud className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">上传 PDF 文件</h3>
          <p className="text-sm text-muted-foreground">
            拖拽文件到这里，或点击浏览
          </p>
        </div>
      </div>
    </div>
  );
}
