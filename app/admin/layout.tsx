import * as React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminLayoutClient } from "./AdminLayoutClient";

export const metadata = {
  title: "Admin - Flow Dating",
  description: "Panneau d'administration Flow Dating",
};

async function getAdminData(userId: string) {
  const [user, pendingCounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    }),
    prisma.$transaction([
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.photo.count({ where: { moderationStatus: "PENDING" } }),
    ]),
  ]);

  return {
    user,
    pendingReports: pendingCounts[0],
    pendingPhotos: pendingCounts[1],
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  const { user, pendingReports, pendingPhotos } = await getAdminData(session.user.id);

  // Check if user is admin or moderator
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    redirect("/discover?error=unauthorized");
  }

  return (
    <AdminLayoutClient
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      }}
      pendingReports={pendingReports}
      pendingPhotos={pendingPhotos}
    >
      {children}
    </AdminLayoutClient>
  );
}
