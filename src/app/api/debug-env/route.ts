import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) : 'NOT SET',
    DATABASE_URL_LENGTH: process.env.DATABASE_URL?.length || 0,
    DATABASE_AUTH_TOKEN_SET: !!process.env.DATABASE_AUTH_TOKEN,
    DATABASE_AUTH_TOKEN_LENGTH: process.env.DATABASE_AUTH_TOKEN?.length || 0,
    NODE_ENV: process.env.NODE_ENV,
  });
}
