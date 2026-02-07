'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Mail, FileText, Users, BarChart3, Send } from 'lucide-react';

const navItems = [
  { href: '/admin/email-marketing', label: 'Dashboard', icon: BarChart3, exact: true },
  { href: '/admin/email-marketing/campaigns', label: 'Campagnes', icon: Send },
  { href: '/admin/email-marketing/templates', label: 'Templates', icon: FileText },
  { href: '/admin/email-marketing/segments', label: 'Segments', icon: Users },
];

export default function EmailMarketingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Email Marketing</h1>
          <p className="text-sm text-muted-foreground">Gérez vos campagnes, templates et segments</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <nav className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
}
