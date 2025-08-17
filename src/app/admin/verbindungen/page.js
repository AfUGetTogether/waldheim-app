// src/app/admin/verbindungen/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminVerbindungenPage() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [items, setItems] = useState([]);
  const [linie, setLinie] = useState('');
  const [abfahrt, setAbfahrt] = useState('');     // z.B. "09:42" (Text reicht)
  const [haltestelle, setHaltestelle] = useState('');
  const [capacity, setCapacity] = useState('');   // falls du die Spalte noch "limit" nennst, ist das egal – siehe unten

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // --- Admin-Check (zeigt das Formular nur für Admin) ---
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email || '';
      if (!cancel) {
        setIsAdmin(email === 'admin@wh.de');
        setSessionChecked(true);
      }
    })();
    return () => { cancel = true; };
  }, []);

  // --- Verbindungen laden ---
  const load = async () => {
    const { data, error } = await supabase
      .from('verbindungen')
      .select('*')
      .order('linie', { ascending: true });

    if (error) {
      console.error('Laden der Verbindungen fehlgeschlagen:', error.message);
      setItems([]);
    } else {
      setItems(data || []);
    }
  };

  useEffect(() => {
    if (sessionChecked) load();
  }, [sessionChecked]);

  const toast = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(null), 2500);
  };

  // --- Hinzufügen ---
  const addOne = async (e) => {
    e.preventDefault();
    if (!linie || !abfahrt || !haltestelle || !capacity) {
      toast('Bitte alle Felder ausfüllen.');
      return;
    }
    setLoading(true);

    // Achtung: Manche Projekte haben die Spalte noch "limit". Wir schreiben beide,
    // PostgREST ignoriert die nicht existierende Spalte einfach.
    const payload = {
      linie,
      abfahrt,
      haltestelle,
      capacity: parseInt(capacity, 10),
      limit: parseInt(capacity, 10), // nur falls du die Spalte nicht umbenannt hast
    };

    const { error } = await supabase.from('verbindungen').insert([payload]);

    setLoading(false);
    if (error) {
      console.error(error);
      toast('❌ Fehler beim Hinzufügen');
    } else {
      toast('✅ Verbindung hinzugefügt');
      setLinie(''); setAbfahrt(''); setHaltestelle(''); setCapacity('');
      load();
    }
  };

  // --- Löschen ---
  const removeOne = async (id) => {
    if (!confirm('Diese Verbindung wirklich löschen?')) return;

    const { error } = await supabase
      .from('verbindungen')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      toast('❌ Fehler beim Löschen');
    } else {
      toast('🗑️ Verbindung gelöscht');
      // lokal filtern – schneller als reload
      setItems(prev => prev.filter(x => x.id !== id));
    }
  };

  // --- Sichtbarkeit: ohne Admin nur Liste anzeigen, kein Formular ---
  return (
    <main className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-emerald-700 mb-6">Admin: Verbindungen</h1>

      {msg && (
        <div className="mb-4 rounded bg-emerald-600 text-white px-3 py-2 shadow">
          {msg}
        </div>
      )}

      {sessionChecked && isAdmin && (
        <form onSubmit={addOne} className="bg-white rounded-xl shadow p-4 mb-8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Linie</label>
              <input
                className="w-full border rounded p-2"
                value={linie}
                onChange={(e) => setLinie(e.target.value)}
                placeholder="z.B. U7 / Bus 42"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Abfahrt</label>
              <input
                className="w-full border rounded p-2"
                value={abfahrt}
                onChange={(e) => setAbfahrt(e.target.value)}
                placeholder="z.B. 09:42"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Haltestelle</label>
              <input
                className="w-full border rounded p-2"
                value={haltestelle}
                onChange={(e) => setHaltestelle(e.target.value)}
                placeholder="z.B. Hauptbahnhof"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Kapazität (Anz. Gruppen)</label>
              <input
                type="number"
                min="1"
                className="w-full border rounded p-2"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="z.B. 2"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Speichere…' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Vorhandene Verbindungen</h2>
        {items.length === 0 ? (
          <p className="text-gray-500">Noch keine Verbindungen.</p>
        ) : (
          <ul className="divide-y">
            {items.map(v => (
              <li key={v.id} className="py-3 flex items-center justify-between">
                <div className="text-sm">
                  <div className="font-semibold">{v.linie}</div>
                  <div className="text-gray-600">
                    {v.abfahrt} · {v.haltestelle} · Kapazität:{' '}
                    <strong>{(v.capacity ?? v.limit) ?? '—'}</strong>
                  </div>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => removeOne(v.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Löschen
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
