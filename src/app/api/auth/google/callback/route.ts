import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  locale?: string;
}

/**
 * GET /api/auth/google/callback
 * Step 2: Google redirects user here after they pick their account
 * - Verify CSRF state
 * - Exchange authorization code for tokens
 * - Fetch user profile from Google
 * - Find or create user in database
 * - Set session cookie
 * - Redirect to app
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const returnedState = searchParams.get('state');
    const error = searchParams.get('error');

    // Check if Google returned an error (user denied access, etc.)
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `/?google_error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !returnedState) {
      console.error('Missing code or state in callback');
      return NextResponse.redirect('/?google_error=missing_params');
    }

    // Verify CSRF state
    const cookieStore = await cookies();
    const stateCookie = cookieStore.get('google_oauth_state');

    if (!stateCookie || stateCookie.value !== returnedState) {
      console.error('CSRF state mismatch');
      return NextResponse.redirect('/?google_error=invalid_state');
    }

    // Clear state cookie
    const clearStateResponse = NextResponse.next();
    clearStateResponse.cookies.set('google_oauth_state', '', {
      path: '/',
      maxAge: 0,
    });

    // Exchange authorization code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Google OAuth credentials not configured');
      return NextResponse.redirect('/?google_error=no_credentials');
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/auth/google/callback`;

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Token exchange failed:', tokenError);
      return NextResponse.redirect('/?google_error=token_exchange_failed');
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Fetch user info from Google using access token
    const userInfoResponse = await fetch(
      `${GOOGLE_USERINFO_URL}?access_token=${tokens.access_token}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info from Google');
      return NextResponse.redirect('/?google_error=userinfo_failed');
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    if (!googleUser.email || !googleUser.name) {
      console.error('Invalid Google user data');
      return NextResponse.redirect('/?google_error=invalid_user_data');
    }

    // Find or create user in database
    const useremail = googleUser.email.toLowerCase();
    let user = await db.user.findUnique({ where: { email: useremail } });

    if (!user) {
      // New user — create account from Google data
      user = await db.user.create({
        data: {
          email: useremail,
          name: googleUser.name.slice(0, 50),
          provider: 'google',
          providerId: googleUser.id,
          avatar: googleUser.picture || null,
        },
      });
    } else {
      // Existing user — update Google-specific fields
      user = await db.user.update({
        where: { id: user.id },
        data: {
          provider: 'google',
          providerId: googleUser.id,
          avatar: googleUser.picture || user.avatar,
          name: googleUser.name.slice(0, 50),
        },
      });
    }

    // Create session
    const sessionId = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    // Redirect to app with session cookie
    const response = NextResponse.redirect('/');
    response.cookies.set('google_oauth_state', '', {
      path: '/',
      maxAge: 0,
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
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect('/?google_error=server_error');
  }
}
