'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { MitarbeiterAbmeldungForm } from '@/components/MitarbeiterAbmeldungForm';

export default function AbwesenheitenPage() {
  const [absences, setAbsences] = useState([]);
  const [user, setUser] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [location, setLocation] = useState('');
  const [absenceDate, setAbsenceDate] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const router = useRouter();

  useEffect(() => {
    const fetchAbsences = async () => {
      const { data, error } = await supabase
        .from('absences')
        .select('*')
        .eq('date', today);

      if (error) {
        console.error('Fehler beim Laden der Abwesenheiten:', error.message);
      } else {
        setAbsences(data || []);
      }
    };

    const fetchGroupMembers = async (email) => {
      const { data, error } = await supabase
        .from('members')
        .select('members')
        .eq('group_email', email)
        .maybeSingle();

      if (error) {
        console.error('Fehler beim Laden der Mitglieder:', error.message);
      } else if (data?.members) {
        setGroupMembers(data.members);
      }
    };

    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchGroupMembers(session.user.email);
      }
    };

    fetchAbsences();
    fetchUser();
  }, [today]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fromTime || !toTime || !location || (isPlanning && !absenceDate)) {
      alert('Bitte alle Felder ausfüllen.');
      return;
    }

    setLoading(true);

    const groupName = user ? getGroupNameFromEmail(user.email) : '';
    const dateToSave = isPlanning ? absenceDate : today;

    const { error } = await supabase.from('absences').insert([
      {
        user_email: user.email,
        type: 'group',
        target: groupName,
        date: dateToSave,
        from_datetime: new Date(`${dateToSave}T${fromTime}`),
        to_datetime: new Date(`${dateToSave}T${toTime}`),
        location: location,
      }
    ]);

    if (error) {
      alert('Fehler beim Speichern: ' + error.message);
    } else {
      setSuccessMessage('Abwesenheit erfolgreich gespeichert!');
      setFromTime('');
      setToTime('');
      setLocation('');
      setAbsenceDate('');
      setIsPlanning(false);
      router.refresh();
    }

    setLoading(false);
  };

  const getGroupNameFromEmail = (email) => {
    if (email === 'wtv@wh.de') return 'WTV';
    if (email === 'rookies@wh.de') return 'Rookies';
    const match = email.match(/^(\d+)@wh\.de$/);
    if (match) {
      return `Gruppe ${match[1]}`;
    }
    return '';
  };

  const isLoggedIn = !!user;

  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Erfolgsmeldung */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 text-center">
          {successMessage}
        </div>
      )}

      {/* Abwesende Gruppen */}
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-emerald-700">Abwesende Gruppen</h1>

      {absences.filter(absence => absence.type === 'group').length === 0 ? (
        <p className="text-gray-600 mb-8">Heute sind alle Gruppen anwesend. 🎉</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {absences
            .filter(absence => absence.type === 'group')
            .sort((a, b) => {
              const getSortValue = (name) => {
                if (name === 'WTV') return 100;
                const match = name.match(/\d+/);
                return match ? parseInt(match[0], 10) : 99;
              };
              return getSortValue(a.target) - getSortValue(b.target);
            })
            .map((absence) => (
              <div key={absence.id} className="bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="font-semibold">{absence.target}</span>
                </div>
                <div className="text-sm text-gray-600 mt-2 text-right">
                  <div>
                    {new Date(absence.from_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(absence.to_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>{absence.location}</div>

                  {/* Button "Sind wieder da" */}
                  {isLoggedIn && getGroupNameFromEmail(user?.email) === absence.target && (
                    <button
                      onClick={async () => {
                        const { error } = await supabase.from('absences').delete().eq('id', absence.id);

                        if (error) {
                          alert('Fehler beim Zurückmelden: ' + error.message);
                        } else {
                          setSuccessMessage('Willkommen zurück!');
                          router.refresh();
                        }
                      }}
                      className="mt-2 text-emerald-600 font-semibold hover:underline"
                    >
                      ✅ Sind wieder da!
                    </button>
                  )}
                </div>
              </div>
          ))}
        </div>
      )}

      {/* Abwesende Mitarbeiter:innen */}
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-emerald-700">Abwesende Mitarbeiter:innen</h1>

      {absences.filter(absence => absence.type === 'member').length === 0 ? (
        <p className="text-gray-600 mb-8">Heute sind alle Mitarbeiter:innen anwesend. 🎉</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {absences
            .filter(absence => absence.type === 'member')
            .map((absence) => (
              <div key={absence.id} className="bg-white p-4 rounded-2xl shadow-md hover:shadow-lg transition">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="font-semibold">{absence.target}</span>
                </div>
                <div className="text-sm text-gray-600 mt-2 text-right">
                  <div>
                    {new Date(absence.from_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(absence.to_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>{absence.location}</div>

                  {/* Button "Bin wieder da" */}
                  {isLoggedIn && groupMembers.some((member) => member.name === absence.target) && (
                    <button
                      onClick={async () => {
                        const { error } = await supabase.from('absences').delete().eq('id', absence.id);

                        if (error) {
                          alert('Fehler beim Zurückmelden: ' + error.message);
                        } else {
                          setSuccessMessage('Mitarbeiter:in ist zurück!');
                          router.refresh();
                        }
                      }}
                      className="mt-2 text-emerald-600 font-semibold hover:underline"
                    >
                      ✅ Bin wieder da!
                    </button>
                  )}
                </div>
              </div>
          ))}
        </div>
      )}

      {/* Formular Gruppe abmelden */}
      {isLoggedIn && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4 text-emerald-700">Gruppe abwesend melden</h2>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={isPlanning}
              onChange={(e) => setIsPlanning(e.target.checked)}
            />
            <label>Abwesenheit planen (anderes Datum)</label>
          </div>

          {isPlanning && (
            <input
              type="date"
              value={absenceDate}
              onChange={(e) => setAbsenceDate(e.target.value)}
              className="p-2 border rounded w-full mb-4"
            />
          )}

          <div className="flex flex-col gap-4 mb-4">
            <input
              type="time"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              className="p-2 border rounded"
              placeholder="Von (Uhrzeit)"
            />
            <input
              type="time"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="p-2 border rounded"
              placeholder="Bis (Uhrzeit)"
            />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="p-2 border rounded"
              placeholder="Ort"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? 'Speichern...' : 'Abwesenheit speichern'}
          </button>
        </form>
      )}

      {/* Formular Mitarbeiter:in abmelden */}
      {isLoggedIn && (
        <MitarbeiterAbmeldungForm user={user} />
      )}
    </main>
  );
}
