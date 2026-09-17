'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type Toast = { id: number; message: string };

const ToastContext = createContext<(message: string) => void>(() => {});

/** `const toast = useToast(); toast("Couldn't save. Check your connection.")` */
export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string) => {
    const id = (nextId.current += 1);
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
          role="status"
          aria-live="polite"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="max-w-[24rem] rounded-xl bg-ink px-4 py-2.5 text-[15px] text-canvas shadow-lg"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext>
  );
}
