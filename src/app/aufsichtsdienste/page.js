'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AufsichtsdiensteUpload } from '@/components/AufsichtsdiensteUpload';

export default function AufsichtsdienstePage() {
  const [aufsichten, setAufsichten] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const { data, error } = await supabase
        .from('aufsichtsdienste')
        .select('*')
        .order('ort', { ascending: true });

      if (error) {
        console.error('Fehler beim Laden der Aufsichtsdienste:', error.message);
      } else {
        setAufsichten(data || []);
      }
    };

    fetchData();
  }, []);

  const isAdmin = user?.email === 'admin@wh.de';

  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-emerald-700">
        Aufsichtsdienste
      </h1>

      {/* Upload nur für Admin */}
      {isAdmin && <AufsichtsdiensteUpload />}

      {/* Liste der Aufsichtsdienste */}
      {aufsichten.length === 0 ? (
        <p className="text-gray-600">Noch keine Aufsichtsdienste eingetragen.</p>
      ) : (
        <div className="space-y-6">
          {aufsichten.map((aufsicht) => (
            <div key={aufsicht.id} className="bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition">
              <h2 className="text-xl font-semibold mb-2">{aufsicht.ort}</h2>
              <ul className="list-disc list-inside text-gray-800 font-semibold">
                {aufsicht.mitglieder.map((name, index) => (
                  <li key={index}>{name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
