import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  libsqlClient: Client | undefined
}

let _db: PrismaClient | null = null

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.error('⚠️ DATABASE_URL is not set!')
    return new PrismaClient({ datasources: { db: { url: 'file:./placeholder.db' } } })
  }

  try {
    // For Turso (libsql://) or any non-file URL, use the libSQL adapter
    // The adapter bypasses Prisma's URL validation since it manages its own connection
    if (!dbUrl.startsWith('file:')) {
      const libsql = globalForPrisma.libsqlClient ?? createClient({
        url: dbUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
      })

      if (!globalForPrisma.libsqlClient) {
        globalForPrisma.libsqlClient = libsql
      }

      const adapter = new PrismaLibSql(libsql)
      // Pass a dummy file: URL to bypass Prisma's validation — 
      // the adapter handles the real connection
      return new PrismaClient({
        adapter,
        datasources: { db: { url: 'file:./placeholder.db' } }
      })
    }

    // Local file: database — use default Prisma
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    })
  } catch (error) {
    console.error('Failed to create DB client:', error)
    return new PrismaClient({ datasources: { db: { url: 'file:./placeholder.db' } } })
  }
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_db) {
      _db = globalForPrisma.prisma ?? createPrismaClient()
      if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
    }
    return (_db as any)[prop]
  }
})
