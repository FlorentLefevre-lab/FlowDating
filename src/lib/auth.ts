// Re-export everything from the root auth.ts for backward compatibility
export { auth, signIn, signOut } from '@/auth'

// Legacy alias for backward compatibility
export { auth as getAuth } from '@/auth'
