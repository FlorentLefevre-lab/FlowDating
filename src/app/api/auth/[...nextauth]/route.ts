// src/app/api/auth/[...nextauth]/route.ts - Route API pour NextAuth v5

import { handlers } from "@/auth"

// ✅ Pour NextAuth v5, utilisez directement les handlers
export const { GET, POST } = handlers