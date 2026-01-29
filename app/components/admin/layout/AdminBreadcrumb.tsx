"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const pathLabels: Record<string, string> = {
  admin: "Admin",
  users: "Utilisateurs",
  photos: "Photos",
  reports: "Signalements",
  activity: "Activite",
  logs: "Logs",
  settings: "Parametres",
};

export function AdminBreadcrumb() {
  const pathname = usePathname();

  const breadcrumbs = React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [];

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip numeric IDs in breadcrumb labels but keep the path
      const isId = /^[a-z0-9]{20,}$/i.test(segment) || /^\d+$/.test(segment);

      if (isId) {
        items.push({
          label: "Details",
          href: index === segments.length - 1 ? undefined : currentPath,
        });
      } else {
        items.push({
          label: pathLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
          href: index === segments.length - 1 ? undefined : currentPath,
        });
      }
    });

    return items;
  }, [pathname]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
        <li>
          <Link
            href="/admin"
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Accueil</span>
          </Link>
        </li>
        {breadcrumbs.slice(1).map((item, index) => (
          <React.Fragment key={index}>
            <li>
              <ChevronRight className="h-4 w-4" />
            </li>
            <li>
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{item.label}</span>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}
