import Link from "next/link";
import { SplitEditor } from "@/components/Editor/SplitEditor";
export default function Dashboard(){return <><nav className="nav"><Link className="brand" href="/">Reva ATS</Link><div className="navlinks"><Link href="/dashboard/history">History</Link><Link href="/pricing">Pricing</Link></div></nav><SplitEditor/></>}
