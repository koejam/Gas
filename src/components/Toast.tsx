import { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; kind: 'success' | 'error'; message: string };

const ToastCtx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-2 text-sm shadow ${
              t.kind === 'success' ? 'bg-emerald-500 text-slate-900' : 'bg-red-500 text-white'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
