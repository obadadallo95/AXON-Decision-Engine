'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Shield, 
  HelpCircle, 
  Code, 
  Activity,
  ArrowLeft,
  MessageCircleQuestion,
  Moon,
  Sun
} from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('axon-theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('axon-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const navItems = [
    { href: '/about', icon: HelpCircle, labelEn: 'About AXON', labelAr: 'حول أكسون' },
    { href: '/skills', icon: Code, labelEn: 'Integration Skills', labelAr: 'مهارات التكامل' },
    { href: '/faq', icon: MessageCircleQuestion, labelEn: 'FAQ', labelAr: 'الأسئلة الشائعة' }
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-surface)] font-sans selection:bg-[#6366F1]/30" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Desktop Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-[var(--border-panel)] flex flex-col hidden lg:flex relative z-10 bg-[var(--bg-panel)]/50 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#818CF8] to-[#4F46E5] flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-[var(--text-main)]">AXON</h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold ml-11">Information</p>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar py-4">
          <nav className="space-y-1">
            {navItems.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href}
                  href={item.href}
                  className={`w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? 'bg-[var(--bg-active)] text-[#818CF8] border-r-2 border-[#6366F1]' 
                      : 'text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {language === 'en' ? item.labelEn : item.labelAr}
                </Link>
              );
            })}
          </nav>
          
          <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] space-y-1">
            <Link 
              href="/"
              className="w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
              {language === 'en' ? 'Back to Workspace' : 'العودة لمساحة العمل'}
            </Link>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-[var(--border-subtle)] space-y-3">
          <div className="flex bg-[var(--bg-card)] rounded-lg border border-[var(--border-panel)] p-1">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${language === 'en' ? 'bg-[#818CF8] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${language === 'ar' ? 'bg-[#818CF8] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              AR
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative h-full bg-[var(--bg-surface)]">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 border-b border-[var(--border-panel)] flex items-center justify-between px-6 bg-[var(--bg-surface)]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <Link href="/" className="lg:hidden w-8 h-8 rounded-lg bg-gradient-to-br from-[#818CF8] to-[#4F46E5] flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-panel)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-10 relative">
          <div className="max-w-4xl mx-auto pb-24">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Nav */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 md:left-6 md:right-6 max-w-lg mx-auto bg-[var(--bg-surface)]/90 border border-[var(--border-panel)] shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl rounded-2xl p-1.5 z-40 flex items-center justify-between overflow-x-auto hide-scrollbar gap-1 transition-all duration-300">
        <Link 
          href="/"
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-shrink-0 min-w-[64px] text-center transition-all cursor-pointer relative text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50`}
        >
          <Activity className="w-5 h-5 transition-transform duration-200 text-[var(--text-muted)]" />
          <span className="text-[9px] font-black tracking-wider uppercase mt-1 text-[var(--text-dim)]">
            {language === 'en' ? 'Workspace' : 'مساحة العمل'}
          </span>
        </Link>
        <div className="w-px h-8 bg-[var(--border-panel)] mx-1 flex-shrink-0"></div>
        {navItems.map(item => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-shrink-0 min-w-[64px] text-center transition-all cursor-pointer relative ${
                isActive 
                  ? 'bg-[var(--bg-badge)] text-[var(--text-main)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                  : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-[#818CF8]' : 'text-[var(--text-muted)]'}`} />
              <span className={`text-[9px] font-black tracking-wider uppercase mt-1 ${isActive ? 'text-[#818CF8]' : 'text-[var(--text-dim)]'}`}>
                {language === 'en' ? item.labelEn.split(' ')[0] : item.labelAr.split(' ')[0]}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#818CF8]"></span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
