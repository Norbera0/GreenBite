
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Leaf, LogOut, ArrowLeft } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showTitle?: boolean;
  actionIcon?: React.ReactNode;
  onActionClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title = "EcoPlate", 
  showBackButton: manualShowBackButton, 
  showTitle = true,
  actionIcon,
  onActionClick
}) => {
  const { user, logout } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // This effect runs only on the client after hydration
    if (typeof window !== 'undefined') {
      setCanGoBack(window.history.length > 1 && pathname !== '/');
    }
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleBack = () => {
    router.back();
  };

  const shouldShowBackButton = manualShowBackButton ?? canGoBack;
  const isHomeTitle = title === "Home";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Left Section (Back button or Spacer for centered title) */}
        <div className="flex items-center gap-1" style={{ minWidth: user ? '60px' : '40px' }}> {/* Reserve space for potential back button or logo */}
          {shouldShowBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {!shouldShowBackButton && !isHomeTitle && ( // Show Leaf logo if not back button and not "Home" title (which will be centered)
             <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
               <Leaf className="h-6 w-6 text-primary" />
             </Link>
          )}
        </div>

        {/* Middle Section (Title) */}
        <div className={cn(
            "flex-1 text-primary", 
            isHomeTitle ? "text-center" : (shouldShowBackButton ? "text-left" : "text-left ml-2")
        )}>
          {showTitle && <h1 className="text-lg font-semibold truncate">{title}</h1>}
        </div>
        
        {/* Right Section (Actions, Logout) */}
        <div className="flex items-center gap-2" style={{ minWidth: user ? '60px' : '40px', justifyContent: 'flex-end' }}> {/* Reserve space, align content to right */}
          {actionIcon && onActionClick && (
            <Button variant="ghost" size="icon" onClick={onActionClick} aria-label="Header action">
              {actionIcon}
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
           {!user && !actionIcon && <div style={{width: '40px'}}></div>} {/* Placeholder if no user and no action icon, to balance centering */}
        </div>
      </div>
    </header>
  );
};

export default Header;

