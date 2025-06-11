// hooks/useAuth.ts - Version ultra-simplifiée
import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  // 🎯 PLUS BESOIN DE LOGIQUE DE REDIRECTION !
  // Le middleware s'en charge déjà

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    user: session?.user,
    // 🎯 Fonctions utilitaires simples
    isReady: status !== "loading"
  };
}

