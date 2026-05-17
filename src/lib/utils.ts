import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const OPENROUTER_MODELS=["minimax/minimax-m2.5:free","nvidia/nemotron-3-nano-30b-a3b:free","nvidia/nemotron-3-super-120b-a12b:free"] as const;
const STOPWORDS = new Set(["a","an","the","and","or","for","with","you","our","will","are","job","role","need","needs","requiring","required","preferred","strong","we","to","of","in"]);
export function extractKeywords(text:string){const known=text.toLowerCase().match(/\b(react|typescript|javascript|node|next|next\.js|aws|docker|kubernetes|sql|api|apis|agile|leadership|testing|analytics|cloud|python|java|system design|rest|rest api|sales|marketing|excel|power bi|figma|tailwind|supabase|postgres|mongodb|devops|ci\/cd|seo|crm|communication|frontend engineer|analytics dashboards)\b/g)||[];const phrases=text.toLowerCase().match(/\b[a-z][a-z0-9+#./-]{2,}(?:\s+[a-z][a-z0-9+#./-]{2,})?\b/g)||[];return Array.from(new Set([...known,...phrases].map(k=>k.replace(/[.,;:]+$/g,"").trim()).filter(k=>k&&!k.split(/\s+/).some(w=>STOPWORDS.has(w))))).slice(0,32)}
