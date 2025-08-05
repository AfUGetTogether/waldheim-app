'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export function PasswordRedirect() {
  const router = useRouter();
  const [userChecked, setUserChecked] = useState(false);

  useEffect(() => {
    const checkMustChangePassword = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      console.log('Session geladen:', session);

      if (!user) {
        console.log('Kein Nutzer eingeloggt.');
        setUserChecked(true);
        return;
      }

      if (user.email === 'admin@wh.de') {
        console.log('Admin eingeloggt – keine Passwortprüfung.');
        setUserChecked(true);
        return;
      }

      const { data, error } = await supabase
        .from('user_flags')
        .select('must_change_password')
        .eq('user_email', user.email)
        .maybeSingle();

      console.log('Antwort von user_flags:', data);
      console.log('Fehler:', error);

      if (error) {
        console.error('Fehler beim Prüfen der Passwortpflicht:', error.message);
        setUserChecked(true);
        return;
      }

      if (data?.must_change_password) {
        console.log('Muss Passwort ändern → Weiterleitung auf /passwort-aendern');
        router.push('/passwort-aendern');
      } else {
        console.log('Passwortänderung NICHT erforderlich.');
        setUserChecked(true);
      }
    };

    checkMustChangePassword();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Session geändert:', session);
      checkMustChangePassword();  // neu prüfen bei Session-Wechsel
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router]);

  if (!userChecked) {
    // Optionale Ladeanzeige während der Prüfung
    return <div>Lade...</div>;
  }

  return null;
}
