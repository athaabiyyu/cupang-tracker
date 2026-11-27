'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/* ---------- helpers ---------- */

const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const todayStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const fmtDate = (s) =>
  s
    ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

const profitOf = (f) => (f.status === 'terjual' ? (f.harga_jual || 0) - (f.harga_beli || 0) : null);

const DEFAULT_JENIS = [
  'Plakat', 'Halfmoon', 'Giant', 'Crowntail', 'Double Tail', 'Fancy',
  'Serit', 'Avatar', 'Koi', 'Nemo', 'Galaxy', 'Candy', 'Armageddon',
];

const emptyForm = () => ({
  nama: '', jenis: '', warna: '', gender: '', ukuran: '',
  tgl_beli: todayStr(), harga_beli: '', supplier: '',
  status: 'stok', tgl_jual: '', harga_jual: '', pembeli: '', catatan: '',
});

const emptyFilter = () => ({
  q: '', status: '', jenis: '', gender: '', dateBy: 'tgl_beli', from: '', to: '', sort: 'terbaru',
});

async function api(url, opts) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Terjadi kesalahan.');
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------- komponen kecil ---------- */

function Money({ value, onChange, ...rest }) {
  return (
    <input
      inputMode="numeric"
      placeholder="0"
      value={value === '' || value == null ? '' : Number(value).toLocaleString('id-ID')}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      {...rest}
    />
  );
}

