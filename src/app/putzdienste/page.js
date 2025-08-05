'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { PutzdiensteUpload } from '@/components/PutzdiensteUpload';

export default function PutzdienstePage() {
  const [dienste, setDienste] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const { data, error } = await supabase
        .from('putzdienste')
        .select('*')
        .order('ort', { ascending: true });
        
      if (error) {
        console.error('Fehler beim Laden der Putzdienste:', error.message);
      } else {
        setDienste(data || []);
      }
    };

    fetchData();
  }, []);

  const isAdmin = user?.email === 'admin@wh.de';

  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-emerald-700">
        Putzdienste
      </h1>

      {/* Upload nur für Admin */}
      {isAdmin && <PutzdiensteUpload />}

      {/* Liste der Putzdienste */}
      {dienste.length === 0 ? (
        <p className="text-gray-600">Noch keine Putzdienste eingetragen.</p>
      ) : (
        <div className="space-y-6">
          {dienste.map((dienst) => (
            <div key={dienst.id} className="bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition">
              <h2 className="text-xl font-semibold mb-2">{dienst.ort}</h2>

              {/* Beschreibung falls vorhanden */}
              {dienst.beschreibung && (
                <ul className="list-disc list-inside text-gray-600 mb-2">
                  {dienst.beschreibung.split(/\r?\n/).map((punkt, index) => (
                    <li key={index}>{punkt}</li>
                  ))}
                </ul>
              )}

              {/* Mitglieder */}
              <ul className="list-disc list-inside text-gray-800 font-semibold">
                {dienst.mitglieder.map((name, index) => (
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
