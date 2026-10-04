import type { Metadata } from 'next';
import ContactContent from '@/components/ContactContent';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { FULL_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: '联系 Phil',
  description: '联系 Teaware，分享茶器展览意见、资料更正与博物馆资源建议。',
  alternates: { canonical: `${FULL_URL}/contact/` },
};

export default function ContactPage() {
  return <main className="flex-1"><Header /><ContactContent /><Footer /></main>;
}
