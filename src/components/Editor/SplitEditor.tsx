"use client";
import { InputPanel } from "./InputPanel";
import { PreviewPanel } from "./PreviewPanel";
import { ScoreBreakdown } from "@/components/ATS/ScoreBreakdown";
export function SplitEditor(){return <div className="dashboard"><InputPanel/><PreviewPanel/><ScoreBreakdown/></div>}
