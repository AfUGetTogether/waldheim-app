'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';

export default function MittagessenAdmin() {
  const [essenListe, setEssenListe] = useState([]);
  const [datum, setDatum] = useState('');
  const [gericht, setGericht] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEssen();
  }, []);

  const fetchEssen = async () => {
    const { data, error } = await supabase.from('mittagessen').select('*').order('datum', { ascending: true });
    if (!error) {
      setEssenListe(data || []);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!datum || !gericht) {
      alert('Bitte Datum und Gericht eingeben.');
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('mittagessen')
      .upsert({ datum, gericht }, { onConflict: ['datum'] });

    if (!error) {
      fetchEssen();
      setDatum('');
      setGericht('');
    } else {
      alert('Fehler beim Speichern.');
    }

    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Möchtest du dieses Mittagessen wirklich löschen?')) return;

    const { error } = await supabase.from('mittagessen').delete().eq('id', id);
    if (!error) {
      fetchEssen();
    } else {
      alert('Fehler beim Löschen.');
    }
  };

  return (
    <main className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-emerald-700">🍽️ Mittagessen verwalten</h1>

      <form onSubmit={handleSave} className="bg-white p-6 rounded shadow-md mb-8">
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Datum</label>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2 font-semibold">Gericht</label>
          <input
            type="text"
            value={gericht}
            onChange={(e) => setGericht(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded w-full">
          {loading ? 'Speichern...' : 'Gericht speichern'}
        </button>
      </form>

      <h2 className="text-xl font-bold mb-4">Eingetragene Mittagessen</h2>

      <div className="space-y-4">
        {essenListe.length === 0 ? (
          <p className="text-gray-600">Noch keine Mittagessen eingetragen.</p>
        ) : (
          essenListe.map((essen) => (
            <div key={essen.id} className="bg-gray-50 p-4 rounded shadow flex justify-between items-center">
              <div>
                <div className="font-semibold">{format(new Date(essen.datum), 'dd.MM.yyyy')}</div>
                <div className="text-gray-600">{essen.gericht}</div>
              </div>
              <button
                onClick={() => handleDelete(essen.id)}
                className="text-red-500 hover:underline text-sm"
              >
                Löschen
              </button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
