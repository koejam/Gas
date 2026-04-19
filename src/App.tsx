import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { BottomNav } from './components/BottomNav';
import { Add } from './pages/Add';
import { History } from './pages/History';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="h-full flex items-center justify-center text-slate-400">Loading…</div>;
  if (session === null) return <LoginScreen />;

  return (
    <div className="h-full flex flex-col">
      <main className="flex-1 overflow-y-auto pb-16">
        <Routes>
          <Route path="/" element={<Add />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
