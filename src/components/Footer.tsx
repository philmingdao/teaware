'use client';
import { useLanguage } from './LanguageProvider';
import Link from '@/components/LocaleLink';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-[#1a1a1a] dark:bg-[#0a0908] text-[#faf9f7] mt-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <h3 className="text-2xl tracking-wider mb-4">{t('brand')}</h3>
            <p className="text-sm text-[#a0a0a0] leading-relaxed">
              {t('siteTitle')}<br />
              {t('tagline')}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm tracking-widest text-[#b8956c] dark:text-[#d4b896] mb-4">{t('nav')}</h4>
            <nav className="flex flex-col gap-3">
              <Link 
                href="/" 
                className="text-sm text-[#a0a0a0] hover:text-[#faf9f7] transition-colors"
              >
                {t('home')}
              </Link>
              <Link 
                href="/gallery" 
                className="text-sm text-[#a0a0a0] hover:text-[#faf9f7] transition-colors"
              >
                {t('gallery')}
              </Link>
              <Link 
                href="/about" 
                className="text-sm text-[#a0a0a0] hover:text-[#faf9f7] transition-colors"
              >
                {t('about')}
              </Link>
            </nav>
          </div>

          {/* Credits */}
          <div>
            <h4 className="text-sm tracking-widest text-[#b8956c] dark:text-[#d4b896] mb-4">{t('credits')}</h4>
            <div className="text-sm text-[#a0a0a0] leading-relaxed space-y-2">
              <p>
                <a href="https://new.artsmia.org/copyright-and-image-access" target="_blank" rel="noopener noreferrer" className="hover:text-[#faf9f7] transition-colors">Minneapolis Institute of Art</a>
                <br />
                <span className="text-xs">Public Domain / CC0 Metadata</span>
              </p>
              <p>
                <a 
                  href="https://www.metmuseum.org/about-the-met/policies-and-documents/open-access" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-[#faf9f7] transition-colors"
                >
                  The Metropolitan Museum of Art
                </a>
                <br />
                <span className="text-xs">Open Access / CC0</span>
              </p>
              <p>
                <a 
                  href="https://www.clevelandart.org/open-access" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-[#faf9f7] transition-colors"
                >
                  Cleveland Museum of Art
                </a>
                <br />
                <span className="text-xs">Open Access / CC0</span>
              </p>
            </div>
          </div>
        </div>

        <div className="divider-elegant !bg-[#3d3d3d] !my-12"></div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#666]">
          <p>
            {t('licenseNote')}
          </p>
          <p className="font-serif-en">
            © 2026 {t('siteTitle')}
          </p>
        </div>
      </div>
    </footer>
  );
}
