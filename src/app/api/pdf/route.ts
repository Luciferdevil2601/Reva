import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { resumeToHtml } from "@/lib/pdf";
export const runtime="nodejs";
export async function POST(req:Request){
  const {resume_data,template}=await req.json();
  const html=resumeToHtml(resume_data||{},template||"modern");
  try{
    const executablePath=await chromium.executablePath();
    const browser=await puppeteer.launch({args:[...chromium.args,"--no-sandbox","--disable-setuid-sandbox"],executablePath,headless:true});
    const page=await browser.newPage();
    await page.setContent(html,{waitUntil:"domcontentloaded"});
    const pdf=await page.pdf({format:"A4",printBackground:true});
    await browser.close();
    return new NextResponse(Buffer.from(pdf),{headers:{"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=optimized-resume.pdf"}});
  }catch{
    return new NextResponse(html,{headers:{"Content-Type":"text/html"}});
  }
}
