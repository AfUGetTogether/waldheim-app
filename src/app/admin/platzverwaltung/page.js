'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminPlatzSeite() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const [plaetze, setPlaetze] = useState([]);
  const [zeitfenster, setZeitfenster] = useState([]);

  const [platzName, setPlatzName] = useState('');
  const [zeitfensterVon, setZeitfensterVon] = useState('');
  const [zeitfensterBis, setZeitfensterBis] = useState('');
  const [newTimes, setNewTimes] = useState({}); // { [platzId]: {von:'', bis:''} }

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Admin-Check
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (email !== 'admin@wh.de') {
        router.push('/');
        return;
      }
      setAuthorized(true);
    })();
  }, [router]);

  // Daten laden
  const fetchAll = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const [pRes, zfRes] = await Promise.all([
      supabase.from('plaetze').select('id, name').order('name', { ascending: true }),
      supabase.from('zeitfenster').select('id, platz_id, von, bis').order('von', { ascending: true })
    ]);

    if (pRes.error) console.error('Fehler plaetze:', pRes.error.message);
    if (zfRes.error) console.error('Fehler zeitfenster:', zfRes.error.message);

    setPlaetze(pRes.data || []);
    setZeitfenster(zfRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authorized) fetchAll();
  }, [authorized]);

  const zfByPlatz = (platzId) => zeitfenster.filter(z => z.platz_id === platzId);

  const handleCreatePlatzUndZF = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1) Platz anlegen
    const { data: platzData, error: platzErr } = await supabase
      .from('plaetze')
      .insert([{ name: platzName }])
      .select()
      .single();

    if (platzErr || !platzData) {
      setErrorMessage(`Fehler beim Erstellen des Platzes: ${platzErr?.message || 'unbekannt'}`);
      return;
    }

    // 2) Erstes Zeitfenster anlegen
    const { error: zfErr } = await supabase
      .from('zeitfenster')
      .insert([{ platz_id: platzData.id, von: zeitfensterVon, bis: zeitfensterBis }]);

    if (zfErr) {
      setErrorMessage(`Fehler beim Erstellen des Zeitfensters: ${zfErr.message}`);
      return;
    }

    setSuccessMessage('Platz und Zeitfenster erfolgreich hinzugefügt!');
    setPlatzName('');
    setZeitfensterVon('');
    setZeitfensterBis('');
    fetchAll();
  };

  const addZeitfenster = async (platzId) => {
    const t = newTimes[platzId] || {};
    if (!t.von || !t.bis) {
      setErrorMessage('Bitte beide Uhrzeiten ausfüllen.');
      return;
    }
    const { error } = await supabase
      .from('zeitfenster')
      .insert([{ platz_id: platzId, von: t.von, bis: t.bis }]);

    if (error) {
      setErrorMessage(`Fehler beim Hinzufügen: ${error.message}`);
    } else {
      setSuccessMessage('Zeitfenster hinzugefügt.');
      setNewTimes(prev => ({ ...prev, [platzId]: { von: '', bis: '' } }));
      fetchAll();
    }
  };

  const deleteZeitfenster = async (zfId) => {
    if (!confirm('Zeitfenster wirklich löschen?')) return;
    const { error } = await supabase.from('zeitfenster').delete().eq('id', zfId);
    if (error) setErrorMessage(`Fehler: ${error.message}`);
    else {
      setSuccessMessage('Zeitfenster gelöscht.');
      fetchAll();
    }
  };

  const deletePlatz = async (platzId) => {
    if (!confirm('Platz wirklich löschen? Zugehörige Zeitfenster werden ebenfalls gelöscht.')) return;
    const { error } = await supabase.from('plaetze').delete().eq('id', platzId);
    if (error) setErrorMessage(`Fehler: ${error.message}`);
    else {
      setSuccessMessage('Platz gelöscht.');
      fetchAll();
    }
  };

  if (!authorized) return null;

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Platzverwaltung</h1>

      {errorMessage && <div className="mb-4 text-red-600">{errorMessage}</div>}
      {successMessage && <div className="mb-4 text-emerald-700">{successMessage}</div>}

      {/* Neu anlegen */}
      <form onSubmit={handleCreatePlatzUndZF} className="bg-white p-6 rounded shadow mb-8">
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Platzname</label>
          <input
            type="text"
            value={platzName}
            onChange={(e) => setPlatzName(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block mb-2 font-semibold">Von (Uhrzeit)</label>
            <input
              type="time"
              value={zeitfensterVon}
              onChange={(e) => setZeitfensterVon(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block mb-2 font-semibold">Bis (Uhrzeit)</label>
            <input
              type="time"
              value={zeitfensterBis}
              onChange={(e) => setZeitfensterBis(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>
        </div>

        <button className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">
          Platz und Zeitfenster speichern
        </button>
      </form>

      {/* Übersicht */}
      <h2 className="text-xl font-bold mb-4">Vorhandene Plätze</h2>

      {loading ? (
        <p className="text-gray-500">Lade…</p>
      ) : plaetze.length === 0 ? (
        <p className="text-gray-600">Noch keine Plätze angelegt.</p>
      ) : (
        <div className="space-y-6">
          {plaetze.map((p) => (
            <div key={p.id} className="border p-4 rounded shadow-sm bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{p.name}</h3>
                <button
                  onClick={() => deletePlatz(p.id)}
                  className="text-red-600 font-semibold hover:underline"
                >
                  🗑️ Platz löschen
                </button>
              </div>

              <div className="mt-3">
                <h4 className="text-md font-semibold mb-2">Zeitfenster</h4>
                {zfByPlatz(p.id).length === 0 ? (
                  <p className="text-gray-600">Keine Zeitfenster hinterlegt.</p>
                ) : (
                  <ul className="space-y-2">
                    {zfByPlatz(p.id).map((zf) => (
                      <li key={zf.id} className="flex items-center justify-between">
                        <span>{zf.von} – {zf.bis}</span>
                        <button
                          onClick={() => deleteZeitfenster(zf.id)}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Zeitfenster löschen
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Neues Zeitfenster hinzufügen */}
              <div className="mt-4">
                <h4 className="text-md font-semibold mb-2">Neues Zeitfenster hinzufügen</h4>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newTimes[p.id]?.von || ''}
                    onChange={(e) =>
                      setNewTimes(prev => ({ ...prev, [p.id]: { ...prev[p.id], von: e.target.value } }))
                    }
                    className="border p-2 rounded"
                  />
                  <input
                    type="time"
                    value={newTimes[p.id]?.bis || ''}
                    onChange={(e) =>
                      setNewTimes(prev => ({ ...prev, [p.id]: { ...prev[p.id], bis: e.target.value } }))
                    }
                    className="border p-2 rounded"
                  />
                  <button
                    onClick={() => addZeitfenster(p.id)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 rounded"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
