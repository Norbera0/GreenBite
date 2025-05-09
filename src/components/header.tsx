
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // useRouter from next/navigation
import { Button } from '@/components/ui/button';
import { Leaf, LogOut, ArrowLeft, PlusSquare } from 'lucide-react'; // Added PlusSquare for potential header action
import { useAppContext } from '@/context/app-context';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showTitle?: boolean; // New prop to control title visibility
  actionIcon?: React.ReactNode; // Optional action icon for the right side
  onActionClick?: () => void; // Optional handler for the action icon
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

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleBack = () => {
    router.back();
  };

  // Determine if back button should be shown
  // Show if manualShowBackButton is true, or if not on root and history is available
  const shouldShowBackButton = manualShowBackButton ?? (pathname !== '/' && typeof window !== 'undefined' && window.history.length > 1);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-1 flex-1"> {/* Left side takes available space */}
          {shouldShowBackButton ? (
            <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back" className="mr-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
             <Link href="/" className="flex items-center gap-2" aria-label="Go to homepage">
               {/* Optionally hide Leaf icon on homepage if title is "Report" or similar */}
               {title !== "Report" && <Leaf className="h-6 w-6 text-primary" />}
             </Link>
          )}
          {showTitle && <h1 className="text-lg font-semibold text-primary truncate">{title}</h1>}
        </div>

        <div className="flex items-center gap-2 ml-auto"> {/* Right side aligned to end */}
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
        </div>
      </div>
    </header>
  );
};

// AutoHeader component to conditionally show back button based on path
// Note: The previous AutoHeader logic was simplified. Direct prop control or usePathname is better.
export default Header;
