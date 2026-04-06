import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
}

const SESSION_COOKIE = 'chat_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'fallback-dev-secret-change-in-production-zinter-ai-2024';
  return new TextEncoder().encode(secret);
}

export async function createSession(user: { id: string; email: string; name: string }): Promise<string> {
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());

  return token;
}

export async function getSessionFromCookie(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE);

    if (!sessionCookie?.value) {
      return null;
    }

    const { payload } = await jwtVerify(sessionCookie.value, getSecret());

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    // Token expired, invalid, or missing
    return null;
  }
}

export function getSession(sessionId: string): SessionData | null {
  // JWT is stateless — we verify synchronously if needed
  // This is a legacy compatibility method; prefer getSessionFromCookie()
  try {
    // We can't verify synchronously with jose in this context,
    // so this method returns null (prefer getSessionFromCookie)
    return null;
  } catch {
    return null;
  }
}

export function deleteSession(_sessionId: string): void {
  // JWT is stateless — nothing to delete server-side
  // The cookie is cleared by the caller (logout route)
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
