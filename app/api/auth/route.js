import { NextResponse } from 'next/server';
import { checkPassword, clearSession, isAuthed, isConfigured, setSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ configured: isConfigured(), authed: await isAuthed() });
}

export async function POST(req) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'APP_PASSWORD belum diatur di environment variable.' },
      { status: 500 },
    );
  }
  const body = await req.json().catch(() => ({}));
  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: 'Password salah.' }, { status: 401 });
  }
  await setSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
