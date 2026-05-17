import { NextResponse } from "next/server";
import { z } from "zod";
import type { AnalysisResult } from "@/types";
import { callAI, fallbackAnalysis } from "@/lib/ai";

const Body=z.object({jd_text:z.string().min(1),resume_text:z.string().min(1),model:z.string().min(1).optional(),user_id:z.string().optional(),email:z.string().email().optional()});
function clamp(n:unknown,max:number){const v=typeof n==="number"&&Number.isFinite(n)?n:0;return Math.max(0,Math.min(max,Math.round(v)))}
function list(v:unknown){return Array.isArray(v)?v.map(String).slice(0,24):[]}
function normalize(raw:Partial<AnalysisResult>,fb:AnalysisResult):AnalysisResult{const b=raw.breakdown||fb.breakdown;const breakdown={keyword_match:clamp(b.keyword_match,40),section_headers:clamp(b.section_headers,20),file_format:clamp(b.file_format,15),quantified_items:clamp(b.quantified_items,15),clean_formatting:clamp(b.clean_formatting,10)};const ats_score=clamp(Object.values(breakdown).reduce((a,v)=>a+v,0),100);return {ats_score,breakdown,keywords_found:list(raw.keywords_found).length?list(raw.keywords_found):fb.keywords_found,keywords_missing:list(raw.keywords_missing).length?list(raw.keywords_missing):fb.keywords_missing,quick_wins:list(raw.quick_wins).length?list(raw.quick_wins):fb.quick_wins,improvement_tips:list(raw.improvement_tips).length?list(raw.improvement_tips):fb.improvement_tips,weak_sections:list(raw.weak_sections).length?list(raw.weak_sections):fb.weak_sections,formatting_issues:list(raw.formatting_issues).length?list(raw.formatting_issues):fb.formatting_issues,model_used:raw.model_used}}

export async function POST(req:Request){
  const parsed=Body.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({message:"Invalid analysis request"},{status:400});
  const body=parsed.data;
  const fallback=fallbackAnalysis(body.jd_text,body.resume_text);
  const raw=await callAI<AnalysisResult>("You are an expert ATS scoring engine. Simulate a recruiter ATS scan. Return ONLY JSON with ats_score, breakdown keyword_match out of 40 section_headers out of 20 file_format out of 15 quantified_items out of 15 clean_formatting out of 10, keywords_found, keywords_missing, weak_sections, formatting_issues, quick_wins, improvement_tips.",`JD: ${body.jd_text}\n\nResume: ${body.resume_text}`,fallback,body.model);
  return NextResponse.json(normalize(raw,fallback));
}
