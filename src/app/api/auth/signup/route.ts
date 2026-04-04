import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
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

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        password: hashedPassword,
      },
    });

    const sessionId = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      message: 'Account created successfully',
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
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
