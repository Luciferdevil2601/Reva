import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const OPENROUTER_MODELS=["minimax/minimax-m2.5:free","nvidia/nemotron-3-nano-30b-a3b:free","nvidia/nemotron-3-super-120b-a12b:free"] as const;
export function extractKeywords(text:string){const known=text.toLowerCase().match(/\b(react|typescript|javascript|node|next|aws|docker|kubernetes|sql|api|agile|leadership|testing|analytics|cloud|python|java|system design|rest|sales|marketing|excel|power bi|figma|tailwind|supabase|postgres|mongodb|devops|ci\/cd|seo|crm|communication)\b/g)||[];const phrases=text.toLowerCase().match(/\b[a-z][a-z0-9+#./-]{2,}(?:\s+[a-z][a-z0-9+#./-]{2,})?\b/g)||[];return Array.from(new Set([...known,...phrases].filter(k=>!["the","and","for","with","you","our","will","are","job","role"].includes(k)))).slice(0,32)}
