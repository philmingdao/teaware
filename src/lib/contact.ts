export const contactLimits = { name: 80, email: 254, messageMin: 10, messageMax: 5000 };
export type ContactFields = { name: string; email: string; message: string };
export type ContactField = keyof ContactFields;

export function validateContact(fields: ContactFields): ContactField[] {
  const invalid: ContactField[] = [];
  if (!fields.name.trim() || fields.name.trim().length > contactLimits.name) invalid.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()) || fields.email.trim().length > contactLimits.email) invalid.push('email');
  const length = fields.message.trim().length;
  if (length < contactLimits.messageMin || length > contactLimits.messageMax) invalid.push('message');
  return invalid;
}

// Public random FormSubmit endpoint; supplied after recipient activation. No credentials.
export const contactEndpoint = 'https://formsubmit.co/c4300a88eb1487f53859c778eb7dc04f';

export function safeContactEndpoint(value: string | undefined): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'formsubmit.co' || url.username || url.password || url.search || url.hash) return;
    const path = url.pathname.slice(1);
    if (/^[a-zA-Z0-9]{20,128}$/.test(path)) return url.href;
  } catch { /* Never offer submission through an invalid or unconfigured endpoint. */ }
}
