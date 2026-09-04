import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-xs",
        secondary: "bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0] border border-[#E2E8F0]",
        ghost: "text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9]",
        outline: "border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC]",
        destructive: "bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-xs",
      },
      size: {
        default: "h-9 px-4 rounded-lg text-sm",
        sm: "h-8 px-3 rounded-md text-xs",
        xs: "h-7 px-2 rounded-md text-xs",
        icon: "size-9 rounded-lg",
        "icon-sm": "size-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}