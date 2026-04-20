"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  formatHint: string;
  sample: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

const BulkImportDialog: React.FC<BulkImportDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  formatHint,
  sample,
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[min(56rem,calc(100vw-2rem))] overflow-hidden p-0">
        <div className="flex max-h-[90vh] flex-col">
          <div className="overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-100">
            <p className="font-medium">导入格式</p>
            <p className="mt-1 whitespace-pre-wrap break-words leading-6">{formatHint}</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-white/80 p-3 text-xs leading-6 text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
              {sample}
            </pre>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-import-content">批量内容</Label>
            <Textarea
              id="bulk-import-content"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="每行一条记录，支持英文逗号、中文逗号或制表符分隔"
              className="min-h-[260px] font-mono text-sm"
            />
          </div>
        </div>
          </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "正在导入..." : "开始导入"}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportDialog;
