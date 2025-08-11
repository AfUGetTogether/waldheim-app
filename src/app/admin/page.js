'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;
      if (currentUser?.email !== 'admin@wh.de') {
        router.push('/');
      } else {
        setUser(currentUser);
      }
    };

    getUser();
  }, [router]);

  const resetAllUsers = async () => {
    if (!confirm('Bist du sicher, dass du ALLE Nutzer zurücksetzen möchtest? Das löscht auch alle Mitglieder!')) {
      return;
    }

    setLoading(true);

    try {
      const { error: deleteMembersError } = await supabase
        .from('members')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      if (deleteMembersError) {
        throw new Error('Fehler beim Löschen der Mitglieder: ' + deleteMembersError.message);
      }

      const emails = [];
      for (let i = 1; i <= 18; i++) {
        emails.push(`${i}@wh.de`);
      }
      emails.push('wtv@wh.de');

      for (const email of emails) {
        const { error: flagError } = await supabase
          .from('user_flags')
          .upsert({
            user_email: email,
            must_change_password: true,
          }, { onConflict: ['user_email'] });

        if (flagError) {
          console.error(`Fehler beim Setzen des Passwort-Flags für ${email}:`, flagError.message);
        }
      }

      alert('Alle Nutzer wurden erfolgreich zurückgesetzt! Die Nutzer müssen beim nächsten Login ihr Passwort ändern.');
      router.push('/');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null; // solange der User noch geladen wird, nichts anzeigen

  return (
    <main className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-emerald-700 mb-8 text-center">Adminbereich</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <Link href="/admin/platzverwaltung" className="block bg-white p-6 rounded-2xl shadow hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">📋 Platzverwaltung</h2>
          <p className="text-gray-600">Plätze und Zeitfenster verwalten</p>
        </Link>

        <Link href="/admin/buchungen" className="block bg-white p-6 rounded-2xl shadow hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">📆 Buchungen</h2>
          <p className="text-gray-600">Wer hat wann welchen Platz?</p>
        </Link>

        <Link href="/admin/gruppenbudget" className="block bg-white p-6 rounded-2xl shadow hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">💰 Gruppenbudget</h2>
          <p className="text-gray-600">Budgets der Gruppen verwalten</p>
        </Link>

        <Link href="/admin/mittagessen" className="block bg-white p-6 rounded-2xl shadow hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">🍽️ Mittagessen</h2>
          <p className="text-gray-600">Tagesgerichte einpflegen</p>
        </Link>

        <Link href="/admin/ausfluege" className="block bg-white p-6 rounded-2xl shadow hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">🚌 Ausflugsverbindungen</h2>
          <p className="text-gray-600">Verbindungen für Ausflüge verwalten</p>
        </Link>

        <Link href="/admin/limit" className="block bg-white p-6 rounded-2xl shadow hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">🔧 Buchungslimit</h2>
          <p className="text-gray-600">Wöchentliche Buchungsanzahl pro Gruppe festlegen</p>
        </Link>
      </div>

      <div className="bg-red-50 border border-red-300 p-6 rounded-lg">
        <h2 className="text-lg font-bold text-red-600 mb-4">⚠️ Alle Nutzer zurücksetzen</h2>
        <button
          onClick={resetAllUsers}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition"
        >
          {loading ? 'Zurücksetzen läuft...' : 'Alle Nutzer zurücksetzen'}
        </button>
      </div>
    </main>
  );
}
