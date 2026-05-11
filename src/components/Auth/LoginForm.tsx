"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function LoginForm(){
  const router=useRouter();const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  async function submit(e:React.FormEvent){
    e.preventDefault();setLoading(true);setError("");
    try{
      const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
      const raw=await r.text();const data=raw?JSON.parse(raw):{};
      if(!r.ok){setError(data.error?.message||data.message||"Login failed");return;}
      router.push(data.user?.isOwner?"/owner":"/dashboard");router.refresh();
    }catch{setError("Login failed. Please retry.");}
    finally{setLoading(false);}
  }
  return <form className="authCard" onSubmit={submit}><h1>Login</h1><div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></div><div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div><label className="check"><input type="checkbox"/> Remember me for 30 days</label>{error&&<p className="errorText">{error}</p>}<button className="btn" disabled={loading}>{loading?"Logging in...":"Login"}</button><p><Link href="/signup">Create account</Link></p><p><small>Owner emails open the owner dashboard automatically.</small></p></form>;
}
