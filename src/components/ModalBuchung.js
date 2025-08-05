// src/components/ModalBuchung.js
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export function ModalBuchung({ isOpen, onClose, platz, tag, user, refreshBuchungen }) {
  const [startzeit, setStartzeit] = useState('');
  const [endzeit, setEndzeit] = useState('');
  const router = useRouter();

  if (!isOpen) return null;

  const handleBuchung = async (e) => {
    e.preventDefault();

    if (!startzeit || !endzeit) {
      alert('Bitte Start- und Endzeit eingeben.');
      return;
    }

    const startDateTime = new Date(`${tag}T${startzeit}`);
    const endDateTime = new Date(`${tag}T${endzeit}`);

    if (startDateTime >= endDateTime) {
      alert('Endzeit muss nach Startzeit liegen.');
      return;
    }

    // 1. Bestehende Buchungen des Nutzers für die Woche zählen
    const { data: bestehendeBuchungen, error: fetchError } = await supabase
      .from('buchungen')
      .select('*')
      .eq('user_email', user.email)
      .gte('datum', getMonday(tag))
      .lte('datum', getFriday(tag));

    if (fetchError) {
      alert('Fehler beim Prüfen der bestehenden Buchungen: ' + fetchError.message);
      return;
    }

    if (bestehendeBuchungen.filter(b => !isPastBooking(b)).length >= 3) {
      alert('Du hast bereits 3 aktive Buchungen in dieser Woche.');
      return;
    }

    // 2. Neue Buchung speichern
    const { error } = await supabase.from('buchungen').insert([
      {
        platz_id: platz.id,
        datum: tag,
        startzeit: startDateTime.toISOString(),
        endzeit: endDateTime.toISOString(),
        user_email: user.email,
      }
    ]);

    if (error) {
      alert('Fehler beim Speichern der Buchung: ' + error.message);
    } else {
      alert('Buchung erfolgreich!');
      refreshBuchungen();
      onClose();
    }
  };

  const getMonday = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const getFriday = (dateStr) => {
    const monday = new Date(getMonday(dateStr));
    monday.setDate(monday.getDate() + 4);
    return monday.toISOString().split('T')[0];
  };

  const isPastBooking = (buchung) => {
    return new Date(buchung.datum) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-80">
        <h2 className="text-lg font-bold mb-4">Buchung für {platz.name} am {new Date(tag).toLocaleDateString('de-DE')}</h2>
        <form onSubmit={handleBuchung} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium">Startzeit</label>
            <input
              type="time"
              value={startzeit}
              onChange={(e) => setStartzeit(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Endzeit</label>
            <input
              type="time"
              value={endzeit}
              onChange={(e) => setEndzeit(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
              Abbrechen
            </button>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded">
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
