'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function EinstellungenPage() {
  const [members, setMembers] = useState([
    { name: '', phone: '' },
    { name: '', phone: '' },
    { name: '', phone: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUserAndMembers = async () => {
      const { data: { session } = {} } = await supabase.auth.getSession();
      const currentUser = session?.user;
      setUser(currentUser);

      if (currentUser) {
        const { data, error } = await supabase
          .from('members')
          .select('members')
          .eq('group_email', currentUser.email)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Fehler beim Laden:', error.message);
        } else if (data && data.members) {
          setMembers(data.members);
        }
      }
    };

    getUserAndMembers();
  }, []);

  const addMember = () => {
    setMembers([...members, { name: '', phone: '' }]);
  };

  const handleMemberChange = (index, field, value) => {
    const updatedMembers = [...members];
    updatedMembers[index][field] = value;
    setMembers(updatedMembers);
  };

  const handleSave = async () => {
    if (!user) {
      alert('Nicht eingeloggt!');
      return;
    }

    setLoading(true);

    // Zuerst prüfen, ob Eintrag existiert
    const { data: existingData, error: selectError } = await supabase
      .from('members')
      .select('*')
      .eq('group_email', user.email)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      alert('Fehler beim Überprüfen: ' + selectError.message);
      setLoading(false);
      return;
    }

    if (existingData) {
      // Update
      const { error: updateError } = await supabase
        .from('members')
        .update({ members })
        .eq('group_email', user.email);

      if (updateError) {
        alert('Fehler beim Aktualisieren: ' + updateError.message);
      } else {
        alert('Änderungen gespeichert!');
      }
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('members')
        .insert([
          { group_email: user.email, members }
        ]);

      if (insertError) {
        alert('Fehler beim Anlegen: ' + insertError.message);
      } else {
        alert('Mitglieder gespeichert!');
      }
    }

    setLoading(false);
  };

  return (
    <main className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-emerald-700 mb-6">Einstellungen</h1>

      <div className="flex flex-col gap-4">
        {members.map((member, index) => (
          <div key={index} className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              placeholder={`Name Mitglied ${index + 1}`}
              value={member.name}
              onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
              className="flex-1 border rounded p-2"
            />
            <input
            type="tel"
            placeholder="Telefonnummer"
            value={member.phone}
            onChange={(e) => {
                // Nur Zahlen behalten
                const cleanedValue = e.target.value.replace(/\D/g, '');
                handleMemberChange(index, 'phone', cleanedValue);
            }}
            className="flex-1 border rounded p-2"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center my-6">
        <button
          onClick={addMember}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 transition"
        >
          ➕ Weiteres Mitglied hinzufügen
        </button>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-emerald-700 text-white px-6 py-3 rounded font-bold hover:bg-emerald-800 transition disabled:opacity-50"
        >
          {loading ? 'Speichert...' : '💾 Speichern'}
        </button>
      </div>
    </main>
  );
}
