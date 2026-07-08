const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Add missing imports
if (!code.includes("import Link from 'next/link';")) {
  code = code.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport Link from 'next/link';");
}
if (!code.includes("MessageCircleQuestion")) {
  code = code.replace("HelpCircle,", "HelpCircle,\n  MessageCircleQuestion,");
}

// 2. Revert State
code = code.replace(
  "useState<'workspace' | 'audit' | 'queue' | 'policies' | 'sdk' | 'about' | 'skills'>('workspace');",
  "useState<'workspace' | 'audit' | 'queue' | 'policies' | 'sdk'>('workspace');"
);

// 3. Desktop Nav
const desktopNavRegex = /\{\/\* Secondary Navigation \*\/\}[\s\S]*?<\/div>/;
const desktopNavReplacement = `
            {/* Secondary Navigation */}
            <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] space-y-1">
              <Link 
                href="/about"
                className="w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]"
              >
                <HelpCircle className="w-4.5 h-4.5" />
                {language === 'en' ? 'About AXON' : 'حول أكسون'}
              </Link>
              <Link 
                href="/skills"
                className="w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]"
              >
                <Code className="w-4.5 h-4.5" />
                {language === 'en' ? 'Integration Skills' : 'مهارات التكامل'}
              </Link>
              <Link 
                href="/faq"
                className="w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]"
              >
                <MessageCircleQuestion className="w-4.5 h-4.5" />
                {language === 'en' ? 'FAQ' : 'الأسئلة الشائعة'}
              </Link>
            </div>`;
code = code.replace(desktopNavRegex, desktopNavReplacement);

// 4. Mobile Nav
// Remove the buttons I added earlier in mobile nav
const mobileAboutRegex = /<button \n            onClick=\{\(\) => setActiveTab\('about'\)\}[\s\S]*?<\/button>\n/;
code = code.replace(mobileAboutRegex, '');

const mobileSkillsRegex = /<button \n            onClick=\{\(\) => setActiveTab\('skills'\)\}[\s\S]*?<\/button>\n/;
const mobileNavReplacement = `
          <Link 
            href="/about"
            className="flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-shrink-0 min-w-[64px] text-center transition-all cursor-pointer relative text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
          >
            <HelpCircle className="w-5 h-5 transition-transform duration-200 text-[var(--text-muted)]" />
            <span className="text-[9px] font-black tracking-wider uppercase mt-1 text-[var(--text-dim)]">
              {language === 'en' ? 'About' : 'حول'}
            </span>
          </Link>

          <Link 
            href="/skills"
            className="flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-shrink-0 min-w-[64px] text-center transition-all cursor-pointer relative text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
          >
            <Code className="w-5 h-5 transition-transform duration-200 text-[var(--text-muted)]" />
            <span className="text-[9px] font-black tracking-wider uppercase mt-1 text-[var(--text-dim)]">
              {language === 'en' ? 'Skills' : 'مهارات'}
            </span>
          </Link>

          <Link 
            href="/faq"
            className="flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-shrink-0 min-w-[64px] text-center transition-all cursor-pointer relative text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50"
          >
            <MessageCircleQuestion className="w-5 h-5 transition-transform duration-200 text-[var(--text-muted)]" />
            <span className="text-[9px] font-black tracking-wider uppercase mt-1 text-[var(--text-dim)]">
              {language === 'en' ? 'FAQ' : 'أسئلة'}
            </span>
          </Link>
`;
code = code.replace(mobileSkillsRegex, mobileNavReplacement);


// 5. Remove Tab Content
const tabContentRegex = /\{\/\* TAB 6: ABOUT \*\/\}[\s\S]*?\{\/\* TAB 7: SKILLS \*\/\}[\s\S]*?<\/div>\n\s*\)\}\n/;
code = code.replace(tabContentRegex, '');

fs.writeFileSync('app/page.tsx', code);
console.log("Updated app/page.tsx to use real routes");
