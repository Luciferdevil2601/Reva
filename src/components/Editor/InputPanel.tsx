"use client";
import { useRef, useState } from "react";
import { FileUp, Loader2, Upload } from "lucide-react";
import { useResumeStore } from "@/store/useResumeStore";
import { TemplateSelector } from "@/components/Templates/TemplateSelector";

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
      const data=await r.json();
      if(!r.ok) throw new Error(data.message||"Could not parse resume");
      s.setResume(data.text);
      setResumeFile({name:data.filename,size:data.size});
    }catch(e){setUploadError(e instanceof Error?e.message:"Could not parse resume");}
    finally{setUploading(false);}
  }
  return <aside className="inputPanel"><div className="formScroll"><div className="field"><label>Job Description <small>{s.jdText.length}/4000</small></label><textarea rows={8} value={s.jdText} onChange={e=>s.setJD(e.target.value)} placeholder="Paste the full job description here..."/></div><div><b>Upload Old Resume</b><button type="button" className={`uploadBox ${resumeFile?'parsed':''}`} onClick={()=>fileRef.current?.click()} disabled={uploading}><input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" hidden onChange={e=>e.target.files?.[0]&&uploadResume(e.target.files[0])}/>{uploading?<Loader2 className="spin"/>:<FileUp/>}<span>{uploading?'Parsing resume...':resumeFile?`Parsed: ${resumeFile.name}`:'Click to upload PDF, DOCX, or TXT resume'}</span>{resumeFile&&<small>{Math.round(resumeFile.size/1024)} KB parsed and ready</small>}</button>{uploadError&&<p className="errorText">{uploadError}</p>}{s.resumeText&&<details className="parsedText"><summary>View parsed resume text</summary><textarea rows={8} value={s.resumeText} onChange={e=>s.setResume(e.target.value)}/></details>}</div><div className="card"><Upload size={18}/><p><b>Workflow:</b> paste JD, upload old resume, analyze, optimize, download PDF.</p></div><TemplateSelector/></div><div className="stickyActions"><button className="btn" onClick={s.analyze} disabled={s.isAnalyzing||!s.jdText.trim()||!s.resumeText.trim()}>{s.isAnalyzing?'Analyzing...':'Analyze ATS Score'}</button><button className="btn" onClick={s.optimize} disabled={s.step==='input'||s.isOptimizing}>{s.isOptimizing?'Optimizing...':'Optimize Resume'}</button><button className="btn secondary" onClick={s.downloadPDF} disabled={s.step!=='optimized'||s.isDownloading}>{s.isDownloading?'Preparing PDF...':'Download PDF'}</button>{s.error&&<p style={{color:'var(--red)'}}>{s.error}</p>}</div></aside>}
