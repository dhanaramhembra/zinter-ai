import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

let _db: PrismaClient | null = null

function createDb(): PrismaClient {
  const url = process.env.DATABASE_URL
  const token = process.env.DATABASE_AUTH_TOKEN

  if (url && url.startsWith('libsql://')) {
    const libsql = createClient({ url, authToken: token })
    const adapter = new PrismaLibSql(libsql)
    return new PrismaClient({ adapter })
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  })
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_db) { _db = createDb() }
    const value = Reflect.get(_db, prop) as unknown
    if (typeof value === 'function') return value.bind(_db)
    return value
  },
})
