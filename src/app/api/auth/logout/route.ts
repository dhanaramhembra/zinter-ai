import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // JWT is stateless — just clear the cookie
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
