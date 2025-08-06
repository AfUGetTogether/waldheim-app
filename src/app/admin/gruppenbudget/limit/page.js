'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminLimitSeite() {
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLimit();
  }, []);

  const fetchLimit = async () => {
    const { data, error } = await supabase
      .from('einstellungen')
      .select('wert')
      .eq('id', 'buchungslimit')
      .single();

    if (!error && data) {
      setLimit(data.wert);
    }
  };

  const speichern = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('einstellungen')
      .upsert({ id: 'buchungslimit', wert: parseInt(limit) }, { onConflict: ['id'] });

    setLoading(false);
    setMessage(error ? 'Fehler beim Speichern.' : 'Limit gespeichert!');
  };

  return (
    <main className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-emerald-700">🔧 Buchungslimit festlegen</h1>

      <label className="block mb-2 font-semibold">Max. Buchungen pro Woche:</label>
      <input
        type="number"
        value={limit}
        onChange={(e) => setLimit(e.target.value)}
        className="border rounded p-2 w-32"
      />

      <button
        onClick={speichern}
        disabled={loading}
        className="ml-4 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
      >
        {loading ? 'Speichern…' : 'Speichern'}
      </button>

      {message && <div className="mt-4 text-sm text-emerald-600">{message}</div>}
    </main>
  );
}
