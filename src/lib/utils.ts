import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function extractKeywords(text:string){return Array.from(new Set((text.toLowerCase().match(/\b(react|typescript|javascript|node|next|aws|docker|kubernetes|sql|api|agile|leadership|testing|analytics|cloud|python|java|system design|rest)\b/g)||[]))).slice(0,24)}
