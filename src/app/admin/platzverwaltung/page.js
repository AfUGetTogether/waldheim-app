'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPlatzSeite() {
  const [plaetze, setPlaetze] = useState([]);
  const [platzName, setPlatzName] = useState('');
  const [zeitfensterVon, setZeitfensterVon] = useState('');
  const [zeitfensterBis, setZeitfensterBis] = useState('');
  const [newTimes, setNewTimes] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPlaetze();
  }, []);

  const fetchPlaetze = async () => {
    const { data, error } = await supabase
      .from('plaetze')
      .select('id, name, zeitfenster (id, von, bis)')
      .order('name', { ascending: true });

    if (error) {
      console.error('Fehler beim Laden der Plätze:', error.message);
    } else {
      setPlaetze(data || []);
    }
  };

  const handlePlatzSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const { data: platzData, error: platzError } = await supabase
      .from('plaetze')
      .insert([{ name: platzName }])
      .select()
      .single();

    if (platzError) {
      console.error('Fehler beim Erstellen des Platzes:', platzError.message);
      setErrorMessage(`Fehler beim Erstellen des Platzes: ${platzError.message}`);
      return;
    }

    if (!platzData) {
      setErrorMessage('Der erstellte Platz konnte nicht gefunden werden.');
      return;
    }

    const { error: zeitfensterError } = await supabase
      .from('zeitfenster')
      .insert([
        { platz_id: platzData.id, von: zeitfensterVon, bis: zeitfensterBis }
      ]);

    if (zeitfensterError) {
      console.error('Fehler beim Erstellen des Zeitfensters:', zeitfensterError.message);
      setErrorMessage(`Fehler beim Erstellen des Zeitfensters: ${zeitfensterError.message}`);
      return;
    }

    setSuccessMessage('Platz und Zeitfenster erfolgreich hinzugefügt!');
    setPlatzName('');
    setZeitfensterVon('');
    setZeitfensterBis('');
    fetchPlaetze();
  };

  const deletePlatz = async (platzId) => {
    if (!confirm('Möchtest du diesen Platz wirklich löschen? Alle zugehörigen Zeitfenster werden ebenfalls gelöscht!')) {
      return;
    }
    const { error } = await supabase.from('plaetze').delete().eq('id', platzId);
    if (error) {
      alert('Fehler beim Löschen: ' + error.message);
    } else {
      fetchPlaetze();
    }
  };

  const deleteZeitfenster = async (zeitfensterId) => {
    if (!confirm('Möchtest du dieses Zeitfenster wirklich löschen?')) {
      return;
    }
    const { error } = await supabase.from('zeitfenster').delete().eq('id', zeitfensterId);
    if (error) {
      alert('Fehler beim Löschen des Zeitfensters: ' + error.message);
    } else {
      fetchPlaetze();
    }
  };

  const addNewZeitfenster = async (platzId) => {
    const times = newTimes[platzId];
    if (!times?.von || !times?.bis) {
      alert('Bitte beide Uhrzeiten ausfüllen.');
      return;
    }

    const { error } = await supabase
      .from('zeitfenster')
      .insert([{ platz_id: platzId, von: times.von, bis: times.bis }]);

    if (error) {
      alert('Fehler beim Hinzufügen des Zeitfensters: ' + error.message);
    } else {
      setNewTimes(prev => ({ ...prev, [platzId]: { von: '', bis: '' } }));
      fetchPlaetze();
    }
  };

  return (
    <main className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Platzverwaltung</h1>

      {errorMessage && <div className="text-red-600 mb-4">{errorMessage}</div>}
      {successMessage && <div className="text-green-600 mb-4">{successMessage}</div>}

      <form onSubmit={handlePlatzSubmit} className="bg-white p-6 rounded shadow mb-8">
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

        <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700">
          Platz und Zeitfenster speichern
        </button>
      </form>

      <h2 className="text-xl font-bold mb-4">Vorhandene Plätze</h2>

      <div className="space-y-6">
        {plaetze.map((platz) => (
          <div key={platz.id} className="border p-4 rounded shadow-sm bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">{platz.name}</h3>
              <button
                onClick={() => deletePlatz(platz.id)}
                className="text-red-600 font-semibold hover:underline"
              >
                🗑️ Platz löschen
              </button>
            </div>

            <div className="mt-2">
              <h4 className="text-md font-semibold mb-2">Zeitfenster:</h4>
              {platz.zeitfenster.length === 0 ? (
                <p className="text-gray-600">Keine Zeitfenster hinterlegt.</p>
              ) : (
                <ul className="space-y-2">
                  {platz.zeitfenster.map((zeit) => (
                    <li key={zeit.id} className="flex justify-between items-center">
                      <span>{zeit.von} – {zeit.bis}</span>
                      <button
                        onClick={() => deleteZeitfenster(zeit.id)}
                        className="text-red-500 hover:underline text-sm"
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
              <h4 className="text-md font-semibold mb-2">Neues Zeitfenster hinzufügen:</h4>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newTimes[platz.id]?.von || ''}
                  onChange={(e) => setNewTimes(prev => ({ ...prev, [platz.id]: { ...prev[platz.id], von: e.target.value } }))}
                  className="border p-2 rounded"
                />
                <input
                  type="time"
                  value={newTimes[platz.id]?.bis || ''}
                  onChange={(e) => setNewTimes(prev => ({ ...prev, [platz.id]: { ...prev[platz.id], bis: e.target.value } }))}
                  className="border p-2 rounded"
                />
                <button
                  onClick={() => addNewZeitfenster(platz.id)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 rounded"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
