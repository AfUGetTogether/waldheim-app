'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export function MitarbeiterAbmeldungForm({ user }) {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [absenceDate, setAbsenceDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [location, setLocation] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchMembers = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('members')
        .select('members')
        .eq('group_email', user.email); // <-- hier richtig group_email

      if (error) {
        console.error('Fehler beim Laden der Mitglieder:', error.message);
      } else if (data && data.length > 0) {
        const membersList = data[0].members || [];
        setMembers(membersList);
      } else {
        setMembers([]);
      }
    };

    fetchMembers();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedMember || !absenceDate || !fromTime || !toTime || !location) {
      alert('Bitte alle Felder ausfüllen.');
      return;
    }

    const { error } = await supabase.from('absences').insert([
      {
        user_email: user.email,
        type: 'member',
        target: selectedMember,
        date: absenceDate,
        from_datetime: new Date(`${absenceDate}T${fromTime}`),
        to_datetime: new Date(`${absenceDate}T${toTime}`),
        location: location,
      }
    ]);

    if (error) {
      alert('Fehler beim Speichern: ' + error.message);
    } else {
      alert('Mitarbeiter:in erfolgreich abgemeldet!');
      router.refresh();
    }
  };

  if (members.length === 0) {
    return null; // Keine Mitglieder eingetragen
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow-md mt-8">
      <h2 className="text-xl font-bold mb-4">Mitarbeiter:in abwesend melden</h2>

      <div className="flex flex-col gap-4 mb-4">
        <select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Mitglied auswählen</option>
            {members.map((member, index) => (
                <option key={index} value={member.name}>
                    {member.name}
                </option>
            ))}
        </select>
        <input
          type="date"
          value={absenceDate}
          onChange={(e) => setAbsenceDate(e.target.value)}
          className="p-2 border rounded"
          placeholder="Datum"
        />
        <input
          type="time"
          value={fromTime}
          onChange={(e) => setFromTime(e.target.value)}
          className="p-2 border rounded"
          placeholder="Von (Uhrzeit)"
        />
        <input
          type="time"
          value={toTime}
          onChange={(e) => setToTime(e.target.value)}
          className="p-2 border rounded"
          placeholder="Bis (Uhrzeit)"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="p-2 border rounded"
          placeholder="Ort"
        />
      </div>

      <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded">
        Mitarbeiter:in abmelden
      </button>
    </form>
  );
}
