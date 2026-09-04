import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "brand" | "ok" | "wait" | "muted" | "danger";
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium tracking-wide",
        tone === "neutral" && "bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]",
        tone === "brand" && "bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]",
        tone === "ok" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
        tone === "wait" && "bg-amber-50 text-amber-700 border border-amber-200",
        tone === "muted" && "text-[#94A3B8] bg-[#F8FAFC] border border-[#E2E8F0]",
        tone === "danger" && "bg-rose-50 text-rose-700 border border-rose-200",
        className
      )}
      {...props}
    />
  );
}