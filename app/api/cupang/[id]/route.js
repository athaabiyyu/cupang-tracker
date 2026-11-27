import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { clean, deleteFish, updateFish } from '@/lib/db';

export const dynamic = 'force-dynamic';

const unauthorized = () => NextResponse.json({ error: 'Belum login.' }, { status: 401 });
const fail = (e) => NextResponse.json({ error: e.message || 'Terjadi kesalahan server.' }, { status: 500 });
const notFound = () => NextResponse.json({ error: 'Data tidak ditemukan.' }, { status: 404 });

async function getId(params) {
  const id = Number((await params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(req, { params }) {
  if (!(await isAuthed())) return unauthorized();
  const id = await getId(params);
  if (!id) return notFound();
  const body = await req.json().catch(() => ({}));
  if (!clean(body).nama) {
    return NextResponse.json({ error: 'Nama / kode cupang wajib diisi.' }, { status: 400 });
  }
  try {
    const row = await updateFish(id, body);
    return row ? NextResponse.json({ row }) : notFound();
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req, { params }) {
  if (!(await isAuthed())) return unauthorized();
  const id = await getId(params);
  if (!id) return notFound();
  try {
    return (await deleteFish(id)) ? NextResponse.json({ ok: true }) : notFound();
  } catch (e) {
    return fail(e);
  }
}
