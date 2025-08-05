'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { SlotBar } from '@/components/SlotBar';
import { addDays, format, startOfWeek, isSameWeek } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function PlatzbelegungPage() {
  const [plaetze, setPlaetze] = useState([]);
  const [zeitfenster, setZeitfenster] = useState([]);
  const [buchungen, setBuchungen] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

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

  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const day = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
    return {
      label: format(day, 'dd.MM.'),
      date: format(day, 'yyyy-MM-dd'),
    };
  });

  const userActiveBookings = buchungen.filter(b =>
    b.user_email === user?.email &&
    b.status === 'aktiv' &&
    b.datum &&
    isSameWeek(new Date(b.datum), new Date(), { weekStartsOn: 1 })
  );

  const remainingBookings = Math.max(0, 6 - userActiveBookings.length);

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
                        .map((zeitfenster) => (
                          <SlotBar
                            key={zeitfenster.id + '-' + day.date}
                            zeitfenster={zeitfenster}
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
