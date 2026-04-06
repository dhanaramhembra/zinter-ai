import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  libsqlClient: Client | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL

  // If no DATABASE_URL, return a basic client (will fail on queries but won't crash on import)
  if (!dbUrl) {
    console.error('⚠️ DATABASE_URL is not set!')
    return new PrismaClient()
  }

  try {
    // Use libSQL adapter for Turso (libsql://) and local file (file://) databases
    if (dbUrl.startsWith('file:') || dbUrl.startsWith('libsql:') || dbUrl.startsWith('https:')) {
      const libsql = globalForPrisma.libsqlClient ?? createClient({
        url: dbUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
      })

      if (!globalForPrisma.libsqlClient) {
        globalForPrisma.libsqlClient = libsql
      }

      const adapter = new PrismaLibSql(libsql)
      return new PrismaClient({ adapter })
    }
  } catch (error) {
    console.error('Failed to create libSQL client, falling back to default Prisma:', error)
  }

  // Fallback to default Prisma client
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
