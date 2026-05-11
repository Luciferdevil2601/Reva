import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

type ProfileRow={email:string|null;name:string|null;plan:string|null;created_at:string;analyses_used?:number|null};
type SubRow={plan:string|null;status:string|null;period_end:string|null;razorpay_sub_id:string|null};

export async function GET(){
  const user=getSession();
  if(!user?.isOwner) return NextResponse.json({message:"Owner access required"},{status:403});
  const supabase=getSupabaseAdmin();
  if(!supabase){
    return NextResponse.json({preview:true, totals:{members:1, free:0, pro:0, premium:1, owners:1, activeSubscriptions:0, monthlyRevenue:0, analyses:0}, recentUsers:[{email:user.email,name:user.name||"Owner",plan:"owner",created_at:new Date().toISOString()}], subscriptions:[]});
  }
  const [{data:profileData},{data:subData},{count:analysisCount}]=await Promise.all([
    supabase.from("profiles").select("email,name,plan,created_at,analyses_used").order("created_at",{ascending:false}).limit(50),
    supabase.from("subscriptions").select("plan,status,period_end,razorpay_sub_id"),
    supabase.from("analyses").select("id",{count:"exact",head:true})
  ]);
  const rows=(profileData||[]) as ProfileRow[];
  const subs=(subData||[]) as SubRow[];
  const pro=subs.filter(s=>s.plan==="pro"&&s.status==="active").length;
  const premium=subs.filter(s=>s.plan==="premium"&&s.status==="active").length;
  return NextResponse.json({preview:false, totals:{members:rows.length, free:rows.filter(r=>r.plan==="free").length, pro, premium, owners:rows.filter(r=>["paletiganesh456@gmail.com","paletiganesh218@gmail.com"].includes(String(r.email).toLowerCase())).length, activeSubscriptions:pro+premium, monthlyRevenue:(pro*299)+(premium*699), analyses:analysisCount||0}, recentUsers:rows, subscriptions:subs});
}
