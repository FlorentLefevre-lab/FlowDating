// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"  // 🔥 UTILISER VOTRE CONFIG COMPLÈTE

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }