import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  libsqlClient: Client | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

  try {
    // If the URL starts with "file:" or "libsql:", use the libSQL adapter
    // This works for both local SQLite files and Turso cloud databases
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

  // Fallback to default Prisma client (for any other database URL)
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
