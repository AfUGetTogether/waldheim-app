// src/app/ausfluege/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AnimatePresence, motion } from 'framer-motion';

export default function AusfluegePage() {
  const [user, setUser] = useState(null);
  const [ausfluege, setAusfluege] = useState([]);
  const [verbindungen, setVerbindungen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [ziel, setZiel] = useState('');
  const [verbindungId, setVerbindungId] = useState('');
  const [bearbeiten, setBearbeiten] = useState(false);
  const [bearbeiteId, setBearbeiteId] = useState(null);

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

  useEffect(() => {
    if (user && bearbeiten && bearbeiteId) {
      const eintrag = ausfluege.find(a => a.id === bearbeiteId);
      if (eintrag) {
        setZiel(eintrag.ziel || '');
        setVerbindungId(
          eintrag.verbindung_id || (eintrag.verbindung_name ? `custom:${eintrag.verbindung_name}` : '')
        );
      }
    }
  }, [user, bearbeiten, bearbeiteId, ausfluege]);

  const handleSubmit = async () => {
    if (!ziel) return;
    setLoading(true);

    const verbindung_id = verbindungId.startsWith('custom:') ? null : verbindungId;
    const verbindung_name = verbindungId.startsWith('custom:') ? verbindungId.replace('custom:', '') : null;

    const eintragEmail = isAdmin && bearbeiteId
        ? ausfluege.find(a => a.id === bearbeiteId)?.gruppe_email
        : user.email;

    const { error } = await supabase.from('ausfluege').upsert({
        id: bearbeiteId || undefined,
        gruppe_email: eintragEmail,
        ziel,
        verbindung_id,
        verbindung_name,
        updated_at: new Date()
    }, { onConflict: ['id'] });

    if (!error) {
        setMessage('✅ Ausflug gespeichert!');
        setBearbeiten(false);
        setBearbeiteId(null);
        const { data: neue } = await supabase
        .from('ausfluege')
        .select('*, verbindungen(*)')
        .order('updated_at', { ascending: false });
        setAusfluege(neue || []);
    } else {
        setMessage('❌ Fehler beim Speichern');
    }

    setLoading(false);
    setTimeout(() => setMessage(null), 3000);
    };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('ausfluege').delete().eq('id', id);
    if (!error) {
      setMessage('🗑️ Ausflug gelöscht');
      const { data: neue } = await supabase
        .from('ausfluege')
        .select('*, verbindungen(*)')
        .order('updated_at', { ascending: false });
      setAusfluege(neue || []);
    } else {
      setMessage('❌ Fehler beim Löschen');
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const getAnzahlGruppen = (verbindung_id) => {
    return ausfluege.filter(a => a.verbindung_id === verbindung_id).length;
  };

  const customOptions = ["Zu Fuß", "Mit dem Fahrrad", "Andere"];
  const isAdmin = user?.email === 'admin@wh.de';

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
            {(user?.email === eintrag.gruppe_email || isAdmin) && (
              <div className="flex gap-3 mt-2">
                <button
                  className="text-emerald-600 hover:underline text-sm"
                  onClick={() => {
                    setBearbeiten(true);
                    setBearbeiteId(eintrag.id);
                  }}
                >
                  Bearbeiten
                </button>
                <button
                  onClick={() => handleDelete(eintrag.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  Löschen
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {user && bearbeiten && (
        <div className="bg-gray-100 p-6 rounded shadow space-y-4">
          <h2 className="text-xl font-semibold">📝 Ausflug bearbeiten</h2>
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
              const voll = benutzt >= v.limit && verbindungId !== v.id;
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
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
            >
              Speichern
            </button>
            <button
              onClick={() => {
                setBearbeiten(false);
                setBearbeiteId(null);
              }}
              className="text-gray-600 hover:underline"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded shadow-md z-50"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
