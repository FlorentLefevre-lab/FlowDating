"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ImageIcon,
  Flag,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Utilisateurs",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Photos",
    href: "/admin/photos",
    icon: ImageIcon,
  },
  {
    title: "Signalements",
    href: "/admin/reports",
    icon: Flag,
  },
  {
    title: "Activite",
    href: "/admin/activity",
    icon: Activity,
  },
  {
    title: "Logs",
    href: "/admin/logs",
    icon: FileText,
  },
  {
    title: "Parametres",
    href: "/admin/settings",
    icon: Settings,
  },
];

interface AdminSidebarProps {
  pendingReports?: number;
  pendingPhotos?: number;
}

export function AdminSidebar({ pendingReports = 0, pendingPhotos = 0 }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  const itemsWithBadges = navItems.map((item) => {
    if (item.href === "/admin/reports" && pendingReports > 0) {
      return { ...item, badge: pendingReports };
    }
    if (item.href === "/admin/photos" && pendingPhotos > 0) {
      return { ...item, badge: pendingPhotos };
    }
    return item;
  });

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        <Link href="/admin" className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary-500" />
          {!collapsed && (
            <span className="font-semibold text-lg">Admin</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {itemsWithBadges.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-100 text-primary-700"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.title : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && item.badge && item.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Reduire</span>
            </>
          )}
        </Button>
      </div>

      {/* Back to App */}
      <div className="border-t p-2">
        <Link
          href="/discover"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
            collapsed && "justify-center"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          {!collapsed && <span>Retour a l'app</span>}
        </Link>
      </div>
    </aside>
  );
}
