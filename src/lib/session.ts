import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
}

const SESSION_COOKIE = 'chat_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Use globalThis so the session store survives Turbopack HMR
// Without this, every hot-reload resets the Map and logs everyone out
const _global = globalThis as unknown as Record<string, Map<string, SessionData>>;
if (!_global.__chat_sessions) {
  _global.__chat_sessions = new Map<string, SessionData>();
}
const sessions = _global.__chat_sessions;

export async function createSession(user: { id: string; email: string; name: string }): Promise<string> {
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  // Auto cleanup sessions older than 7 days
  return sessionId;
}

export async function getSessionFromCookie(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);

  if (!sessionCookie?.value) {
    return null;
  }

  const session = sessions.get(sessionCookie.value);
  return session || null;
}

export function getSession(sessionId: string): SessionData | null {
  return sessions.get(sessionId) || null;
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
