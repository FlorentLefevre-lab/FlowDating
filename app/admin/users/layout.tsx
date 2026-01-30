import { requireAdmin } from "../AdminOnly";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifie que l'utilisateur est ADMIN, redirige sinon
  await requireAdmin();

  return <>{children}</>;
}
