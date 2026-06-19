import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { FlightDeckShell } from "@/components/FlightDeckShell";
import { createClient } from "@/lib/supabase/server";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Flying Ace Exams",
  description: "Private pilot FAA written exam prep — master every topic before test day.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={geist.variable}>
      <body className="font-[family-name:var(--font-geist)] antialiased">
        {user ? (
          <FlightDeckShell userId={user.id} userEmail={user.email ?? ""}>
            {children}
          </FlightDeckShell>
        ) : (
          <>
            <NavBar />
            {children}
          </>
        )}
      </body>
    </html>
  );
}
