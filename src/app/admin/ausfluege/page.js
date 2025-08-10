// src/app/ausfluege/page.js
'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AusfluegePage() {
  const [user, setUser] = useState(null);
  const [ausfluege, setAusfluege] = useState([]);
  const [verbindungen, setVerbindungen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Edit-Form States
  const [editingId, setEditingId] = useState(null);
  const [ziel, setZiel] = useState('');
  const [verbindungId, setVerbindungId] = useState(''); // '' | uuid | 'custom:Zu Fuß' etc.

  const isAdmin = user?.email === 'admin@wh.de';
  const customOptions = ['Zu Fuß', 'Mit dem Fahrrad', 'Andere'];

  // ---- Initial Load ----
  useEffect(() => {
    const init = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setUser(sessionData?.session?.user ?? null);

      await Promise.all([reloadAusfluege(), reloadVerbindungen()]);
    };
    init();
  }, []);

  const reloadAusfluege = async () => {
    const { data, error } = await supabase
      .from('ausfluege')
      .select('*, verbindungen(*)')
      .order('updated_at', { ascending: false });
    if (!error) setAusfluege(data || []);
  };

  const reloadVerbindungen = async () => {
    const { data, error } = await supabase.from('verbindungen').select('*').order('abfahrt', { ascending: true });
    if (!error) setVerbindungen(data || []);
  };

  // Für Anzeige: wie viele Gruppen nutzen eine Verbindung
  const usedCountByVerbindung = useMemo(() => {
    const map = new Map();
    for (const a of ausfluege) {
      if (a.verbindung_id) {
        map.set(a.verbindung_id, (map.get(a.verbindung_id) || 0) + 1);
      }
    }
    return map;
  }, [ausfluege]);

  const startEdit = (eintrag) => {
    setEditingId(eintrag.id);
    setZiel(eintrag.ziel || '');
    if (eintrag.verbindung_id) {
      setVerbindungId(eintrag.verbindung_id);
    } else if (eintrag.verbindung_name) {
      setVerbindungId(`custom:${eintrag.verbindung_name}`);
    } else {
      setVerbindungId('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setZiel('');
    setVerbindungId('');
  };

  const handleSave = async () => {
    if (!ziel) {
      showToast('Bitte ein Ausflugsziel eintragen.');
      return;
    }
    setLoading(true);

    // Admin soll beim Bearbeiten die ursprüngliche Gruppe respektieren
    const targetEmail = isAdmin && editingId
      ? ausfluege.find(a => a.id === editingId)?.gruppe_email
      : user?.email;

    if (!targetEmail) {
      showToast('Nicht eingeloggt.');
      setLoading(false);
      return;
    }

    // Verbindung auflösen
    const isCustom = typeof verbindungId === 'string' && verbindungId.startsWith('custom:');
    const payload = {
      id: editingId || undefined,
      gruppe_email: targetEmail,
      ziel,
      verbindung_id: isCustom || verbindungId === '' ? null : verbindungId, // uuid oder null
      verbindung_name: isCustom ? verbindungId.replace('custom:', '') : null,
      updated_at: new Date()
    };

    // Limit prüfen (nur wenn Standard-Verbindung gewählt & nicht die gleiche wie vorher)
    if (!isCustom && verbindungId) {
      const chosen = verbindungen.find(v => v.id === verbindungId);
      if (chosen) {
        const alreadyUsed = usedCountByVerbindung.get(chosen.id) || 0;

        // Wenn wir einen bestehenden Eintrag bearbeiten, der bereits auf dieser Verbindung war,
        // dann darf er sie weiterhin wählen, auch wenn "voll".
        const previouslySame =
          editingId &&
          ausfluege.find(a => a.id === editingId)?.verbindung_id === chosen.id;

        if (!previouslySame && alreadyUsed >= chosen.limit) {
          showToast('Diese Verbindung ist bereits voll belegt.');
          setLoading(false);
          return;
        }
      }
    }

    const { error } = await supabase
      .from('ausfluege')
      .upsert(payload, { onConflict: ['id'] });

    if (error) {
      showToast('Fehler beim Speichern.');
    } else {
      showToast('✅ Ausflug gespeichert!');
      cancelEdit();
      await reloadAusfluege();
    }

    setLoading(false);
  };

  const handleDelete = async (id) => {
    const confirmDelete = confirm('Diesen Ausflug wirklich löschen?');
    if (!confirmDelete) return;
    setLoading(true);

    // WICHTIG: .select() anhängen, um echte Rückmeldung zu bekommen
    const { data, error } = await supabase
      .from('ausfluege')
      .delete()
      .eq('id', id)
      .select(); // gibt gelöschte Zeilen zurück

    if (error) {
      setToast('❌ Fehler beim Löschen: ' + error.message);
    } else if (!data || data.length === 0) {
      // Kein Fehlerobjekt, aber auch keine gelöschte Zeile -> meist RLS verweigert
      setToast('❌ Löschen nicht erlaubt (RLS/Policy greift).');
    } else {
      setToast('🗑️ Ausflug gelöscht');
      // Optimistisch entfernen
      setAusfluege((prev) => prev.filter((a) => a.id !== id));
      // Sicherheitshalber frisch laden
      await reloadAusfluege();
    }

    setLoading(false);
    setTimeout(() => setToast(null), 2500);
  };


  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Kann der aktuelle User diesen Eintrag bearbeiten/löschen?
  const canEdit = (eintrag) => isAdmin || user?.email === eintrag.gruppe_email;

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🌳 Ausflüge</h1>

      {/* Liste aller Ausflüge */}
      <div className="mb-8 space-y-4">
        {ausfluege.length === 0 ? (
          <p className="text-gray-600">Noch keine Ausflüge eingetragen.</p>
        ) : (
          ausfluege.map((eintrag) => (
            <div key={eintrag.id} className="p-4 border rounded shadow-sm bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div><strong>Gruppe:</strong> {eintrag.gruppe_email === 'wtv@wh.de' ? 'WTV' : `Gruppe ${eintrag.gruppe_email.split('@')[0]}`}</div>
                  <div><strong>Ziel:</strong> {eintrag.ziel}</div>
                  {eintrag.verbindungen ? (
                    <div>
                      <strong>Verbindung:</strong> {eintrag.verbindungen.linie}, {eintrag.verbindungen.abfahrt} ab {eintrag.verbindungen.haltestelle}
                    </div>
                  ) : eintrag.verbindung_name ? (
                    <div>
                      <strong>Verbindung:</strong> {eintrag.verbindung_name}
                    </div>
                  ) : (
                    <div className="text-gray-500"><em>Keine Verbindung angegeben</em></div>
                  )}
                </div>

                {canEdit(eintrag) && (
                  <div className="shrink-0 flex gap-3">
                    <button
                      className="text-emerald-600 hover:underline text-sm"
                      onClick={() => startEdit(eintrag)}
                    >
                      Bearbeiten
                    </button>
                    <button
                      className="text-red-600 hover:underline text-sm"
                      onClick={() => handleDelete(eintrag.id)}
                    >
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bearbeiten-/Anlegenbereich: sichtbar nur mit Login */}
      {user && (
        <div className="bg-gray-50 p-6 rounded shadow space-y-4">
          <h2 className="text-xl font-semibold">
            {editingId ? '📝 Ausflug bearbeiten' : '📝 Eigenen Ausflug eintragen'}
          </h2>

          {/* Ziel */}
          <input
            type="text"
            placeholder="Ausflugsziel"
            value={ziel}
            onChange={(e) => setZiel(e.target.value)}
            className="w-full p-2 border rounded"
          />

          {/* Verbindung */}
          <select
            value={verbindungId}
            onChange={(e) => setVerbindungId(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">– Verbindung wählen –</option>
            {verbindungen.map((v) => {
              const benutzt = usedCountByVerbindung.get(v.id) || 0;
              // Wenn gerade dieser Eintrag editiert wird & schon auf dieser Verbindung ist -> nicht deaktivieren
              const currentIsThis =
                editingId && ausfluege.find(a => a.id === editingId)?.verbindung_id === v.id;
              const voll = !currentIsThis && benutzt >= v.limit;

              return (
                <option key={v.id} value={v.id} disabled={voll}>
                  {v.linie} – {v.abfahrt} ab {v.haltestelle} ({benutzt}/{v.limit})
                </option>
              );
            })}
            {/* Custom-Optionen */}
            {customOptions.map((opt) => (
              <option key={`custom-${opt}`} value={`custom:${opt}`}>
                {opt}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={loading || !ziel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              Speichern
            </button>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="text-gray-600 hover:underline"
              >
                Abbrechen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded shadow">
          {toast}
        </div>
      )}
    </main>
  );
}
