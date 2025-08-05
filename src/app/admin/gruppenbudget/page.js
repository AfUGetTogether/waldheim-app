'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid'; // Importiere UUID für neue Einträge

export default function GruppenbudgetAdmin() {
  const [users, setUsers] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [newBudgets, setNewBudgets] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const emails = [];
    for (let i = 1; i <= 18; i++) {
      emails.push(`${i}@wh.de`);
    }
    emails.push('wtv@wh.de');

    setUsers(emails);

    const { data, error } = await supabase.from('gruppenbudgets').select('*');
    if (!error && data) {
      const budgetMap = {};
      data.forEach((entry) => {
        budgetMap[entry.user_email] = entry.budget;
      });
      setBudgets(budgetMap);
    }
  };

  const handleSave = async (userEmail) => {
    const value = newBudgets[userEmail];
    if (!value) {
      setMessage({ type: 'error', text: 'Bitte einen Betrag eingeben.' });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('gruppenbudgets')
      .upsert({
        id: uuidv4(), // ID wird bei neuen Einträgen immer gesetzt!
        user_email: userEmail,
        budget: parseFloat(value),
      }, { onConflict: ['user_email'] });

    if (error) {
      setMessage({ type: 'error', text: 'Fehler beim Speichern: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Budget erfolgreich gespeichert!' });
      fetchData();
      setNewBudgets(prev => ({ ...prev, [userEmail]: '' }));
    }

    setLoading(false);

    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <main className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-emerald-700">💶 Gruppenbudgets verwalten</h1>

      {message && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded shadow-lg font-semibold z-50 text-center ${
          message.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {users.length === 0 ? (
          <p className="text-gray-600">Keine Nutzer gefunden.</p>
        ) : (
          users.map((userEmail) => (
            <div key={userEmail} className="bg-gray-50 p-4 rounded shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="font-semibold">
                  {userEmail === 'wtv@wh.de' ? 'WTV' : `Gruppe ${userEmail.split('@')[0]}`}
                </div>
                <div className="text-gray-600 text-sm">
                  Aktuelles Budget: {budgets[userEmail]?.toFixed(2) ?? '0.00'} €
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={newBudgets[userEmail] || ''}
                  onChange={(e) => setNewBudgets(prev => ({ ...prev, [userEmail]: e.target.value }))}
                  placeholder="Neues Budget (€)"
                  className="border p-2 rounded w-32"
                />
                <button
                  onClick={() => handleSave(userEmail)}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  Speichern
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
