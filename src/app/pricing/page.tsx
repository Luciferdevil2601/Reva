import Link from "next/link";
import { PricingCards } from "@/components/ui/PricingCards";
export default function Pricing(){return <><nav className="nav"><Link className="brand" href="/">Reva ATS</Link><Link className="btn" href="/dashboard">Start</Link></nav><section className="section"><h1>Simple Pricing</h1><p>Payments are disabled for preview. Owner accounts have unlimited access.</p><PricingCards/></section></>}
