import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { clean, createFish, listFish } from '@/lib/db';

export const dynamic = 'force-dynamic';

const unauthorized = () => NextResponse.json({ error: 'Belum login.' }, { status: 401 });
const fail = (e) => NextResponse.json({ error: e.message || 'Terjadi kesalahan server.' }, { status: 500 });

export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  try {
    return NextResponse.json({ rows: await listFish() });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  const body = await req.json().catch(() => ({}));
  if (!clean(body).nama) {
    return NextResponse.json({ error: 'Nama / kode cupang wajib diisi.' }, { status: 400 });
  }
  try {
    return NextResponse.json({ row: await createFish(body) }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
