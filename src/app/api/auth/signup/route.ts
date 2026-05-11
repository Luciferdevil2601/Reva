import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAnon } from "@/lib/supabase";
import { makeSession, setSession } from "@/lib/session";

const Body=z.object({name:z.string().min(1),email:z.string().email(),password:z.string().min(6)});

export async function POST(req:Request){
  const parsed=Body.safeParse(await req.json().catch(()=>null));
  if(!parsed.success) return NextResponse.json({message:"Invalid signup details"},{status:400});
  const body=parsed.data;
  const supabase=getSupabaseAnon();
  if(!supabase){const user=makeSession(body.email,body.name);setSession(user);return NextResponse.json({ok:true,preview:true,user,message:"Preview signup active. Add Supabase keys for production auth."});}
  const {data,error}=await supabase.auth.signUp({email:body.email,password:body.password,options:{data:{name:body.name}}});
  if(error){return NextResponse.json({error,message:"Supabase signup failed. If code is unexpected_failure, run supabase/fix-auth-trigger.sql in SQL Editor."},{status:400});}
  const user=makeSession(body.email,body.name);setSession(user);return NextResponse.json({ok:true,user,data});
}
