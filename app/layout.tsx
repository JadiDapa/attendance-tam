import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Providers from "@/providers/Providers";
import { Toaster } from "sonner";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Absensi | Taruna Anugerah Mandiri",
  description:
    "Absensi Taruna Anugerah Mandiri adalah sistem absensi yang dirancang untuk memudahkan proses pencatatan kehadiran taruna. Dengan fitur-fitur canggih dan antarmuka yang intuitif, sistem ini memungkinkan pengelolaan absensi yang efisien dan akurat, membantu organisasi dalam memantau kehadiran taruna secara real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={cn(montserrat.variable)} suppressHydrationWarning lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>

      <body>
        <Providers>
          <Toaster richColors position="top-right" />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
