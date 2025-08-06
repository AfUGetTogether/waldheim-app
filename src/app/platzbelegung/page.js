// src/app/platzbelegung/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ModalBuchung } from '@/components/ModalBuchung';

export default function PlatzbelegungPage() {
  const [plaetze, setPlaetze] = useState([]);
  const [zeitfenster, setZeitfenster] = useState([]);
  const [buchungen, setBuchungen] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedPlatz, setSelectedPlatz] = useState(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [buchungslimit, setBuchungslimit] = useState(6); // Defaultwert als Fallback

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const { data: plaetzeData } = await supabase.from('plaetze').select('*').order('name', { ascending: true });
      setPlaetze(plaetzeData || []);

      const { data: zeitfensterData } = await supabase.from('zeitfenster').select('*');
      setZeitfenster(zeitfensterData || []);

      const { data: buchungenData } = await supabase.from('buchungen').select('*');
      setBuchungen(buchungenData || []);

      const { data: einstellung } = await supabase.from('einstellungen').select('value').eq('key', 'buchungslimit').maybeSingle();
      if (einstellung?.value) {
        setBuchungslimit(Number(einstellung.value));
      }
    };

    fetchData();
  }, []);

  const refreshBuchungen = async () => {
    const { data: buchungenData } = await supabase.from('buchungen').select('*');
    setBuchungen(buchungenData || []);
  };

  const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

  const getCurrentWeekDates = () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (now.getDay() + 6) % 7);
    return [...Array(5)].map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  };

  const weekDates = getCurrentWeekDates();

  const openModal = (platz, tag) => {
    setSelectedPlatz(platz);
    setSelectedTag(tag);
  };

  const closeModal = () => {
    setSelectedPlatz(null);
    setSelectedTag('');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSlots = (platzId, dateStr) => {
    const fenster = zeitfenster.filter(z => z.platz_id === platzId);
    const buchungenPlatz = buchungen.filter(b => b.platz_id === platzId && b.datum === dateStr);

    let slots = [];
    fenster.forEach(window => {
      const fensterStart = new Date(`${dateStr}T${window.startzeit}`);
      const fensterEnd = new Date(`${dateStr}T${window.endzeit}`);

      let freeTimes = [{ start: fensterStart, end: fensterEnd }];

      buchungenPlatz.forEach(buchung => {
        const bStart = new Date(buchung.startzeit);
        const bEnd = new Date(buchung.endzeit);

        freeTimes = freeTimes.flatMap(interval => {
          if (bEnd <= interval.start || bStart >= interval.end) {
            return [interval];
          }
          let parts = [];
          if (bStart > interval.start) parts.push({ start: interval.start, end: bStart });
          if (bEnd < interval.end) parts.push({ start: bEnd, end: interval.end });
          return parts;
        });

        slots.push({
          start: bStart,
          end: bEnd,
          type: 'booked',
          user: buchung.user_email.split('@')[0]
        });
      });

      freeTimes.forEach(interval => {
        slots.push({
          start: interval.start,
          end: interval.end,
          type: 'free'
        });
      });
    });

    return slots.sort((a, b) => a.start - b.start);
  };

  return (
    <main className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Platzbelegung</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr>
              <th className="border px-4 py-2">Platz</th>
              {weekDates.map((date, index) => (
                <th key={index} className="border px-4 py-2 text-center">
                  {weekdays[index]}<br />{date.toLocaleDateString('de-DE')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plaetze.map((platz) => (
              <tr key={platz.id}>
                <td className="border px-4 py-2 font-semibold">{platz.name}</td>
                {weekDates.map((date, index) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const slots = getSlots(platz.id, dateStr);
                  return (
                    <td
                      key={index}
                      className="border px-2 py-4 relative min-w-[150px]"
                    >
                      {slots.length === 0 ? (
                        <div className="text-gray-400 text-sm">Kein Zeitfenster</div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {slots.map((slot, idx) => (
                            <div
                              key={idx}
                              onClick={() => slot.type === 'free' && user && openModal(platz, dateStr)}
                              className={`${slot.type === 'booked' ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} rounded px-1 py-0.5 text-xs text-center cursor-pointer`}
                            >
                              {formatTime(slot.start)}-{formatTime(slot.end)}
                              {slot.type === 'booked' && <div>({slot.user})</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPlatz && selectedTag && (
        <ModalBuchung
          isOpen={true}
          onClose={closeModal}
          platz={selectedPlatz}
          tag={selectedTag}
          user={user}
          refreshBuchungen={refreshBuchungen}
          buchungslimit={buchungslimit}
        />
      )}
    </main>
  );
}
