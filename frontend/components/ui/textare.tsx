import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-xs md:text-sm text-[#0F172A] placeholder:text-[#94A3B8] shadow-xs outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]",
        className
      )}
      {...props}
    />
  );
}