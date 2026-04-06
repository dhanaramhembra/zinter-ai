import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

/**
 * POST /api/auth/google
 * Google OAuth sign-in / sign-up
 * Body: { email, name, avatar? }
 *
 * - If user with this email already exists → logs them in
 * - If new user → creates account with provider="google" and logs in
 */
export async function POST(req: NextRequest) {
  try {
    const { email, name, avatar } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim().slice(0, 50);

    // Find or create user
    let user = await db.user.findUnique({ where: { email: trimmedEmail } });

    if (!user) {
      // New user — create account via Google
      user = await db.user.create({
        data: {
          email: trimmedEmail,
          name: trimmedName || 'Google User',
          provider: 'google',
          avatar: avatar || null,
        },
      });
    } else if (user.provider !== 'google') {
      // Existing email/password user — upgrade to Google provider
      user = await db.user.update({
        where: { id: user.id },
        data: {
          provider: 'google',
          avatar: avatar || user.avatar,
        },
      });
    } else {
      // Existing Google user — update avatar if provided
      if (avatar) {
        user = await db.user.update({
          where: { id: user.id },
          data: { avatar },
        });
      }
    }

    // Create session
    const sessionId = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      isNewUser: !!(await req.json().catch(() => null)) === null,
      message: 'Google sign-in successful',
    });

    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
