// /app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"

// Export des handlers pour NextAuth v5
export const { GET, POST } = handlers