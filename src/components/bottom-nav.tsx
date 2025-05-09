
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusSquare, BarChart3, UserCircle, CookingPot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/log-meal', label: 'Log Meal', icon: CookingPot }, // Changed icon to CookingPot
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  // { href: '/profile', label: 'Profile', icon: UserCircle }, // Placeholder for profile
];

const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border shadow-md md:hidden z-50">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} legacyBehavior>
              <a
                className={cn(
                  "flex flex-col items-center justify-center text-xs w-1/3 h-full",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
                )}
              >
                <item.icon className={cn("h-6 w-6 mb-0.5", isActive ? "stroke-[2.5px]" : "")} />
                {item.label}
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
