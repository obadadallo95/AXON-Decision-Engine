'use client';

import React from 'react';
import { Code } from 'lucide-react';
import { useLanguage } from '../../../lib/i18n';

export default function SkillsPage() {
  const { language } = useLanguage();

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl">
      <h2 className="text-2xl font-black text-[var(--text-main)] mb-4 flex items-center gap-3">
        <Code className="w-6 h-6 text-[#818CF8]" />
        {language === 'en' ? 'Integration surfaces' : 'واجهات التكامل'}
      </h2>
      <p className="text-[var(--text-dim)] leading-relaxed">
        {language === 'en'
          ? 'AXON currently exposes a REST decision API and a source TypeScript client for prototype integration. Published packages, agent hooks, MCP, shell gateways, and execution adapters are intentionally deferred until after the challenge submission.'
          : 'يوفر أكسون حالياً واجهة REST وعميل TypeScript مصدره متاح للتكامل الأولي. تم تأجيل الحزم المنشورة وربط الوكلاء وMCP وبوابات shell ومنافذ التنفيذ إلى ما بعد تقديم التحدي.'}
      </p>
      <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5 text-sm text-indigo-200">
        <p className="font-bold">{language === 'en' ? 'Available now' : 'متاح الآن'}</p>
        <code className="mt-2 block text-xs font-mono text-indigo-300">POST /api/scenarios/run</code>
        <code className="mt-1 block text-xs font-mono text-indigo-300">POST /api/decide</code>
      </div>
    </div>
  );
}
