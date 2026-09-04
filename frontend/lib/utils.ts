import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatClock(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatWait(ts: number) {
    const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (mins < 1) return "Just now";
    if (mins === 1) return "1 min";
    return `${mins} min`;
}