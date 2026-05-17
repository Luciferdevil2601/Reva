"use client";
import { useRef, useState } from "react";
import { Copy, FileUp, Loader2, Upload } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { TemplateSelector } from "@/components/Templates/TemplateSelector";
import { OPENROUTER_MODELS } from "@/lib/utils";

const SAMPLE_RESUME = `Ganesh Kumar
Email: ganesh@example.com
Phone: +91 90000 00000
LinkedIn: linkedin.com/in/ganesh
Location: India

Summary
Frontend Developer building React and TypeScript dashboards for business users.

Experience
Frontend Developer - Project Work | 2024-2026
- Developed Next.js dashboard modules using REST API integrations.
- Improved reporting speed by 35 percent with reusable components.
- Collaborated with QA on testing and agile delivery.

Skills
React, TypeScript, JavaScript, Next.js, REST API, SQL, analytics, communication

Education
B.Pharm - University | 2024`;

function readMessage(raw:string){
  if(!raw) return "";
  try{
    const data=JSON.parse(raw);
    return String(data.message||data.error?.message||"");
  }catch{
    return raw.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,160);
  }
}

export function InputPanel(){
  const s=useResumeStore();
  const fileRef=useRef<HTMLInputElement>(null);
  const [resumeFile,setResumeFile]=useState<{name:string;size:number}|null>(null);
  const [uploading,setUploading]=useState(false);
  const [uploadError,setUploadError]=useState("");
  async function uploadResume(file:File){
    setUploading(true); setUploadError("");
    const form=new FormData(); form.append("file",file);
    try{
      const r=await fetch("/api/parse-resume",{method:"POST",body:form});
      const raw=await r.text();
      const data=r.ok&&raw?JSON.parse(raw):{};
      if(!r.ok) throw new Error(readMessage(raw)||"Could not parse resume");
      s.setResume(data.text);
      setResumeFile({name:data.filename,size:data.size});
    }catch(e){setUploadError(e instanceof Error?e.message:"Could not parse resume. Try DOCX or TXT if this is a scanned PDF.");}
    finally{setUploading(false);}
  }
  return <aside className="inputPanel"><div className="formScroll"><div className="field"><label>Job Description <small>{s.jdText.length}/4000</small></label><textarea rows={8} value={s.jdText} onChange={e=>s.setJD(e.target.value)} placeholder="Paste the full job description here..."/></div><div><b>Upload Old Resume</b><button type="button" className={`uploadBox ${resumeFile?'parsed':''}`} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files?.[0];if(f) uploadResume(f)}} disabled={uploading}><input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" hidden onChange={e=>e.target.files?.[0]&&uploadResume(e.target.files[0])}/>{uploading?<Loader2 className="spin"/>:<FileUp/>}<span>{uploading?'Parsing resume...':resumeFile?`Parsed: ${resumeFile.name}`:'Click or drag PDF, DOCX, or TXT resume'}</span>{resumeFile&&<small>{Math.round(resumeFile.size/1024)} KB parsed and ready</small>}</button>{uploadError&&<p className="errorText">{uploadError}</p>}<button type="button" className="btn secondary" onClick={()=>s.setResume(SAMPLE_RESUME)}>Use Sample Resume</button><div className="field parsedText"><label>Old Resume Text <small>{s.resumeText.length}/6000</small></label><textarea rows={8} value={s.resumeText} onChange={e=>s.setResume(e.target.value)} placeholder="Or paste your existing resume text here..."/></div></div><div className="card"><Upload size={18}/><p><b>Workflow:</b> paste JD, upload or paste old resume, tailor with JD keywords, download the finished PDF.</p></div><TemplateSelector/></div><div className="stickyActions"><button className="btn" onClick={s.analyze} disabled={s.isAnalyzing||s.isOptimizing||!s.jdText.trim()||!s.resumeText.trim()}>{s.isAnalyzing?'Analyzing...':'Analyze ATS Score'}</button><button className="btn" onClick={s.optimize} disabled={s.isOptimizing||s.isAnalyzing||!s.jdText.trim()||!s.resumeText.trim()}>{s.isOptimizing?'Tailoring Resume...':'Tailor Resume'}</button><button className="btn secondary" onClick={s.downloadPDF} disabled={s.step!=='optimized'||s.isDownloading}>{s.isDownloading?'Preparing PDF...':'Download PDF'}</button><button className="btn secondary" onClick={s.copyResume} disabled={!s.resumeText&&!s.optimizedData}><Copy size={16}/> Copy</button>{s.error&&<p style={{color:'var(--red)'}}>{s.error}</p>}</div></aside>}
