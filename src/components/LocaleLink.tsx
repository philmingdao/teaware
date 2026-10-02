'use client';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useLanguage } from './LanguageProvider';

export default function LocaleLink(props: ComponentProps<typeof Link>) {
  const { href } = useLanguage();
  return <Link {...props} href={typeof props.href === 'string' ? href(props.href) : props.href} />;
}
