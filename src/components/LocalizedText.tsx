'use client';
import { useLanguage } from './LanguageProvider';
import type { MessageKey } from '@/lib/i18n';
export default function LocalizedText({ id, values }: { id: MessageKey; values?: Record<string, string | number> }) {
  const { t } = useLanguage();
  return t(id, values);
}
