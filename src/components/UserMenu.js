'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { UserCircle } from 'lucide-react';

export function UserMenu() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

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

  const emailToGroupName = (email) => {
    if (email === 'admin@wh.de') return 'Admin';
    if (email === 'wtv@wh.de') return 'WTV';
    if (email === 'rookies@wh.de') return 'Rookies';
    const match = email.match(/^(\d+)@wh\.de$/);
    if (match) {
      return `Gruppe ${match[1]}`;
    }
    return email;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    setMenuOpen(false);
  };

  const handleSettings = () => {
    router.push('/einstellungen');
    setMenuOpen(false);
  };

  const handleAdmin = () => {
    router.push('/admin');
    setMenuOpen(false);
  };

  const isAdmin = user?.email === 'admin@wh.de';

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center space-x-2 p-2 rounded hover:bg-emerald-100 transition"
      >
        <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
          <UserCircle className="w-6 h-6" />
        </div>
        {user && (
          <span className="hidden md:inline text-sm font-semibold text-emerald-700">
            {emailToGroupName(user.email)}
          </span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg flex flex-col overflow-hidden">
          {user ? (
            <>
              {isAdmin && (
                <button
                  onClick={handleAdmin}
                  className="px-4 py-2 text-left hover:bg-emerald-100"
                >
                  Adminbereich
                </button>
              )}
              <button
                onClick={handleSettings}
                className="px-4 py-2 text-left hover:bg-emerald-100"
              >
                Einstellungen
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-left hover:bg-red-100 text-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-left hover:bg-emerald-100"
            >
              Login
            </button>
          )}
        </div>
      )}
    </div>
  );
}
