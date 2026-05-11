import { NextResponse } from "next/server";
import { z } from "zod";
import { callAI, fallbackResume } from "@/lib/ai";
const Body=z.object({jd_text:z.string().min(1),resume_text:z.string().min(1),user_id:z.string().optional()});
export async function POST(req:Request){const body=Body.parse(await req.json());const fb=fallbackResume(body.resume_text,body.jd_text);const result=await callAI("You are a senior ATS resume optimization expert. Rewrite truthfully for a 95+ ATS score. Return ONLY JSON: contact, summary, experience, skills, education, certifications, ats_score_after, keywords_added.",`JD: ${body.jd_text}\n\nResume: ${body.resume_text}`,fb);return NextResponse.json({resume:result,ats_score_after:(result as any).ats_score_after||95,keywords_added:(result as any).keywords_added||[]})}
