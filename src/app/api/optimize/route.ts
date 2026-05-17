import { NextResponse } from "next/server";
import { z } from "zod";
import { callAI, fallbackResume } from "@/lib/ai";
import { resumeToLatex } from "@/lib/latex";
import { extractKeywords } from "@/lib/utils";
import type { Education, Experience, ResumeData } from "@/types";

const Body = z.object({
  jd_text: z.string().min(1),
  resume_text: z.string().min(1),
  user_id: z.string().optional(),
});

type OptimizeResult = ResumeData & {
  ats_score_after?: number;
  keywords_added?: string[];
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asList(value: unknown, fallback: string[] = [], limit = 24) {
  return Array.isArray(value) ? value.map(String).map((x) => x.trim()).filter(Boolean).slice(0, limit) : fallback;
}

function normalizeExperience(value: unknown, fallback: Experience[]) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows.map((item) => {
    const row = item as Partial<Experience>;
    return {
      title: asString(row.title),
      company: asString(row.company),
      location: asString(row.location),
      dates: asString(row.dates),
      bullets: asList(row.bullets, [], 6),
    };
  }).filter((row) => row.title && row.bullets.length >= 2 && !/project work$/i.test(row.company));
  return normalized.length ? normalized.slice(0, 3) : fallback;
}

function normalizeEducation(value: unknown, fallback: Education[]) {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows.map((item) => {
    const row = item as Partial<Education>;
    return {
      degree: asString(row.degree),
      school: asString(row.school),
      year: asString(row.year),
      gpa: asString(row.gpa),
    };
  }).filter((row) => (row.degree || row.school) && row.degree.toLowerCase() !== "education" && !/summary|experience|certification|skills|thesis|project|publication/i.test(`${row.degree} ${row.school}`) && `${row.degree} ${row.school}`.length < 180);
  return normalized.length ? normalized.slice(0, 4) : fallback;
}

function cleanSectionList(value: unknown, fallback: string[], limit: number) {
  const blocked = /core skills|professional summary|experience|education|certifications|-- 1 of 1 --|page \d/i;
  const rows = asList(value, [], limit).filter((item) => !blocked.test(item) && item.length < 180);
  return rows.length ? rows : fallback.slice(0, limit);
}

function normalizeResume(raw: Partial<OptimizeResult>, fallback: OptimizeResult) {
  const resume: ResumeData = {
    contact: {
      name: asString(raw.contact?.name, fallback.contact.name),
      email: asString(raw.contact?.email, fallback.contact.email),
      phone: asString(raw.contact?.phone, fallback.contact.phone),
      linkedin: asString(raw.contact?.linkedin, fallback.contact.linkedin),
      location: asString(raw.contact?.location, fallback.contact.location),
    },
    summary: asString(raw.summary, fallback.summary),
    experience: normalizeExperience(raw.experience, fallback.experience),
    skills: asList(raw.skills, fallback.skills, 28),
    education: normalizeEducation(raw.education, fallback.education),
    certifications: cleanSectionList(raw.certifications, fallback.certifications || [], 8),
    projects: cleanSectionList(raw.projects, fallback.projects || [], 6),
  };
  const rawScore = typeof raw.ats_score_after === "number" ? raw.ats_score_after : fallback.ats_score_after;
  return {
    resume,
    ats_score_after: Math.max(0, Math.min(100, Math.round(rawScore || 90))),
    keywords_added: asList(raw.keywords_added, fallback.keywords_added || [], 18),
  };
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Invalid optimization request" }, { status: 400 });
  const body = parsed.data;
  const fallback = fallbackResume(body.resume_text, body.jd_text);
  const jdKeywords = extractKeywords(body.jd_text);
  const raw = await callAI<OptimizeResult>(
    `You are a strict resume tailoring engine, not a creative writer.
Use the fallback resume as the source-of-truth structure. Improve wording only when the uploaded resume proves the claim.
Rules:
1. Preserve the candidate name, contact, education, certifications, project/publication facts, companies, dates, locations, and degrees.
2. Do not invent employers, dates, tools, metrics, certificates, publications, or experience.
3. Use exact job-description keywords only when supported by the uploaded resume or fallback evidence.
4. Rewrite bullets in strong recruiter language, but keep each bullet factual and specific.
5. Output concise ATS-safe content with standard headings and no icons/tables/columns.
6. Preserve multiple education/certification/project items instead of flattening them.
7. Return JSON with contact, summary, experience, skills, education, certifications, projects, ats_score_after, keywords_added.`,
    `JOB DESCRIPTION KEYWORDS:
${jdKeywords.join(", ")}

JOB DESCRIPTION:
${body.jd_text}

UPLOADED RESUME TEXT:
${body.resume_text}

SOURCE-OF-TRUTH FALLBACK JSON:
${JSON.stringify(fallback, null, 2)}`,
    fallback,
  );
  const optimized = normalizeResume(raw, fallback);
  return NextResponse.json({ ...optimized, latex_source: resumeToLatex(optimized.resume) });
}