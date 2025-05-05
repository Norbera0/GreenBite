"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Leaf, LogOut, ArrowLeft } from 'lucide-react';
import { useAppContext } from '@/context/app-context';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title = "EcoPlate", showBackButton = false }) => {
  const { user, logout } = useAppContext();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          {showBackButton ? (
            <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
             <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
               <Leaf className="h-6 w-6 text-primary" />
             </Link>
          )}
           <h1 className="text-lg font-semibold text-primary">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <>
              {/* <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.name}
              </span> */}
              <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Log out">
                <LogOut className="h-4 w-4" />
                 <span className="ml-1 hidden sm:inline">Logout</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

// Automatically show back button if not on the home page
const AutoHeader: React.FC<Omit<HeaderProps, 'showBackButton'>> = (props) => {
  const router = useRouter();
  // Cannot use usePathname here as it triggers dynamic rendering, affecting build
  // Simple check based on title prop or lack thereof
   const isHomePage = !props.title || props.title === "EcoPlate"; // Approximation

  return <Header {...props} showBackButton={!isHomePage && typeof window !== 'undefined' && window.history.length > 1} />;
};


export default AutoHeader; // Export the auto-detecting version
