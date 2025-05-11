
import type {Metadata} from 'next';
import { Open_Sans } from 'next/font/google'; // Changed from Geist to Open_Sans
import './globals.css';
import { AppProvider } from '@/context/app-context';
import { Toaster } from "@/components/ui/toaster";
import BottomNav from '@/components/bottom-nav';

// Instantiate Open_Sans
const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans', // Define CSS variable for Open Sans
  display: 'swap', // Ensure text is visible while font loads
  weight: ['400', '600', '700'], // Include common weights
});

export const metadata: Metadata = {
  title: 'GreenBite - Eat Green!', // Updated title for a more engaging feel
  description: 'Log your meals, track their carbon footprint, and get tips to eat more sustainably with GreenBite.', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      {/* Apply Open Sans variable and font-sans utility class */}
      <body className={`${openSans.variable} font-sans antialiased bg-background`} suppressHydrationWarning={true}>
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
