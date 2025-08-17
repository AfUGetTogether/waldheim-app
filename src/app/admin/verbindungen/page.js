'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminVerbindungenPage() {
  // Auth / Admin
  const [user, setUser] = useState(null);

  // GTFS Upload
  const [lastUpdate, setLastUpdate] = useState(null);
  const [gtfsFile, setGtfsFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [gtfsMessage, setGtfsMessage] = useState(null);

  // Manuelle Verbindungen
  const [verbindungen, setVerbindungen] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState({
    linie: '',
    abfahrt: '',
    haltestelle: '',
    limit: 3,
  });
  const [formBusy, setFormBusy] = useState(false);
  const [formMsg, setFormMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      if (!u || u.email !== 'admin@wh.de') {
        // Optional: redirect('/'); – hier nur Anzeige auslassen
        return;
      }
      setUser(u);

      await Promise.all([fetchLastUpdate(), fetchVerbindungen()]);
    })();
  }, []);

  const fetchLastUpdate = async () => {
    const { data, error } = await supabase
      .from('gtfs_meta')
      .select('*')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) setLastUpdate(data || null);
  };

  const fetchVerbindungen = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from('verbindungen')
      .select('*');

    if (!error) {
      // sortiere nach abfahrt (time) aufsteigend
      const sorted = (data || []).slice().sort((a, b) =>
        (a.abfahrt || '').localeCompare(b.abfahrt || '')
      );
      setVerbindungen(sorted);
    }
    setLoadingList(false);
  };

  // ---------- GTFS Upload ----------
  const onGtfsChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setGtfsFile(f);
  };

  const uploadGTFS = async () => {
    if (!gtfsFile) {
      setGtfsMessage('Bitte eine GTFS ZIP-Datei auswählen.');
      return;
    }
    if (!user) {
      setGtfsMessage('Nicht autorisiert.');
      return;
    }
    setUploading(true);
    setGtfsMessage(null);

    try {
      const objectPath = `latest/${Date.now()}_${gtfsFile.name}`;

      // 1) Upload in Storage (Bucket "gtfs")
      const { error: upErr } = await supabase.storage
        .from('gtfs')
        .upload(objectPath, gtfsFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: gtfsFile.type || 'application/zip',
        });
      if (upErr) throw upErr;

      // 2) Meta speichern
      const { error: metaErr } = await supabase
        .from('gtfs_meta')
        .insert({
          filename: objectPath,
          size_bytes: gtfsFile.size,
          uploaded_by: user.email,
        });
      if (metaErr) throw metaErr;

      setGtfsMessage('✅ GTFS erfolgreich hochgeladen!');
      setGtfsFile(null);
      const input = document.getElementById('gtfs-file-input');
      if (input) input.value = '';

      await fetchLastUpdate();
    } catch (err) {
      console.error(err);
      setGtfsMessage('❌ Upload fehlgeschlagen.');
    } finally {
      setUploading(false);
      setTimeout(() => setGtfsMessage(null), 3000);
    }
  };

  // ---------- Manuell hinzufügen ----------
  const updateForm = (patch) => setForm(prev => ({ ...prev, ...patch }));

  const addVerbindung = async () => {
    if (!form.linie || !form.abfahrt || !form.haltestelle || !form.limit) {
      setFormMsg('Bitte alle Felder ausfüllen.');
      return;
    }
    setFormBusy(true);
    setFormMsg(null);

    const payload = {
      linie: form.linie.trim(),
      abfahrt: form.abfahrt,        // "HH:mm"
      haltestelle: form.haltestelle.trim(),
      limit: Number(form.limit) || 1,
    };

    const { error } = await supabase.from('verbindungen').insert(payload);
    if (error) {
      console.error(error);
      setFormMsg('❌ Fehler beim Hinzufügen.');
    } else {
      setFormMsg('✅ Verbindung hinzugefügt.');
      setForm({ linie: '', abfahrt: '', haltestelle: '', limit: 3 });
      await fetchVerbindungen();
    }

    setFormBusy(false);
    setTimeout(() => setFormMsg(null), 2500);
  };

  const deleteVerbindung = async (id) => {
    if (!confirm('Diese Verbindung wirklich löschen?')) return;
    const { error } = await supabase.from('verbindungen').delete().eq('id', id);
    if (error) {
      alert('Fehler beim Löschen: ' + error.message);
    } else {
      await fetchVerbindungen();
    }
  };

  if (!user) {
    return (
      <main className="p-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-emerald-700 mb-6">Admin · Verbindungen</h1>
        <p className="text-gray-600">Nur für Admin sichtbar.</p>
      </main>
    );
  }

  return (
    <main className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-emerald-700 mb-6">Admin · Verbindungen</h1>

      {/* === GTFS Bereich === */}
      <section className="bg-white rounded-xl shadow p-4 mb-8">
        <h2 className="text-lg font-semibold mb-2">GTFS-Daten</h2>
        <p className="text-sm text-gray-600 mb-4">
          {lastUpdate
            ? <>Zuletzt aktualisiert: <strong>{new Date(lastUpdate.uploaded_at).toLocaleString()}</strong><br/>
                Datei: <code className="text-gray-700">{lastUpdate.filename}</code> ({(lastUpdate.size_bytes/1_000_000).toFixed(1)} MB)</>
            : 'Noch keine GTFS-Daten hochgeladen.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <input
            id="gtfs-file-input"
            type="file"
            accept=".zip,.txt"
            onChange={onGtfsChange}
            className="block"
          />
          <button
            onClick={uploadGTFS}
            disabled={!gtfsFile || uploading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {uploading ? 'Lade hoch…' : 'Aktuelle GTFS-Daten hochladen'}
          </button>
        </div>

        {gtfsMessage && <div className="mt-3 text-sm">{gtfsMessage}</div>}

        {/* Platzhalter für den nächsten Schritt (automatisch aus GTFS erzeugen) */}
        {/* <div className="mt-6">
          <h3 className="font-semibold mb-2">Verbindungen automatisch erzeugen</h3>
          <p className="text-sm text-gray-600 mb-3">
            (Nächster Schritt) Wähle Datum → lade Fahrten 09–11 Uhr „Am Ochsenwald“ → trage mit Limit=3 ein.
          </p>
          <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded cursor-not-allowed">In Arbeit…</button>
        </div> */}
      </section>

      {/* === Manuelles Hinzufügen === */}
      <section className="bg-white rounded-xl shadow p-4 mb-8">
        <h2 className="text-lg font-semibold mb-4">Verbindung manuell hinzufügen</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Linie</label>
            <input
              type="text"
              value={form.linie}
              onChange={(e) => updateForm({ linie: e.target.value })}
              className="w-full border rounded p-2"
              placeholder="z. B. 207"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Abfahrt (Uhrzeit)</label>
            <input
              type="time"
              value={form.abfahrt}
              onChange={(e) => updateForm({ abfahrt: e.target.value })}
              className="w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Haltestelle</label>
            <input
              type="text"
              value={form.haltestelle}
              onChange={(e) => updateForm({ haltestelle: e.target.value })}
              className="w-full border rounded p-2"
              placeholder="Am Ochsenwald"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Max. Gruppen (Limit)</label>
            <input
              type="number"
              min={1}
              value={form.limit}
              onChange={(e) => updateForm({ limit: e.target.value })}
              className="w-full border rounded p-2"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={addVerbindung}
            disabled={formBusy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {formBusy ? 'Speichere…' : 'Hinzufügen'}
          </button>
          {formMsg && <span className="ml-3 text-sm">{formMsg}</span>}
        </div>
      </section>

      {/* === Liste vorhandener Verbindungen === */}
      <section className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Vorhandene Verbindungen</h2>
        {loadingList ? (
          <p className="text-gray-600">Lade…</p>
        ) : verbindungen.length === 0 ? (
          <p className="text-gray-600">Keine Verbindungen vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {verbindungen.map(v => (
              <div key={v.id} className="border rounded p-3 flex justify-between items-center">
                <div className="text-sm">
                  <div className="font-semibold">{v.linie} – {v.abfahrt}</div>
                  <div className="text-gray-600">ab {v.haltestelle} · Limit: {v.limit}</div>
                </div>
                <button
                  onClick={() => deleteVerbindung(v.id)}
                  className="text-red-600 hover:underline"
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
