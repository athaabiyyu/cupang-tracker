import { neon } from '@neondatabase/serverless';
import fs from 'node:fs/promises';
import path from 'node:path';

// Vercel + Neon mengisi DATABASE_URL otomatis saat database dihubungkan.
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const IS_PROD = process.env.NODE_ENV === 'production';

// Tanpa DATABASE_URL, saat development data disimpan ke file lokal data/cupang.json.
// Di production (Vercel) fallback ini TIDAK dipakai karena filesystem Vercel tidak permanen.
const USE_FILE = !DB_URL && !IS_PROD;
const FILE = path.join(process.cwd(), 'data', 'cupang.json');

const COLS = `id, nama, jenis, warna, gender, ukuran,
  tgl_beli::text AS tgl_beli, harga_beli::float8 AS harga_beli, supplier, status,
  tgl_jual::text AS tgl_jual, harga_jual::float8 AS harga_jual, pembeli, catatan`;

/** Membersihkan dan memvalidasi input dari client. */
export function clean(b = {}) {
  const s = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= 0 ? Math.round(x) : 0;
  };
  const d = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const status = b.status === 'terjual' ? 'terjual' : 'stok';
  const sold = status === 'terjual';
  return {
    nama: s(b.nama, 100),
    jenis: s(b.jenis, 60),
    warna: s(b.warna, 60),
    gender: ['jantan', 'betina'].includes(b.gender) ? b.gender : '',
    ukuran: s(b.ukuran, 30),
    tgl_beli: d(b.tgl_beli),
    harga_beli: n(b.harga_beli),
    supplier: s(b.supplier, 100),
    status,
    tgl_jual: sold ? d(b.tgl_jual) : null,
    harga_jual: sold ? n(b.harga_jual) : null,
    pembeli: sold ? s(b.pembeli, 100) : '',
    catatan: s(b.catatan, 500),
  };
}

const FIELDS = [
  'nama', 'jenis', 'warna', 'gender', 'ukuran', 'tgl_beli', 'harga_beli',
  'supplier', 'status', 'tgl_jual', 'harga_jual', 'pembeli', 'catatan',
];

/* ---------- Postgres (Neon) ---------- */

let sqlClient;
let ready;

function sql() {
  if (!sqlClient) sqlClient = neon(DB_URL);
  return sqlClient;
}

async function init() {
  if (!ready) {
    ready = sql()
      .query(`CREATE TABLE IF NOT EXISTS cupang (
        id SERIAL PRIMARY KEY,
        nama TEXT NOT NULL,
        jenis TEXT NOT NULL DEFAULT '',
        warna TEXT NOT NULL DEFAULT '',
        gender TEXT NOT NULL DEFAULT '',
        ukuran TEXT NOT NULL DEFAULT '',
        tgl_beli DATE,
        harga_beli BIGINT NOT NULL DEFAULT 0,
        supplier TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'stok',
        tgl_jual DATE,
        harga_jual BIGINT,
        pembeli TEXT NOT NULL DEFAULT '',
        catatan TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`)
      .catch((e) => {
        ready = undefined;
        throw e;
      });
  }
  return ready;
}

/* ---------- File lokal (khusus development) ---------- */

async function readFile() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return { nextId: 1, rows: [] };
  }
}

async function writeFile(data) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2));
}

/* ---------- API yang dipakai route ---------- */

export async function listFish() {
  if (USE_FILE) return (await readFile()).rows;
  if (!DB_URL) throw new Error('DATABASE_URL belum diatur. Hubungkan database Neon di Vercel.');
  await init();
  return sql().query(`SELECT ${COLS} FROM cupang ORDER BY id DESC`);
}

export async function createFish(input) {
  const v = clean(input);
  if (USE_FILE) {
    const data = await readFile();
    const row = { id: data.nextId++, ...v };
    data.rows.unshift(row);
    await writeFile(data);
    return row;
  }
  if (!DB_URL) throw new Error('DATABASE_URL belum diatur. Hubungkan database Neon di Vercel.');
  await init();
  const rows = await sql().query(
    `INSERT INTO cupang (${FIELDS.join(', ')})
     VALUES (${FIELDS.map((_, i) => `$${i + 1}`).join(', ')})
     RETURNING ${COLS}`,
    FIELDS.map((f) => v[f]),
  );
  return rows[0];
}

export async function updateFish(id, input) {
  const v = clean(input);
  if (USE_FILE) {
    const data = await readFile();
    const i = data.rows.findIndex((r) => r.id === id);
    if (i < 0) return null;
    data.rows[i] = { id, ...v };
    await writeFile(data);
    return data.rows[i];
  }
  if (!DB_URL) throw new Error('DATABASE_URL belum diatur. Hubungkan database Neon di Vercel.');
  await init();
  const rows = await sql().query(
    `UPDATE cupang SET ${FIELDS.map((f, i) => `${f} = $${i + 1}`).join(', ')}
     WHERE id = $${FIELDS.length + 1}
     RETURNING ${COLS}`,
    [...FIELDS.map((f) => v[f]), id],
  );
  return rows[0] || null;
}

export async function deleteFish(id) {
  if (USE_FILE) {
    const data = await readFile();
    const before = data.rows.length;
    data.rows = data.rows.filter((r) => r.id !== id);
    await writeFile(data);
    return data.rows.length < before;
  }
  if (!DB_URL) throw new Error('DATABASE_URL belum diatur. Hubungkan database Neon di Vercel.');
  await init();
  const rows = await sql().query('DELETE FROM cupang WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}
