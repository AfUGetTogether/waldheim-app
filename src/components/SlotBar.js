// === src/components/SlotBar.js ===

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export function SlotBar({ zeitfenster, buchungen, user, day, remainingBookings, router }) {
  const [loading, setLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showMembers, setShowMembers] = useState(false);
  const [message, setMessage] = useState(null);

  const bookingsToday = buchungen.filter(b =>
    b.zeitfenster_id === zeitfenster.id &&
    b.datum === day &&
    b.status === 'aktiv'
  );

  const myBooking = bookingsToday.find(b => b.user_email === user?.email);
  const otherBooking = bookingsToday.find(b => b.user_email !== user?.email);

  useEffect(() => {
    if (otherBooking && user) {
      fetchGroupMembers(otherBooking.user_email);
    }
  }, [otherBooking, user]);

  const fetchGroupMembers = async (email) => {
    const { data, error } = await supabase
      .from('members')
      .select('members')
      .eq('group_email', email)
      .maybeSingle();

    if (!error && data?.members) {
      setGroupMembers(data.members);
    }
  };

  const handleBooking = async () => {
    if (remainingBookings <= 0) {
      setMessage('Buchungslimit erreicht');
      return;
    }
    setLoading(true);

    // (Optional) Verfügbarkeit prüfen – schützt vor alter Anzeige
    const { data: clash, error: clashErr } = await supabase
      .from('buchungen')
      .select('id')
      .eq('zeitfenster_id', zeitfenster.id)
      .eq('datum', day)
      .eq('status', 'aktiv')
      .maybeSingle();

    if (!clashErr && clash) {
      setMessage('Slot ist bereits vergeben.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('buchungen').insert([{
      user_email: user.email,
      zeitfenster_id: zeitfenster.id,
      gebucht_am: new Date(),
      datum: day,
      status: 'aktiv',
      von_uhrzeit: zeitfenster.von,
      bis_uhrzeit: zeitfenster.bis,
    }]);

    if (error) {
      // 23505 = unique_violation (falls jemand parallel war)
      if (error.code === '23505') {
        setMessage('Slot gerade vergeben worden.');
      } else {
        setMessage('Fehler beim Buchen');
        console.error(error);
      }
    } else {
      setMessage('Buchung erfolgreich!');
      router.refresh();
    }
    setLoading(false);
  };


  const handleCancel = async (bookingId) => {
    setLoading(true);

    const { error } = await supabase
      .from('buchungen')
      .update({ status: 'storniert', deleted_at: new Date() })
      .eq('id', bookingId);

    if (error) {
      setMessage('Fehler beim Stornieren');
    } else {
      setMessage('Stornierung erfolgreich!');
      router.refresh();
    }

    setLoading(false);
  };

  const isAdmin = user?.email === 'admin@wh.de';

  return (
    <div className="relative bg-gray-100 rounded p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bookingsToday.length > 0 ? '#dc2626' : '#16a34a' }} />
        <div className="font-semibold">
          {format(new Date(`1970-01-01T${zeitfenster.von}`), 'HH:mm')} – {format(new Date(`1970-01-01T${zeitfenster.bis}`), 'HH:mm')}
        </div>
      </div>

      <div className="flex-1 flex justify-end">
        {user ? (
          <>
            {myBooking ? (
              <button onClick={() => handleCancel(myBooking.id)} disabled={loading} className="text-red-600 hover:underline">
                Stornieren
              </button>
            ) : otherBooking ? (
              <>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="text-emerald-700 hover:underline mr-2"
                >
                  {otherBooking.user_email === 'wtv@wh.de'
                    ? 'WTV'
                    : `Gruppe ${otherBooking.user_email.split('@')[0]}`}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleCancel(otherBooking.id)}
                    className="text-red-600 hover:underline"
                  >
                    Als Admin stornieren
                  </button>
                )}
              </>
            ) : (
              <button onClick={handleBooking} disabled={loading || remainingBookings <= 0} className="text-emerald-600 hover:underline">
                Buchen
              </button>
            )}
          </>
        ) : (
          otherBooking && (
            <span className="text-gray-600">
              {otherBooking.user_email === 'wtv@wh.de'
                ? 'WTV'
                : `Gruppe ${otherBooking.user_email.split('@')[0]}`}
            </span>
          )
        )}
      </div>

      {/* Mitgliederliste einblenden */}
      <AnimatePresence>
        {showMembers && groupMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 bg-white p-3 border rounded shadow-md w-60 z-20"
          >
            <ul className="text-sm text-gray-700">
              {groupMembers.map((member, index) => (
                <li key={index} className="mb-2">
                  <span className="font-semibold block">{member.name}</span>
                  <span className="text-xs text-gray-500 block">{member.phone}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Erfolgs- oder Fehlermeldung */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded shadow-md z-50"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
