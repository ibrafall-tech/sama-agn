"use client";
import { useEffect, useState } from "react";

const EVENT = "midi:toast";

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const on = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      setMsg({ text, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
      clearTimeout(timer);
    };
  }, []);
  return (
    <div aria-live="polite" role="status">
      {msg && (
        <div className="toast" key={msg.id}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
