"use client";

import { Progress } from "@/components/ui/progress";
import { PageResult } from "@/hooks/use-pdf-processor";

interface ProcessingStatusProps {
  progress: number;
  total: number;
  results: PageResult[];
}

export function ProcessingStatus({ progress, total, results }: ProcessingStatusProps) {
  const completed = results.filter((r) => r.status === "completed").length;
  const processing = results.filter((r) => r.status === "processing").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          处理中... {Math.round(progress)}%
        </span>
        <span className="text-muted-foreground">
          {completed}/{total} 页
        </span>
      </div>
      <Progress value={progress} className="w-full" />
      <div className="grid grid-cols-3 gap-4 text-center text-xs text-muted-foreground">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-green-500">{completed}</span>
          <span>已完成</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-blue-500">{processing}</span>
          <span>处理中</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-red-500">{failed}</span>
          <span>失败</span>
        </div>
      </div>
    </div>
  );
}
