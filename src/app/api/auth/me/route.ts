import { NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, avatar: true },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
