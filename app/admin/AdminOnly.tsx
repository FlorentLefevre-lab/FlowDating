import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Vérifie que l'utilisateur est ADMIN (pas MODERATOR)
 * Redirige vers /admin si ce n'est pas le cas
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== "ADMIN") {
    redirect("/admin?error=admin_only");
  }

  return user;
}
