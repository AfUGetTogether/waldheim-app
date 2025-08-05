'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dashboard } from '@/components/Dashboard';

export default function HomePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-emerald-700">
        Waldheim App
      </h1>

      <div className="flex flex-col items-center mb-8">
        <img src="/logo.png" alt="Waldheim App Logo" className="h-24 w-24 rounded-full mb-4" />
      </div>

      {/* === Hier das Dashboard nur für eingeloggte Nutzer === */}
      {user && <Dashboard user={user} />}

      {/* === Deine Buttons === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link href="/platzbelegung" className="block bg-white p-6 rounded-2xl shadow-md hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">📋 Platzbelegung</h2>
          <p className="text-gray-600">Plätze buchen und Belegungen ansehen.</p>
        </Link>

        <Link href="/abwesenheiten" className="block bg-white p-6 rounded-2xl shadow-md hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">🚦 Abwesenheiten</h2>
          <p className="text-gray-600">Abwesenheitsstatus verwalten und anzeigen.</p>
        </Link>

        <Link href="/putzdienste" className="block bg-white p-6 rounded-2xl shadow-md hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">🧹 Putzdienste</h2>
          <p className="text-gray-600">Wer macht wann den Putzdienst?</p>
        </Link>

        <Link href="/aufsichtsdienste" className="block bg-white p-6 rounded-2xl shadow-md hover:shadow-lg hover:bg-emerald-50 transition">
          <h2 className="text-xl font-semibold mb-2">👮 Aufsichtsdienste</h2>
          <p className="text-gray-600">Aufsichtszeiten im Überblick.</p>
        </Link>
      </div>
    </main>
  );
}
