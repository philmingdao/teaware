'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowsIn, ArrowsOut } from '@phosphor-icons/react';
import { useLanguage } from './LanguageProvider';

export default function TVFullscreenButton() {
  const { t } = useLanguage();
  const [active, setActive] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<'fullscreenUnsupported' | 'fullscreenError' | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const owned = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const synchronize = () => {
      setActive(document.fullscreenElement === document.documentElement);
      if (!document.fullscreenElement) owned.current = false;
    };
    document.addEventListener('fullscreenchange', synchronize);
    synchronize();
    return () => {
      mounted.current = false;
      document.removeEventListener('fullscreenchange', synchronize);
      if (owned.current && document.fullscreenElement === document.documentElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const toggle = async () => {
    if (busy.current) return;
    setMessage(null);
    if (!document.documentElement.requestFullscreen || !document.exitFullscreen || !document.fullscreenEnabled) {
      setMessage('fullscreenUnsupported');
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        // Invoke directly in the click handler to preserve browser user activation.
        owned.current = true;
        await document.documentElement.requestFullscreen();
        // Navigation can unmount the TV player while the browser request is pending.
        if (!mounted.current && document.fullscreenElement === document.documentElement) {
          await document.exitFullscreen();
        }
      }
    } catch {
      if (!document.fullscreenElement) owned.current = false;
      if (mounted.current) setMessage('fullscreenError');
    } finally {
      busy.current = false;
      if (mounted.current) {
        setPending(false);
        setActive(document.fullscreenElement === document.documentElement);
      }
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={active}
        aria-label={t(active ? 'exitFullscreen' : 'enterFullscreen')}
        title={t(active ? 'exitFullscreen' : 'enterFullscreen')}
        className="inline-flex min-h-11 items-center gap-2 text-white/70 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4b896] disabled:opacity-50"
      >
        {active ? <ArrowsIn size={20} weight="light" /> : <ArrowsOut size={20} weight="light" />}
        <span className="text-sm">{t(active ? 'exitFullscreen' : 'enterFullscreen')}</span>
      </button>
      <p role="status" className={message ? 'absolute right-0 top-full z-10 mt-2 w-64 rounded border border-white/20 bg-[#151310] p-3 text-sm leading-relaxed text-white/85' : 'sr-only'}>
        {message ? t(message) : ''}
      </p>
    </div>
  );
}
