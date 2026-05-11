"use client";
import { useMemo } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { ResumeTemplate } from "@/components/Templates/ResumeTemplate";
import { parseResumeText } from "@/components/Templates/parser";
export function PreviewPanel(){const s=useResumeStore();const data=useMemo(()=>s.optimizedData||parseResumeText(s.resumeText),[s.optimizedData,s.resumeText]);return <section className="previewShell"><div className="previewTop"><select value={s.selectedTemplate} onChange={e=>s.setTemplate(e.target.value as any)}><option>modern</option><option>classic</option><option>minimal</option><option>executive</option><option>creative</option></select><span>A4</span><span>Zoom: 72%</span><button className="btn secondary" onClick={()=>window.print()}>Print Preview</button></div><div className="paperBg"><ResumeTemplate data={data} template={s.selectedTemplate}/></div></section>}
