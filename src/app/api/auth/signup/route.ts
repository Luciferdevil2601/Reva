import { NextResponse } from "next/server";
import { getSupabaseAnon } from "@/lib/supabase";
export async function POST(req:Request){const supabase=getSupabaseAnon();const body=await req.json();if(!supabase)return NextResponse.json({ok:true,preview:true,message:"Supabase not configured. Signup stub accepted.",body});const {data,error}=await supabase.auth.signUp({email:body.email,password:body.password,options:{data:{name:body.name}}});return NextResponse.json({data,error},{status:error?400:200})}
