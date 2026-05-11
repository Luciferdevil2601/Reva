"use client";

import { create } from "zustand";
import type { AnalysisResult, ResumeData, ScoreBreakdown, TemplateId } from "@/types";

type Step = "input" | "analyzed" | "optimized";

type State = {
  jdText: string;
  resumeText: string;
  selectedTemplate: TemplateId;
  atsScoreBefore: number;
  breakdown: ScoreBreakdown | null;
  keywordsFound: string[];
  keywordsMissing: string[];
  tips: string[];
  optimizedData: ResumeData | null;
  atsScoreAfter: number;
  keywordsAdded: string[];
  latexSource: string;
  step: Step;
  isAnalyzing: boolean;
  isOptimizing: boolean;
  isDownloading: boolean;
  error: string | null;
  setJD: (v: string) => void;
  setResume: (v: string) => void;
  setTemplate: (v: TemplateId) => void;
  analyze: () => Promise<boolean>;
  optimize: () => Promise<void>;
  downloadPDF: () => Promise<void>;
  downloadLatex: () => void;
  reset: () => void;
};

const sampleJD =
  "We need a frontend engineer with React, TypeScript, Next.js, REST API, testing, analytics, and strong communication. AWS and Docker are preferred.";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error?.message || "Request failed");
  return data as T;
}

export const useResumeStore = create<State>((set, get) => ({
  jdText: sampleJD,
  resumeText: "",
  selectedTemplate: "modern",
  atsScoreBefore: 0,
  breakdown: null,
  keywordsFound: [],
  keywordsMissing: [],
  tips: [],
  optimizedData: null,
  atsScoreAfter: 0,
  keywordsAdded: [],
  latexSource: "",
  step: "input",
  isAnalyzing: false,
  isOptimizing: false,
  isDownloading: false,
  error: null,
  setJD: (v) => set({ jdText: v, step: get().optimizedData ? "input" : get().step }),
  setResume: (v) =>
    set({
      resumeText: v,
      optimizedData: null,
      atsScoreAfter: 0,
      keywordsAdded: [],
      latexSource: "",
      step: "input",
    }),
  setTemplate: (v) => set({ selectedTemplate: v }),
  reset: () =>
    set({
      jdText: "",
      resumeText: "",
      optimizedData: null,
      step: "input",
      atsScoreBefore: 0,
      atsScoreAfter: 0,
      latexSource: "",
    }),
  analyze: async () => {
    const { jdText, resumeText } = get();
    if (!jdText.trim() || !resumeText.trim()) {
      set({ error: "Paste the job description and upload your old resume first." });
      return false;
    }
    set({ isAnalyzing: true, error: null });
    try {
      const data = await postJson<AnalysisResult>("/api/analyze", {
        jd_text: jdText,
        resume_text: resumeText,
      });
      set({
        atsScoreBefore: data.ats_score,
        breakdown: data.breakdown,
        keywordsFound: data.keywords_found,
        keywordsMissing: data.keywords_missing,
        tips: data.improvement_tips,
        step: "analyzed",
      });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Analysis failed. Try again." });
      return false;
    } finally {
      set({ isAnalyzing: false });
    }
  },
  optimize: async () => {
    const { jdText, resumeText } = get();
    if (!jdText.trim() || !resumeText.trim()) {
      set({ error: "Paste the job description and upload your old resume first." });
      return;
    }
    set({ isOptimizing: true, error: null });
    try {
      if (get().step === "input") {
        const ok = await get().analyze();
        if (!ok) return;
      }
      const data = await postJson<{
        resume: ResumeData;
        ats_score_after: number;
        keywords_added: string[];
        latex_source: string;
      }>("/api/optimize", { jd_text: jdText, resume_text: resumeText });
      set({
        optimizedData: data.resume,
        atsScoreAfter: data.ats_score_after,
        keywordsAdded: data.keywords_added,
        latexSource: data.latex_source,
        step: "optimized",
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Optimization failed. Try again." });
    } finally {
      set({ isOptimizing: false });
    }
  },
  downloadPDF: async () => {
    set({ isDownloading: true });
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_data: get().optimizedData,
          template: get().selectedTemplate,
        }),
      });
      if (!response.ok) throw new Error("PDF download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "optimized-resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "PDF download failed." });
    } finally {
      set({ isDownloading: false });
    }
  },
  downloadLatex: () => {
    const source = get().latexSource;
    if (!source) {
      set({ error: "Optimize the resume first to generate LaTeX." });
      return;
    }
    const blob = new Blob([source], { type: "application/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailored-resume.tex";
    a.click();
    URL.revokeObjectURL(url);
  },
}));
