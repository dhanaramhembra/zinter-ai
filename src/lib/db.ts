import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  libsqlClient: Client | undefined
}

// Lazy initialization — client is only created on FIRST database query
// This prevents build-time crashes when DATABASE_URL is not set
let _db: PrismaClient | null = null

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.error('⚠️ DATABASE_URL is not set! Database operations will fail.')
    // Return a dummy client that won't crash on import, only on actual queries
    return new PrismaClient({ datasources: { db: { url: 'file:./placeholder.db' } } })
  }

  try {
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

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

// Lazy getter — only creates client when first accessed
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_db) {
      _db = globalForPrisma.prisma ?? createPrismaClient()
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
    }
    return (_db as any)[prop]
  }
})
