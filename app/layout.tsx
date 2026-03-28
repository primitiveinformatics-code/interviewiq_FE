import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
// Remove this line
// import BugBountyBanner from "@/components/BugBountyBanner"; 

export const metadata: Metadata = {
  title: "InterviewIQ",
  description: "AI-powered technical interview preparation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">
            {/* Remove this line to hide the banner */}
            {/* <BugBountyBanner /> */} 
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}