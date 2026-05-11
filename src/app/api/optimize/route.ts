import { NextResponse } from "next/server";
import { z } from "zod";
import { callAI, fallbackResume } from "@/lib/ai";
import type { ResumeData } from "@/types";

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

function asList(value: unknown, fallback: string[] = []) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : fallback;
}

function normalizeResume(raw: Partial<OptimizeResult>, fallback: OptimizeResult) {
  const firstExperience = raw.experience?.[0] || fallback.experience[0];
  const firstEducation = raw.education?.[0] || fallback.education[0];
  const resume: ResumeData = {
    contact: {
      name: asString(raw.contact?.name, fallback.contact.name),
      email: asString(raw.contact?.email, fallback.contact.email),
      phone: asString(raw.contact?.phone, fallback.contact.phone),
      linkedin: asString(raw.contact?.linkedin, fallback.contact.linkedin),
      location: asString(raw.contact?.location, fallback.contact.location),
    },
    summary: asString(raw.summary, fallback.summary),
    experience: [
      {
        title: asString(firstExperience?.title, fallback.experience[0].title),
        company: asString(firstExperience?.company, fallback.experience[0].company),
        location: asString(firstExperience?.location, fallback.experience[0].location),
        dates: asString(firstExperience?.dates, fallback.experience[0].dates),
        bullets: asList(firstExperience?.bullets, fallback.experience[0].bullets).slice(0, 6),
      },
    ],
    skills: asList(raw.skills, fallback.skills).slice(0, 24),
    education: [
      {
        degree: asString(firstEducation?.degree, fallback.education[0].degree),
        school: asString(firstEducation?.school, fallback.education[0].school),
        year: asString(firstEducation?.year, fallback.education[0].year),
        gpa: asString(firstEducation?.gpa, fallback.education[0].gpa),
      },
    ],
    certifications: asList(raw.certifications, fallback.certifications || []),
  };
  return {
    resume,
    ats_score_after: Math.max(0, Math.min(100, Math.round(raw.ats_score_after || 95))),
    keywords_added: asList(raw.keywords_added, fallback.keywords_added || []),
  };
}

export async function POST(req: Request) {
  const body = Body.parse(await req.json());
  const fallback = fallbackResume(body.resume_text, body.jd_text);
  const raw = await callAI<OptimizeResult>(
    "You are a senior ATS resume optimization expert. Rewrite truthfully for a 95+ ATS score. Return ONLY JSON: contact, summary, experience, skills, education, certifications, ats_score_after, keywords_added.",
    `JD: ${body.jd_text}\n\nResume: ${body.resume_text}`,
    fallback,
  );
  return NextResponse.json(normalizeResume(raw, fallback));
}
