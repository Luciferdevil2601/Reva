import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAnon } from "@/lib/supabase";
import { makeSession, setSession } from "@/lib/session";
const Body=z.object({email:z.string().email(),password:z.string().min(1)});
export async function POST(req:Request){const body=Body.parse(await req.json());const supabase=getSupabaseAnon();if(!supabase){const user=makeSession(body.email);setSession(user);return NextResponse.json({ok:true,preview:true,user,message:"Preview login active. Add Supabase keys for production auth."});}const {data,error}=await supabase.auth.signInWithPassword({email:body.email,password:body.password});if(error)return NextResponse.json({error},{status:400});const user=makeSession(data.user.email||body.email, data.user.user_metadata?.name);setSession(user);return NextResponse.json({ok:true,user,data});}
