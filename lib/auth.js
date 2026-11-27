import crypto from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'cupang_session';

function sessionToken() {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  return crypto.createHmac('sha256', pw).update('cupang-tracker-session-v1').digest('hex');
}

export function isConfigured() {
  return Boolean(process.env.APP_PASSWORD);
}

export function checkPassword(input) {
  const pw = process.env.APP_PASSWORD;
  if (!pw || typeof input !== 'string') return false;
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(pw).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isAuthed() {
  const expected = sessionToken();
  if (!expected) return false;
  const got = (await cookies()).get(COOKIE)?.value;
  if (!got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function setSession() {
  (await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
