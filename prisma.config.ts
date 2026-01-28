import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local')
const result = config({ path: envPath })

console.log('Env path:', envPath)
console.log('Dotenv result:', result.error ? result.error.message : 'loaded')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  seed: {
    command: 'npx tsx prisma/seed.ts',
  },
})