function Login({ onDone, configured }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api('/api/auth', { method: 'POST', body: JSON.stringify({ password: pw }) });
      onDone();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">🐟</div>
        <h1>Catatan Cupang</h1>
        <p className="muted">Masukkan password untuk membuka catatan bisnismu.</p>
        {!configured && (
          <div className="alert">APP_PASSWORD belum diatur. Isi dulu di .env.local atau di Vercel.</div>
        )}
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        {err && <div className="alert">{err}</div>}
        <button className="btn primary" disabled={busy || !pw}>
          {busy ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}

function FishModal({ initial, jenisOptions, onClose, onSave }) {
  const hasDetail = Boolean(
    initial.id &&
      (initial.jenis || initial.warna || initial.gender || initial.ukuran || initial.supplier || initial.pembeli || initial.catatan),
  );
  const [f, setF] = useState(initial);
  const [more, setMore] = useState(hasDetail);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  // Status otomatis: kalau harga jual diisi berarti sudah terjual.
  const sold = f.harga_jual !== '' && f.harga_jual != null;
  const profit = sold ? Number(f.harga_jual) - Number(f.harga_beli || 0) : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!f.nama.trim()) return setErr('Nama cupang wajib diisi.');
    const { focusSell, ...rest } = f;
    const payload = {
      ...rest,
      status: sold ? 'terjual' : 'stok',
      tgl_jual: sold ? f.tgl_jual || todayStr() : '',
      tgl_beli: f.tgl_beli || todayStr(),
    };
    setBusy(true);
    setErr('');
    try {
      await onSave(payload);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <h2>{initial.id ? 'Edit Cupang' : 'Tambah Cupang'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Tutup">✕</button>
        </div>

        <div className="modal-body">
          <label className="full">
            Nama cupang *
            <input
              value={f.nama}
              onChange={set('nama')}
              placeholder="mis. HM-001 atau Si Biru"
              autoFocus={!initial.focusSell}
            />
          </label>
          <label>
            Harga beli (Rp)
            <Money value={f.harga_beli} onChange={(v) => setF((p) => ({ ...p, harga_beli: v }))} />
          </label>
          <label>
            Harga jual (Rp)
            <Money
              value={f.harga_jual}
              onChange={(v) => setF((p) => ({ ...p, harga_jual: v }))}
              placeholder="Kosongkan jika belum terjual"
              autoFocus={Boolean(initial.focusSell)}
            />
          </label>

          {sold && (
            <div className={'full profit-preview ' + (profit >= 0 ? 'pos' : 'neg')}>
              Profit: <b>{profit >= 0 ? '+' : '-'}{rp(Math.abs(profit))}</b>
            </div>
          )}

          <button type="button" className="btn ghost full more-toggle" onClick={() => setMore((m) => !m)}>
            {more ? '− Sembunyikan detail' : '+ Detail lainnya (jenis, warna, tanggal, supplier…)'}
          </button>

          {more && (
            <>
              <label>
                Jenis
                <input value={f.jenis} onChange={set('jenis')} list="jenis-list" placeholder="Plakat, Halfmoon…" />
                <datalist id="jenis-list">
                  {jenisOptions.map((j) => <option key={j} value={j} />)}
                </datalist>
              </label>
              <label>
                Warna
                <input value={f.warna} onChange={set('warna')} placeholder="Blue Rim, Red…" />
              </label>
              <label>
                Gender
                <select value={f.gender} onChange={set('gender')}>
                  <option value="">-</option>
                  <option value="jantan">Jantan</option>
                  <option value="betina">Betina</option>
                </select>
              </label>
              <label>
                Ukuran
                <input value={f.ukuran} onChange={set('ukuran')} placeholder="mis. M, 4 cm" />
              </label>
              <label>
                Tanggal beli
                <input type="date" value={f.tgl_beli || ''} onChange={set('tgl_beli')} />
              </label>
              <label>
                Supplier / asal
                <input value={f.supplier} onChange={set('supplier')} />
              </label>
              {sold && (
                <>
                  <label>
                    Tanggal jual
                    <input type="date" value={f.tgl_jual || ''} onChange={set('tgl_jual')} />
                  </label>
                  <label>
                    Pembeli
                    <input value={f.pembeli} onChange={set('pembeli')} />
                  </label>
                </>
              )}
              <label className="full">
                Catatan
                <textarea rows={2} value={f.catatan} onChange={set('catatan')} />
              </label>
            </>
          )}
        </div>

        {err && <div className="alert" style={{ margin: '0 20px 12px' }}>{err}</div>}
        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose}>Batal</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- halaman utama ---------- */

export default function Home() {
  const [auth, setAuth] = useState({ loading: true, authed: false, configured: true });
  const [rows, setRows] = useState([]);
  const [loadErr, setLoadErr] = useState('');
  const [filter, setFilter] = useState(emptyFilter());
  const [modal, setModal] = useState(null); // null | objek form

  const loadRows = useCallback(async () => {
    try {
      const data = await api('/api/cupang');
      setRows(data.rows);
      setLoadErr('');
    } catch (e) {
      if (e.status === 401) setAuth((a) => ({ ...a, authed: false }));
      else setLoadErr(e.message);
    }
  }, []);

  useEffect(() => {
    api('/api/auth')
      .then((d) => setAuth({ loading: false, authed: d.authed, configured: d.configured }))
      .catch(() => setAuth({ loading: false, authed: false, configured: true }));
  }, []);

  useEffect(() => {
    if (auth.authed) loadRows();
  }, [auth.authed, loadRows]);

  const jenisOptions = useMemo(
    () => [...new Set([...DEFAULT_JENIS, ...rows.map((r) => r.jenis).filter(Boolean)])].sort(),
    [rows],
  );
  const jenisInData = useMemo(
    () => [...new Set(rows.map((r) => r.jenis).filter(Boolean))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (q) {
        const hay = [r.nama, r.jenis, r.warna, r.supplier, r.pembeli, r.catatan, r.ukuran, r.status]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter.status && r.status !== filter.status) return false;
      if (filter.jenis && r.jenis !== filter.jenis) return false;
      if (filter.gender && r.gender !== filter.gender) return false;
      if (filter.from || filter.to) {
        const d = r[filter.dateBy];
        if (!d) return false;
        if (filter.from && d < filter.from) return false;
        if (filter.to && d > filter.to) return false;
      }
      return true;
    });

    const byDate = (a, b, k) => (b[k] || '').localeCompare(a[k] || '') || b.id - a.id;
    const sorters = {
      terbaru: (a, b) => byDate(a, b, 'tgl_beli'),
      terlama: (a, b) => -byDate(a, b, 'tgl_beli'),
      jual_terbaru: (a, b) => byDate(a, b, 'tgl_jual'),
      profit_tinggi: (a, b) => (profitOf(b) ?? -Infinity) - (profitOf(a) ?? -Infinity),
      profit_rendah: (a, b) => (profitOf(a) ?? Infinity) - (profitOf(b) ?? Infinity),
      beli_tinggi: (a, b) => b.harga_beli - a.harga_beli,
      jual_tinggi: (a, b) => (b.harga_jual ?? -1) - (a.harga_jual ?? -1),
      nama: (a, b) => a.nama.localeCompare(b.nama, 'id'),
    };
    out.sort(
      (a, b) =>
        (a.status === b.status ? 0 : a.status === 'terjual' ? -1 : 1) ||
        (a.status === 'terjual' ? byDate(a, b, 'tgl_jual') : byDate(a, b, 'tgl_beli')),
    );
    return out;
  }, [rows, filter]);

  const stats = useMemo(() => {
    const stok = filtered.filter((r) => r.status === 'stok');
    const sold = filtered.filter((r) => r.status === 'terjual');
    const omzet = sold.reduce((s, r) => s + (r.harga_jual || 0), 0);
    const modalSold = sold.reduce((s, r) => s + r.harga_beli, 0);
    const stokModal = stok.reduce((s, r) => s + r.harga_beli, 0);
    return {
      total: filtered.length,
      stokN: stok.length,
      stokModal,
      totalModal: stokModal + modalSold,
      soldN: sold.length,
      omzet,
      profit: omzet - modalSold,
      margin: modalSold > 0 ? ((omzet - modalSold) / modalSold) * 100 : 0,
    };
  }, [filtered]);

  const hasFilter = JSON.stringify(filter) !== JSON.stringify(emptyFilter());
  const setF = (k) => (e) => setFilter((p) => ({ ...p, [k]: e.target.value }));

  const save = async (form) => {
    if (form.id) {
      const { row } = await api(`/api/cupang/${form.id}`, { method: 'PUT', body: JSON.stringify(form) });
      setRows((rs) => rs.map((r) => (r.id === row.id ? row : r)));
    } else {
      const { row } = await api('/api/cupang', { method: 'POST', body: JSON.stringify(form) });
      setRows((rs) => [row, ...rs]);
    }
    setModal(null);
  };

  const remove = async (r) => {
    if (!confirm(`Hapus "${r.nama}"? Data tidak bisa dikembalikan.`)) return;
    try {
      await api(`/api/cupang/${r.id}`, { method: 'DELETE' });
      setRows((rs) => rs.filter((x) => x.id !== r.id));
    } catch (e) {
      alert(e.message);
    }
  };

  const markSold = (r) =>
    setModal({ ...r, harga_beli: String(r.harga_beli), harga_jual: '', tgl_jual: todayStr(), focusSell: true });

  const edit = (r) =>
    setModal({ ...r, harga_beli: String(r.harga_beli), harga_jual: r.harga_jual == null ? '' : String(r.harga_jual) });

  const logout = async () => {
    await api('/api/auth', { method: 'DELETE' });
    setRows([]);
    setAuth((a) => ({ ...a, authed: false }));
  };

  const exportCsv = () => {
    const head = ['Nama', 'Jenis', 'Warna', 'Gender', 'Ukuran', 'Tgl Beli', 'Harga Beli', 'Supplier', 'Status', 'Tgl Jual', 'Harga Jual', 'Profit', 'Pembeli', 'Catatan'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = filtered.map((r) =>
      [r.nama, r.jenis, r.warna, r.gender, r.ukuran, r.tgl_beli, r.harga_beli, r.supplier, r.status, r.tgl_jual, r.harga_jual, profitOf(r), r.pembeli, r.catatan].map(esc).join(';'),
    );
    const blob = new Blob(['﻿' + [head.map(esc).join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `catatan-cupang-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (auth.loading) return <div className="center-msg">Memuat…</div>;
  if (!auth.authed) {
    return <Login configured={auth.configured} onDone={() => setAuth((a) => ({ ...a, authed: true }))} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo-sm">🐟</span>
          <div>
            <h1>Catatan Cupang</h1>
            <p className="muted">{rows.length} ekor tercatat</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn" onClick={exportCsv} disabled={!filtered.length}>Ekspor CSV</button>
          <button className="btn" onClick={logout}>Keluar</button>
          <button className="btn primary" onClick={() => setModal(emptyForm())}>+ Tambah</button>
        </div>
      </header>

      <main>
        {loadErr && <div className="alert">{loadErr}</div>}

        <section className="stats">
          <div className="stat cost">
            <span>Total modal</span>
            <b>{rp(stats.totalModal)}</b>
            <small>Semua {stats.total} ekor ({stats.soldN} terjual, {stats.stokN} stok)</small>
          </div>
          <div className="stat">
            <span>Total terjual (kotor)</span>
            <b>{rp(stats.omzet)}</b>
            <small>Dari {stats.soldN} ekor yang sudah terjual</small>
          </div>
          <div className={'stat ' + (stats.omzet - stats.totalModal >= 0 ? 'pos' : 'neg')}>
            <span>Pendapatan bersih</span>
            <b>
              {stats.omzet - stats.totalModal >= 0 ? '' : '-'}
              {rp(Math.abs(stats.omzet - stats.totalModal))}
            </b>
            <small>Terjual kotor − total modal</small>
          </div>
        </section>
        {hasFilter && <p className="muted note">Ringkasan di atas mengikuti hasil pencarian.</p>}

        <section className="filters">
          <input
            type="search"
            className="search"
            placeholder="Cari nama, jenis, warna, supplier, pembeli, stok / terjual…"
            value={filter.q}
            onChange={setF('q')}
          />
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cupang</th>
                <th>Beli</th>
                <th className="num">Harga Beli</th>
                <th>Status</th>
                <th>Jual</th>
                <th className="num">Harga Jual</th>
                <th className="num">Profit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const p = profitOf(r);
                const meta = [r.jenis, r.warna, r.gender === 'jantan' ? '♂ Jantan' : r.gender === 'betina' ? '♀ Betina' : '', r.ukuran]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <tr key={r.id}>
                    <td data-label="Cupang" className="name-cell">
                      <b>{r.nama}</b>
                      {meta && <small>{meta}</small>}
                      {r.catatan && <small className="note-text">{r.catatan}</small>}
                    </td>
                    <td data-label="Tgl beli">
                      {fmtDate(r.tgl_beli)}
                      {r.supplier && <small>{r.supplier}</small>}
                    </td>
                    <td data-label="Harga beli" className="num">{rp(r.harga_beli)}</td>
                    <td data-label="Status">
                      <span className={'badge ' + r.status}>{r.status === 'terjual' ? 'Terjual' : 'Stok'}</span>
                    </td>
                    <td data-label="Tgl jual">
                      {r.status === 'terjual' ? fmtDate(r.tgl_jual) : '-'}
                      {r.status === 'terjual' && r.pembeli && <small>{r.pembeli}</small>}
                    </td>
                    <td data-label="Harga jual" className="num">{r.status === 'terjual' ? rp(r.harga_jual) : '-'}</td>
                    <td data-label="Profit" className={'num ' + (p == null ? '' : p >= 0 ? 'pos-text' : 'neg-text')}>
                      {p == null ? '-' : (p >= 0 ? '+' : '-') + rp(Math.abs(p))}
                    </td>
                    <td className="actions">
                      {r.status === 'stok' && (
                        <button className="btn small primary" onClick={() => markSold(r)}>Terjual</button>
                      )}
                      <button className="btn small" onClick={() => edit(r)}>Edit</button>
                      <button className="btn small danger" onClick={() => remove(r)}>Hapus</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="empty">
              {rows.length
                ? 'Tidak ada data yang cocok dengan filter.'
                : 'Belum ada data. Klik “+ Tambah” untuk mencatat cupang pertamamu.'}
            </div>
          )}
        </div>
      </main>

      {modal && (
        <FishModal
          key={modal.id || 'new'}
          initial={modal}
          jenisOptions={jenisOptions}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </div>
  );
}