'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLanguage } from './LanguageProvider';
import { contactText } from '@/lib/contact-i18n';
import { contactLimits, contactEndpoint, safeContactEndpoint, validateContact, type ContactField } from '@/lib/contact';

export default function ContactContent() {
  const { locale } = useLanguage();
  const text = (key: Parameters<typeof contactText>[1]) => contactText(locale, key);
  const endpoint = safeContactEndpoint(process.env.NEXT_PUBLIC_CONTACT_ENDPOINT || contactEndpoint);
  const [status, setStatus] = useState<'idle' | 'sending' | 'invalid' | 'failure'>('idle');
  const [invalidFields, setInvalidFields] = useState<ContactField[]>([]);
  const inFlight = useRef(false);
  const fieldErrors = { name: text('invalidName'), email: text('invalidEmail'), message: text('invalidMessage') };
  const inputClass = 'w-full mt-2 border border-[#a8a39b] dark:border-[#77716a] bg-[#faf9f7] dark:bg-[#171614] rounded-sm px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8956c]';

  useEffect(() => {
    const resume = () => { inFlight.current = false; setStatus('idle'); };
    window.addEventListener('pageshow', resume);
    return () => window.removeEventListener('pageshow', resume);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!endpoint || inFlight.current) { event.preventDefault(); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    const fields = { name: String(data.get('name') || '').trim(), email: String(data.get('email') || '').trim(), message: String(data.get('message') || '').trim() };
    const invalid = validateContact(fields);
    setInvalidFields(invalid);
    if (invalid.length) {
      event.preventDefault(); setStatus('invalid');
      (form.elements.namedItem(invalid[0]) as HTMLInputElement | HTMLTextAreaElement)?.focus();
      return;
    }
    if (data.get('_honey')) { event.preventDefault(); setStatus('failure'); return; }
    // Native POST keeps FormSubmit's server-side Google reCAPTCHA enabled.
    inFlight.current = true;
    setStatus('sending');
  }

  return <>
    <section className="pt-32 pb-12 bg-[#f5f3ef] dark:bg-[#171614] text-center px-6">
      <h1 className="text-4xl md:text-5xl leading-tight">{text('title')}</h1>
      <p className="max-w-2xl mx-auto mt-5 text-[#666] dark:text-[#9a9894]">{text('intro')}</p>
    </section>
    <section className="py-16 bg-[#faf9f7] dark:bg-[#0f0f0e]">
      <div className="max-w-2xl mx-auto px-6 text-[#3d3d3d] dark:text-[#c5c3bf] leading-relaxed">
        {!endpoint && <p role="status" className="mb-6">{text('unavailable')}</p>}
        <p id="contact-required" className="text-sm mb-6">{text('required')}</p>
        <form action={endpoint} method="POST" onSubmit={handleSubmit} aria-describedby="contact-required contact-privacy contact-next" aria-busy={status === 'sending'} onChange={event => {
          const target = event.target;
          if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
          const field = target.name;
          setInvalidFields(current => current.filter(name => name !== field));
          if (!inFlight.current) setStatus('idle');
        }}>
          <fieldset disabled={!endpoint} className="space-y-6">
            {(['name', 'email'] as const).map(field => <div key={field}>
              <label htmlFor={`contact-${field}`} className="block">{text(field)}</label>
              <input id={`contact-${field}`} name={field} type={field === 'email' ? 'email' : 'text'} autoComplete={field} maxLength={contactLimits[field]} required aria-invalid={invalidFields.includes(field)} aria-describedby={invalidFields.includes(field) ? `contact-${field}-error` : undefined} className={inputClass} />
              {invalidFields.includes(field) && <p id={`contact-${field}-error`} className="text-sm mt-2">{fieldErrors[field]}</p>}
            </div>)}
            <div>
              <label htmlFor="contact-message" className="block">{text('message')}</label>
              <textarea id="contact-message" name="message" rows={7} minLength={contactLimits.messageMin} maxLength={contactLimits.messageMax} required aria-invalid={invalidFields.includes('message')} aria-describedby={`contact-message-hint${invalidFields.includes('message') ? ' contact-message-error' : ''}`} className={inputClass} />
              <p id="contact-message-hint" className="text-sm mt-2">{text('hint')}</p>
              {invalidFields.includes('message') && <p id="contact-message-error" className="text-sm mt-2">{fieldErrors.message}</p>}
            </div>
            <div hidden aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="_honey" tabIndex={-1} autoComplete="off" /></div>
            <input type="hidden" name="_subject" value="Teaware — Contact message" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" disabled={status === 'sending'} className="btn-elegant disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b8956c]">{text(status === 'sending' ? 'sending' : 'submit')}</button>
          </fieldset>
          <p role={status === 'failure' || status === 'invalid' ? 'alert' : 'status'} aria-live="polite" className="mt-6 min-h-6">{status !== 'idle' && text(status === 'invalid' ? 'invalid' : status === 'failure' ? 'failure' : 'sending')}</p>
          <p id="contact-next" className="text-sm mt-4">{text('next')}</p>
          <p id="contact-privacy" className="text-sm mt-6 text-[#666] dark:text-[#9a9894]">{text('privacy')}</p>
          <p className="flex flex-wrap gap-4 mt-3 text-sm">
            <a href="https://formsubmit.co/privacy.pdf" className="underline underline-offset-4">{text('formPrivacy')}</a>
            <a href="https://policies.google.com/privacy" className="underline underline-offset-4">{text('googlePrivacy')}</a>
            <a href="https://policies.google.com/terms" className="underline underline-offset-4">{text('googleTerms')}</a>
          </p>
        </form>
      </div>
    </section>
  </>;
}
