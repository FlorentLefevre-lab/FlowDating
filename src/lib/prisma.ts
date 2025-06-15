import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configuration des logs selon l'environnement et l'instance
const logConfig = process.env.NODE_ENV === 'development' 
  ? ['query', 'error', 'warn'] as const
  : ['error'] as const

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logConfig,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Log l'instance pour debug en développement
if (process.env.NODE_ENV === 'development' && process.env.INSTANCE_ID) {
  console.log(`[${process.env.INSTANCE_ID}] Prisma client initialized`)
}