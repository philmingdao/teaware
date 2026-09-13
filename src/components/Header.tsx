'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import DarkModeToggle from './DarkModeToggle';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-[#faf9f7]/95 dark:bg-[#0f0f0e]/95 backdrop-blur-sm shadow-sm dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]' 
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-3 group"
          >
            <span className="text-2xl tracking-wider font-medium text-[#1a1a1a] dark:text-[#e8e6e3] group-hover:text-[#b8956c] dark:group-hover:text-[#d4b896] transition-colors">
              器 · 茶
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="/" 
              className="text-sm tracking-widest text-[#3d3d3d] dark:text-[#c5c3bf] hover:text-[#1a1a1a] dark:hover:text-[#e8e6e3] transition-colors link-elegant"
            >
              展览
            </Link>
            <Link 
              href="/gallery" 
              className="text-sm tracking-widest text-[#3d3d3d] dark:text-[#c5c3bf] hover:text-[#1a1a1a] dark:hover:text-[#e8e6e3] transition-colors link-elegant"
            >
              藏品
            </Link>
            <Link 
              href="/about" 
              className="text-sm tracking-widest text-[#3d3d3d] dark:text-[#c5c3bf] hover:text-[#1a1a1a] dark:hover:text-[#e8e6e3] transition-colors link-elegant"
            >
              关于
            </Link>
            <div className="w-px h-4 bg-[#ebe8e1] dark:bg-[#252320]" />
            <DarkModeToggle />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <DarkModeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#1a1a1a] dark:text-[#e8e6e3]"
              aria-label="Toggle menu"
            >
              <svg 
                className="w-6 h-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                ) : (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-[#ebe8e1] dark:border-[#252320]">
            <div className="flex flex-col gap-4">
              <Link 
                href="/" 
                className="text-sm tracking-widest text-[#3d3d3d] dark:text-[#c5c3bf] py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                展览
              </Link>
              <Link 
                href="/gallery" 
                className="text-sm tracking-widest text-[#3d3d3d] dark:text-[#c5c3bf] py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                藏品
              </Link>
              <Link 
                href="/about" 
                className="text-sm tracking-widest text-[#3d3d3d] dark:text-[#c5c3bf] py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                关于
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
