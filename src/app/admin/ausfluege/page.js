// src/app/admin/ausfluege/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminAusfluegePage() {
  const [user, setUser] = useState(null);
  const [verbindungen, setVerbindungen] = useState([]);
  const [linie, setLinie] = useState('');
  const [abfahrtszeit, setAbfahrtszeit] = useState('');
  const [haltestelle, setHaltestelle] = useState('');
  const [limit, setLimit] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      if (currentUser?.email !== 'admin@wh.de') {
        window.location.href = '/';
      } else {
        setUser(currentUser);
        const { data } = await supabase.from('verbindungen').select('*');
        setVerbindungen(data || []);
      }
    };

    fetchData();
  }, []);

  const addVerbindung = async () => {
    setLoading(true);
    const { error } = await supabase.from('verbindungen').insert({
      linie,
      abfahrtszeit,
      haltestelle,
      limit
    });
    if (!error) {
      const { data } = await supabase.from('verbindungen').select('*');
      setVerbindungen(data || []);
      setLinie('');
      setAbfahrtszeit('');
      setHaltestelle('');
      setLimit(1);
    }
    setLoading(false);
  };

  const deleteVerbindung = async (id) => {
    await supabase.from('verbindungen').delete().eq('id', id);
    const { data } = await supabase.from('verbindungen').select('*');
    setVerbindungen(data || []);
  };

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-emerald-700 mb-6">Verbindungen verwalten</h1>

      <div className="bg-white rounded-xl shadow p-4 mb-8">
        <h2 className="text-lg font-semibold mb-4">Neue Verbindung hinzufügen</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="Linie" className="border rounded px-2 py-1" value={linie} onChange={e => setLinie(e.target.value)} />
          <input type="time" className="border rounded px-2 py-1" value={abfahrtszeit} onChange={e => setAbfahrtszeit(e.target.value)} />
          <input type="text" placeholder="Haltestelle" className="border rounded px-2 py-1" value={haltestelle} onChange={e => setHaltestelle(e.target.value)} />
          <input type="number" placeholder="Gruppenlimit" className="border rounded px-2 py-1" value={limit} min={1} onChange={e => setLimit(Number(e.target.value))} />
        </div>
        <button onClick={addVerbindung} disabled={loading} className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">
          {loading ? 'Speichere...' : 'Hinzufügen'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Bestehende Verbindungen</h2>
        <ul>
          {verbindungen.map((v) => (
            <li key={v.id} className="flex justify-between items-center border-b py-2">
              <div>
                <span className="font-medium">{v.linie}</span> – {v.abfahrtszeit} ab {v.haltestelle} (Limit: {v.limit})
              </div>
              <button onClick={() => deleteVerbindung(v.id)} className="text-red-600 hover:underline">Löschen</button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
