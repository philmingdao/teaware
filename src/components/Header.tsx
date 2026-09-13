'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

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
          ? 'bg-[#faf9f7]/95 backdrop-blur-sm shadow-sm' 
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
            <span className="text-2xl tracking-wider font-medium text-[#1a1a1a] group-hover:text-[#b8956c] transition-colors">
              器 · 茶
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-12">
            <Link 
              href="/" 
              className="text-sm tracking-widest text-[#3d3d3d] hover:text-[#1a1a1a] transition-colors link-elegant"
            >
              展览
            </Link>
            <Link 
              href="/gallery" 
              className="text-sm tracking-widest text-[#3d3d3d] hover:text-[#1a1a1a] transition-colors link-elegant"
            >
              藏品
            </Link>
            <Link 
              href="/about" 
              className="text-sm tracking-widest text-[#3d3d3d] hover:text-[#1a1a1a] transition-colors link-elegant"
            >
              关于
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-[#1a1a1a]"
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

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-[#ebe8e1]">
            <div className="flex flex-col gap-4">
              <Link 
                href="/" 
                className="text-sm tracking-widest text-[#3d3d3d] py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                展览
              </Link>
              <Link 
                href="/gallery" 
                className="text-sm tracking-widest text-[#3d3d3d] py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                藏品
              </Link>
              <Link 
                href="/about" 
                className="text-sm tracking-widest text-[#3d3d3d] py-2"
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
