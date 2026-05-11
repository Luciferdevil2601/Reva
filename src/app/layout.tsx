import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "ATS Resume Optimizer", description: "Get a 95+ ATS score with AI resume optimization and PDF export." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
