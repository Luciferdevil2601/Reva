import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export const OPENROUTER_MODELS = [
  "minimax/minimax-m2.5:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
] as const;

const STOPWORDS = new Set([
  "a","an","the","and","or","for","with","you","our","will","are","job","role","need","needs","requiring","required","preferred","strong","we","to","of","in","on","as","by","from","this","that","your","their","candidate","responsibilities","requirements",
]);

const KNOWN_TERMS = /\b(clinical data management|clinical data validation|clinical data|data cleaning|data validation|query resolution|discrepancy identification|data transfer specifications|external lab data|diagnostic data|lab reports|regulatory documentation|audit-ready documentation|project documentation|metric tracking|sop compliance|sop|gxp|alcoa\+?|ich-gcp|hipaa|clinical trial|clinical trials|drug safety|pharmacovigilance|medical coding|meddra|who-dd|edc|ctms|cdms|sas|sql|excel|power bi|analytics|quality control|qc|quality assurance|qa|cross-functional communication|stakeholder communication|mentoring|training|react|typescript|javascript|node|next|next\.js|aws|docker|kubernetes|api|apis|agile|testing|python|java|rest|rest api|figma|tailwind|supabase|postgres|mongodb|devops|ci\/cd|seo|crm|frontend engineer)\b/g;

export function extractKeywords(text: string) {
  const lower = text.toLowerCase();
  const known = lower.match(KNOWN_TERMS) || [];
  const phrases = lower.match(/\b[a-z][a-z0-9+#./-]{2,}(?:\s+[a-z][a-z0-9+#./-]{2,})?\b/g) || [];
  return Array.from(new Set([...known, ...phrases]
    .map((k) => k.replace(/[.,;:]+$/g, "").trim())
    .filter((k) => k && !k.split(/\s+/).some((w) => STOPWORDS.has(w)))))
    .slice(0, 40);
}