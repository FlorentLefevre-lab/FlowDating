"use client";

import * as React from "react";
import { AdminSidebar, AdminHeader, AdminBreadcrumb } from "@/components/admin/layout";
import { cn } from "@/lib/utils";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  pendingReports?: number;
  pendingPhotos?: number;
}

export function AdminLayoutClient({
  children,
  user,
  pendingReports = 0,
  pendingPhotos = 0,
}: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:relative md:z-0",
          "transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <AdminSidebar
          pendingReports={pendingReports}
          pendingPhotos={pendingPhotos}
          userRole={user?.role}
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <AdminHeader
          user={user}
          notificationCount={pendingReports}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6">
          <AdminBreadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
}
