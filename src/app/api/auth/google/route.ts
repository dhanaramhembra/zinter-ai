import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'openid',
  'email',
  'profile',
];

/**
 * GET /api/auth/google
 * Step 1: Redirect user to Google's OAuth consent screen
 * Shows all Google accounts on device, user picks one, Google redirects back
 */
export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      // No Google credentials configured — redirect to auth page with error
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      return NextResponse.redirect(
        `${baseUrl}/?google_error=no_credentials`
      );
    }

    // Generate CSRF state token
    const state = uuidv4();
    const stateCookie = `google_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;

    // Determine redirect URI (where Google sends user back after login)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    // Build Google OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      state: state,
      access_type: 'offline',
      prompt: 'select_account', // Always show account picker
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    // Redirect to Google + set state cookie for CSRF protection
    const response = NextResponse.redirect(authUrl);
    response.headers.append('Set-Cookie', stateCookie);

    return response;
  } catch (error) {
    console.error('Google OAuth redirect error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    return NextResponse.redirect(
      `${baseUrl}/?google_error=server_error`
    );
  }
}

/**
 * POST /api/auth/google (fallback)
 * Manual Google sign-in — creates account from email + name
 * Used as fallback when real OAuth is not configured
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

    // Dynamic import to avoid issues if db changes
    const { db } = await import('@/lib/db');
    const { createSession, SESSION_COOKIE, SESSION_MAX_AGE } = await import('@/lib/session');

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim().slice(0, 50);

    // Find or create user
    let user = await db.user.findUnique({ where: { email: trimmedEmail } });

    if (!user) {
      user = await db.user.create({
        data: {
          email: trimmedEmail,
          name: trimmedName || 'Google User',
          provider: 'google',
          avatar: avatar || null,
        },
      });
    } else if (user.provider !== 'google') {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          provider: 'google',
          avatar: avatar || user.avatar,
        },
      });
    } else if (avatar) {
      user = await db.user.update({
        where: { id: user.id },
        data: { avatar },
      });
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
