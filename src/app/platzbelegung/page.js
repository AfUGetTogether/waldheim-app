'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SlotBar } from '@/components/SlotBar';
import { addDays, format, startOfWeek } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function PlatzbelegungPage() {
  const [plaetze, setPlaetze] = useState([]);
  const [zeitfenster, setZeitfenster] = useState([]);
  const [buchungen, setBuchungen] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

  // -------- Woche bestimmen: ab Sonntag 12:00 Uhr auf nächste Woche umschalten --------
  const now = new Date();
  const currentMonday = startOfWeek(now, { weekStartsOn: 1 });     // aktueller Montag
  const nextMonday = addDays(currentMonday, 7);                     // nächster Montag
  const sundayNoon = new Date(addDays(nextMonday, -1));             // Sonntag vor nächstem Montag
  sundayNoon.setHours(12, 0, 0, 0);

  // Ab Sonntag 12:00 -> nächste Woche anzeigen
  const baseMonday = now >= sundayNoon ? nextMonday : currentMonday;

  // Wochentage (Mo–Fr) auf Basis baseMonday
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const day = addDays(baseMonday, i);
    return {
      label: format(day, 'dd.MM.'),
      date: format(day, 'yyyy-MM-dd'),
    };
  });

  // String-Grenzen für die "Anzeigewoche" (robust gegen Zeitzonen)
  const weekStartStr = format(baseMonday, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(baseMonday, 7), 'yyyy-MM-dd');

  useEffect(() => {
    const fetchData = async () => {
      const { data: plaetzeData } = await supabase.from('plaetze').select('*').order('name', { ascending: true });
      const { data: zeitfensterData } = await supabase.from('zeitfenster').select('*');
      const { data: buchungenData } = await supabase.from('buchungen').select('*');

      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      setPlaetze(plaetzeData || []);
      setZeitfenster(zeitfensterData || []);
      setBuchungen(buchungenData || []);
    };

    fetchData();
  }, []);

  // Aktive Buchungen des Users in der angezeigten Woche (Limit = 8)
  const userActiveBookings = buchungen.filter(b =>
    b.user_email === user?.email &&
    b.status === 'aktiv' &&
    b.datum &&
    b.datum >= weekStartStr && b.datum < weekEndStr
  );

  const remainingBookings = Math.max(0, 8 - userActiveBookings.length);

  return (
    <main className="p-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-emerald-700">Platzbelegung</h1>

      {user && (
        <div className="text-center mb-8 text-gray-600">
          Noch <span className="font-bold">{remainingBookings}</span> Buchungen frei diese Woche
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-4">
          <thead>
            <tr>
              <th className="p-2 text-left text-gray-700">Platz</th>
              {weekDays.map((day) => (
                <th key={day.date} className="p-2 text-center text-gray-700">{day.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plaetze.map((platz) => (
              <tr key={platz.id} className="bg-white rounded shadow-sm">
                <td className="p-2 font-semibold">{platz.name}</td>
                {weekDays.map((day) => (
                  <td key={day.date} className="p-2 align-top">
                    <div className="flex flex-col gap-2">
                      {zeitfenster
                        .filter(z => z.platz_id === platz.id)
                        .slice()
                        .sort((a, b) => a.von.localeCompare(b.von))
                        .map((zf) => (
                          <SlotBar
                            key={zf.id + '-' + day.date}
                            zeitfenster={zf}
                            buchungen={buchungen}
                            user={user}
                            day={day.date}
                            remainingBookings={remainingBookings}
                            router={router}
                          />
                        ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
