
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/app-context';
import { Toaster } from "@/components/ui/toaster";
import BottomNav from '@/components/bottom-nav'; // Import BottomNav

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EcoPlate Reports', // Changed title to reflect the new design focus
  description: 'Log your meals and track their carbon footprint with EcoPlate.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`} suppressHydrationWarning={true}>
        <AppProvider>
          <div className="flex flex-col min-h-screen">
            <main className="flex-grow pb-20"> {/* Add padding-bottom for BottomNav */}
              {children}
            </main>
            <BottomNav /> {/* Add BottomNav here */}
          </div>
          <Toaster />
        </AppProvider>
      </body>
    </html>
  );
}
