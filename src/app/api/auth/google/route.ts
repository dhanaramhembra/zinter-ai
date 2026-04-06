import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const SCOPES = [
  'openid',
  'email',
  'profile',
];

/**
 * GET /api/auth/google
 * Step 1: Redirect user to Google's OAuth consent screen (if real credentials are configured)
 * OR redirect to the mock Google sign-in page (for development/sandbox)
 */
export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Check if REAL Google OAuth credentials are configured (not placeholders)
    const isConfigured = clientId && clientSecret &&
      !clientId.includes('your-google-client-id') &&
      !clientSecret.includes('your-google-client-secret');

    if (isConfigured) {
      // Real Google OAuth flow
      const state = uuidv4();
      const stateCookie = `google_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const redirectUri = `${baseUrl}/api/auth/google/callback`;

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
      const response = NextResponse.redirect(authUrl);
      response.headers.append('Set-Cookie', stateCookie);
      return response;
    } else {
      // Mock Google sign-in flow — redirect to the styled account picker page
      const state = uuidv4();
      const stateCookie = `google_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

      const response = NextResponse.redirect(
        `${baseUrl}/?google_signin=1&state=${state}`
      );
      response.headers.append('Set-Cookie', stateCookie);
      return response;
    }
  } catch (error) {
    console.error('Google OAuth redirect error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    return NextResponse.redirect(
      `${baseUrl}/?google_error=server_error`
    );
  }
}

/**
 * POST /api/auth/google/callback (also handles the mock OAuth callback)
 * Creates or finds user, sets session, returns user data
 */
export async function POST(req: NextRequest) {
  try {
    const { email, name, avatar, provider } = await req.json();

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
      user = await db.user.create({
        data: {
          email: trimmedEmail,
          name: trimmedName || 'Google User',
          password: null,
          provider: provider || 'google',
          avatar: avatar || null,
        },
      });
    } else {
      // Update existing user with Google-specific fields
      user = await db.user.update({
        where: { id: user.id },
        data: {
          provider: provider || 'google',
          avatar: avatar || user.avatar,
        },
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
