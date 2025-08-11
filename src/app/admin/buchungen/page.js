'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, addDays, endOfWeek, isWithinInterval } from 'date-fns';
import de from 'date-fns/locale/de';

const BOOKING_LIMIT = 8;

function emailToGroupName(email) {
  if (!email) return '';
  if (email === 'wtv@wh.de') return 'WTV';
  const m = email.match(/^(\d+)@wh\.de$/);
  if (m) return `Gruppe ${m[1]}`;
  if (email.endsWith('@wh.de')) return email.split('@')[0]; // z.B. rookies@wh.de
  return email;
}

export default function AdminBuchungenPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [buchungen, setBuchungen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // ---- Wochenlogik: ab Sonntag 12:00 Uhr bereits die nächste Woche anzeigen ----
  const now = new Date();
  const showNextWeek = now.getDay() === 0 && now.getHours() >= 12; // Sonntag >= 12:00
  const refDate = showNextWeek ? addDays(now, 1) : now;            // Referenz: Montag der "angezeigten" Woche
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });     // Mo
  const weekEnd = addDays(weekStart, 6);                           // So

  // Schutz: nur Admin darf rein
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      if (!u || u.email !== 'admin@wh.de') {
        router.push('/');
        return;
      }
      setAdmin(u);
    })();
  }, [router]);

  // Daten laden
  useEffect(() => {
    if (!admin) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('buchungen')
        .select(`
          id,
          user_email,
          datum,
          status,
          von_uhrzeit,
          bis_uhrzeit,
          zeitfenster:zeitfenster_id (
            von,
            bis,
            platz:platz_id ( name )
          )
        `)
        .order('datum', { ascending: true });

      if (error) {
        console.error('Fehler beim Laden:', error.message);
      } else {
        setBuchungen(data || []);
      }
      setLoading(false);
    })();
  }, [admin]);

  // aktive Buchungen der "angezeigten" Woche (mit Sonntag-12-Regel) pro Gruppe zählen
  const aktiveDieseWocheByEmail = useMemo(() => {
    const map = new Map();
    for (const b of buchungen) {
      if (b.status !== 'aktiv' || !b.datum) continue;
      const d = new Date(b.datum);
      if (!isWithinInterval(d, { start: weekStart, end: weekEnd })) continue;
      const key = b.user_email;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [buchungen, weekStart, weekEnd]);

  const verbleibendByEmail = useMemo(() => {
    const map = new Map();
    const emails = [...new Set(buchungen.map(b => b.user_email))];
    for (const mail of emails) {
      const used = aktiveDieseWocheByEmail.get(mail) || 0;
      map.set(mail, Math.max(0, BOOKING_LIMIT - used));
    }
    return map;
  }, [buchungen, aktiveDieseWocheByEmail]);

  // Gruppen-Summary (alphabetisch sortiert)
  const gruppenSummary = useMemo(() => {
    const emails = [...new Set(buchungen.map(b => b.user_email))].sort((a, b) =>
      emailToGroupName(a).localeCompare(emailToGroupName(b), 'de')
    );
    return emails.map(mail => ({
      email: mail,
      name: emailToGroupName(mail),
      used: aktiveDieseWocheByEmail.get(mail) || 0,
      left: verbleibendByEmail.get(mail) ?? BOOKING_LIMIT
    }));
  }, [buchungen, aktiveDieseWocheByEmail, verbleibendByEmail]);

  // Liste sortiert: erst Datum, dann Startzeit
  const sichtbareBuchungen = useMemo(() => {
    return (buchungen || [])
      .slice()
      .sort((a, b) => {
        const ad = new Date(a.datum) - new Date(b.datum);
        if (ad !== 0) return ad;
        return (a.von_uhrzeit || a.zeitfenster?.von || '').localeCompare(b.von_uhrzeit || b.zeitfenster?.von || '');
      });
  }, [buchungen]);

  const adminCancel = async (id) => {
    const ok = confirm('Diese Buchung wirklich stornieren?');
    if (!ok) return;
    const { error } = await supabase
      .from('buchungen')
      .update({ status: 'storniert', deleted_at: new Date() })
      .eq('id', id);
    if (error) {
      setToast('❌ Fehler beim Stornieren');
      console.error(error);
    } else {
      setToast('✅ Storniert');
      setBuchungen(prev => prev.map(b => b.id === id ? { ...b, status: 'storniert', deleted_at: new Date().toISOString() } : b));
    }
    setTimeout(() => setToast(null), 2000);
  };

  if (!admin) return null;

  return (
    <main className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-emerald-700 mb-6 text-center">Admin: Buchungsübersicht</h1>

      {/* Wochen-Info (mit Sonntag-12-Regel) */}
      <div className="text-center text-gray-600 mb-4">
        Woche: {format(weekStart, 'dd.MM.yyyy', { locale: de })} – {format(weekEnd, 'dd.MM.yyyy', { locale: de })}
        {' '}· Limit: {BOOKING_LIMIT} / Gruppe
        {showNextWeek && <span className="block text-xs text-gray-500 mt-1">Hinweis: ab So 12:00 Uhr wird bereits die nächste Woche angezeigt</span>}
      </div>

      {/* Gruppen-Summary */}
      <div className="bg-white rounded-xl shadow p-4 mb-8">
        <h2 className="text-lg font-semibold mb-3">Verbleibende Buchungen pro Gruppe (angezeigte Woche)</h2>
        {gruppenSummary.length === 0 ? (
          <p className="text-gray-500">Keine Buchungen vorhanden.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {gruppenSummary.map(g => (
              <div key={g.email} className="border rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-sm text-gray-600">genutzt: {g.used}</div>
                </div>
                <div className="text-emerald-700 font-bold text-lg">{g.left}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buchungen-Tabelle */}
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Alle Buchungen</h2>
        {loading ? (
          <p className="text-gray-500">Lade…</p>
        ) : sichtbareBuchungen.length === 0 ? (
          <p className="text-gray-500">Keine Buchungen gefunden.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="text-left text-gray-700">
                  <th className="p-2">Datum</th>
                  <th className="p-2">Platz</th>
                  <th className="p-2">Uhrzeit</th>
                  <th className="p-2">Gruppe</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {sichtbareBuchungen.map(b => {
                  const platzName = b.zeitfenster?.platz?.name || '—';
                  const von = b.von_uhrzeit || b.zeitfenster?.von || '';
                  const bis = b.bis_uhrzeit || b.zeitfenster?.bis || '';
                  return (
                    <tr key={b.id} className="border-t">
                      <td className="p-2">{b.datum ? format(new Date(b.datum), 'dd.MM.yyyy', { locale: de }) : '—'}</td>
                      <td className="p-2">{platzName}</td>
                      <td className="p-2">{von} – {bis}</td>
                      <td className="p-2">{emailToGroupName(b.user_email)}</td>
                      <td className="p-2">
                        {b.status === 'aktiv'
                          ? <span className="text-emerald-700 font-semibold">aktiv</span>
                          : <span className="text-gray-500">storniert</span>}
                      </td>
                      <td className="p-2 text-right">
                        {b.status === 'aktiv' ? (
                          <button
                            onClick={() => adminCancel(b.id)}
                            className="text-red-600 hover:underline"
                          >
                            Stornieren
                          </button>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded shadow">
          {toast}
        </div>
      )}
    </main>
  );
}
