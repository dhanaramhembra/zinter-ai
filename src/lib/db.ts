import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let _db: PrismaClient | null = null

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN || undefined

  if (!dbUrl) {
    console.error('⚠️ DATABASE_URL is not set!')
    return new PrismaClient()
  }

  try {
    if (!dbUrl.startsWith('file:')) {
      // Turso / cloud database — use libSQL adapter with factory config
      const adapter = new PrismaLibSql({
        url: dbUrl,
        authToken,
      })
      // Do NOT pass datasources when using adapter!
      return new PrismaClient({ adapter })
    }

    // Local file: database — use default Prisma
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    })
  } catch (error) {
    console.error('Failed to create DB client:', error)
    return new PrismaClient()
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
