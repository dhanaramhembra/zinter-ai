import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  libsqlClient: Client | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || ''

  // In production, we MUST have a DATABASE_URL
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is not set!')
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
    console.error('Failed to create libSQL client:', error)
  }

  // Fallback to default Prisma client
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
