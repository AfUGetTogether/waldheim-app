// src/app/ausfluege/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AusfluegePage() {
  const [user, setUser] = useState(null);
  const [ausfluege, setAusfluege] = useState([]);
  const [verbindungen, setVerbindungen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ziel, setZiel] = useState('');
  const [verbindungId, setVerbindungId] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setUser(sessionData?.session?.user ?? null);

      const { data: ausfluegeData } = await supabase
        .from('ausfluege')
        .select('*, verbindungen(*)')
        .order('updated_at', { ascending: false });
      setAusfluege(ausfluegeData || []);

      const { data: verbindungenData } = await supabase.from('verbindungen').select('*');
      setVerbindungen(verbindungenData || []);
    };

    fetchInitialData();
  }, []);

  const handleSubmit = async () => {
    if (!ziel) return;

    setLoading(true);

    const verbindung_id = verbindungId.startsWith('custom:') ? null : verbindungId;
    const verbindung_name = verbindungId.startsWith('custom:') ? verbindungId.replace('custom:', '') : null;

    const { error } = await supabase.from('ausfluege').upsert({
        gruppe_email: user.email,
        ziel,
        verbindung_id,
        verbindung_name,
        updated_at: new Date()
        }, { onConflict: ['gruppe_email'] });

        if (error) {
        console.error("Speicherfehler:", error.message);
        alert("Fehler beim Speichern: " + error.message);
        } else {
        window.location.reload();
        }

    setLoading(false);
  };

  const getAnzahlGruppen = (verbindung_id) => {
    return ausfluege.filter(a => a.verbindung_id === verbindung_id).length;
  };

  const customOptions = ["Zu Fuß", "Mit dem Fahrrad", "Andere"];

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🌳 Ausflüge</h1>

      <div className="mb-8 space-y-4">
        {ausfluege.map((eintrag, idx) => (
          <div key={idx} className="p-4 border rounded shadow-sm bg-white">
            <div><strong>Gruppe:</strong> {eintrag.gruppe_email.split('@')[0]}</div>
            <div><strong>Ziel:</strong> {eintrag.ziel}</div>
            {eintrag.verbindungen ? (
              <div>
                <strong>Verbindung:</strong> {eintrag.verbindungen.linie}, {eintrag.verbindungen.abfahrt} ab {eintrag.verbindungen.haltestelle}
              </div>
            ) : eintrag.verbindung_name ? (
              <div>
                <strong>Verbindung:</strong> {eintrag.verbindung_name}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {user && (
        <div className="bg-gray-100 p-6 rounded shadow space-y-4">
          <h2 className="text-xl font-semibold">📝 Eigenen Ausflug eintragen</h2>
          <input
            type="text"
            placeholder="Ausflugsziel"
            value={ziel}
            onChange={(e) => setZiel(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <select
            value={verbindungId}
            onChange={(e) => setVerbindungId(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">– Verbindung wählen –</option>
            {verbindungen.map((v) => {
              const benutzt = getAnzahlGruppen(v.id);
              const voll = benutzt >= v.limit;
              return (
                <option key={v.id} value={v.id} disabled={voll}>
                  {v.linie} – {v.abfahrt} ab {v.haltestelle} ({benutzt}/{v.limit})
                </option>
              );
            })}
            {customOptions.map((opt, i) => (
              <option key={`custom-${i}`} value={`custom:${opt}`}>{opt}</option>
            ))}
          </select>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
          >
            Speichern
          </button>
        </div>
      )}
    </main>
  );
}
