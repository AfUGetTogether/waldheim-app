'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';

export function Dashboard({ user }) {
  const [budget, setBudget] = useState(null);
  const [mittagessen, setMittagessen] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      // Budget abrufen
      const { data: budgetData } = await supabase
        .from('gruppenbudgets')
        .select('budget')
        .eq('user_email', user.email)
        .maybeSingle();

      if (budgetData) {
        setBudget(budgetData.budget);
      }

      // Mittagessen für heute abrufen
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: essenData } = await supabase
        .from('mittagessen')
        .select('gericht')
        .eq('datum', today)
        .maybeSingle();

      if (essenData) {
        setMittagessen(essenData.gericht);
      }
    };

    fetchData();
  }, [user.email]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 text-emerald-700">Dashboard</h2>

      <div className="flex flex-col gap-4">
        {/* Gruppenbudget */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Aktuelles Gruppenbudget:</span>
          <span className="text-emerald-600 font-bold">
            {budget !== null ? `${budget.toFixed(2)} €` : 'Keine Angabe'}
          </span>
        </div>

        {/* Mittagessen heute */}
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-700">Mittagessen heute:</span>
          <span className="text-emerald-600 font-bold">
            {mittagessen ?? 'Noch nicht eingetragen'}
          </span>
        </div>
      </div>
    </div>
  );
}
