
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CookingPot, BarChart3, Lightbulb } from 'lucide-react'; // Removed FilePlus2 (Challenges icon)
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/log-meal', label: 'Log Meal', icon: CookingPot },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/recommendations', label: 'Tips', icon: Lightbulb },
  // { href: '/challenges', label: 'Challenges', icon: FilePlus2 }, // Removed challenges item
];

const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border shadow-md md:hidden z-50">
      <div className="flex justify-around items-center h-full max-w-lg mx-auto"> {/* Adjusted max-width for 4 items */}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} legacyBehavior>
              <a
                className={cn(
                  "flex flex-col items-center justify-center text-xs w-1/4 h-full", // Adjusted width for 4 items
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
