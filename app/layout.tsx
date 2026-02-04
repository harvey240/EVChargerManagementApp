import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ClientUserProvider } from "./providers/UserProvider";
import { getCurrentUser } from "./lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EV Charger Management",
  description: "Manage your workplace EV chargers",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <html lang='en' suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            <div className="min-h-screen bg-background flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4 text-foreground">
                  Authentication Required
                </h1>
                <p className="text-stone-700 dark:text-stone-400">
                  Please log in to access this application.
                </p>
              </div>
            </div>
            <Toaster position="bottom-right" richColors expand={false} closeButton />
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
        <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ClientUserProvider user={user}>
            {children}
            <Toaster position="bottom-right" richColors expand={false} closeButton />
          </ClientUserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
