'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PasswortAendernPage() {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handlePasswordChange = async () => {
    setError('');

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setError('Fehler beim Laden der Nutzerdaten.');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError('Fehler beim Aktualisieren des Passworts: ' + updateError.message);
      return;
    }

    // Flag in user_flags auf false setzen
    const { error: flagError } = await supabase
      .from('user_flags')
      .update({ must_change_password: false })
      .eq('user_email', user.email);

    if (flagError) {
      setError('Fehler beim Aktualisieren der Passwort-Status-Flagge: ' + flagError.message);
      return;
    }

    alert('Passwort erfolgreich geändert!');
    router.push('/');
  };

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Passwort ändern</h1>

      <div className="flex flex-col gap-4">
        <input
          type="password"
          placeholder="Neues Passwort eingeben"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="p-2 border rounded"
        />
        {error && <p className="text-red-600">{error}</p>}
        <button
          onClick={handlePasswordChange}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
        >
          Passwort speichern
        </button>
      </div>
    </main>
  );
}
