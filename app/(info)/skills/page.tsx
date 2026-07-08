'use client';

import React from 'react';
import { Terminal, Code } from 'lucide-react';
import { useLanguage } from '../../../lib/i18n';

export default function SkillsPage() {
  const { language } = useLanguage();

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-[var(--text-main)] mb-4 flex items-center gap-3">
        <Code className="w-6 h-6 text-[#818CF8]" />
        {language === 'en' ? 'Integration Assets' : 'أصول التكامل'}
      </h2>
      <p className="text-[var(--text-dim)] leading-relaxed mb-8">
        {language === 'en'
          ? "Pre-configured skills and rules to instantly inject AXON policy awareness into popular developer agents."
          : "قواعد مسبقة التكوين لحقن وعي سياسات أكسون فوراً في وكلاء التطوير الشائعين."}
      </p>

      <div className="space-y-6">
        {/* Cursor IDE Rule */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-muted)] rounded-2xl p-6">
          <h3 className="font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Cursor IDE Rule
          </h3>
          <p className="text-xs text-[var(--text-dim)] mb-4">
            {language === 'en' 
              ? "Forces Cursor's Composer to consult AXON before applying codebase refactors or installing dependencies. It runs silently in the background of your Cursor workspace." 
              : "يجبر محرر Cursor على مراجعة أكسون قبل تطبيق التغييرات الجذرية. يعمل بسلاسة في الخلفية."}
          </p>
          <div className="bg-[#08090C] border border-[var(--border-bold)] rounded-lg p-3 mb-3">
            <div className="text-[10px] text-[var(--text-light)] mb-1 uppercase tracking-wider font-bold">Repo Path</div>
            <code className="text-xs text-emerald-400 font-mono">.cursor/rules/axon-decision.mdc</code>
          </div>
          <div className="bg-[#08090C] border border-[var(--border-bold)] rounded-lg p-3">
            <div className="text-[10px] text-[var(--text-light)] mb-1 uppercase tracking-wider font-bold">Installation</div>
            <code className="text-xs text-[var(--text-main)] font-mono">cp .cursor/rules/axon-decision.mdc /path/to/project/.cursor/rules/</code>
          </div>
        </div>

        {/* Claude Code Skill */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-muted)] rounded-2xl p-6">
          <h3 className="font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            Claude Code Skill
          </h3>
          <p className="text-xs text-[var(--text-dim)] mb-4">
            {language === 'en' 
              ? "Binds AXON to Claude Code's terminal execution layer, acting as a gatekeeper before shell commands or script executions are approved." 
              : "يربط أكسون بطبقة تنفيذ الأوامر الطرفية الخاصة بـ Claude Code كحارس بوابة."}
          </p>
          <div className="bg-[#08090C] border border-[var(--border-bold)] rounded-lg p-3 mb-3">
            <div className="text-[10px] text-[var(--text-light)] mb-1 uppercase tracking-wider font-bold">Repo Path</div>
            <code className="text-xs text-amber-400 font-mono">.claude/skills/axon-decision/SKILL.md</code>
          </div>
          <div className="bg-[#08090C] border border-[var(--border-bold)] rounded-lg p-3">
            <div className="text-[10px] text-[var(--text-light)] mb-1 uppercase tracking-wider font-bold">Installation</div>
            <code className="text-xs text-[var(--text-main)] font-mono">cp .claude/skills/axon-decision/SKILL.md /path/to/project/.claude/skills/axon-decision/</code>
          </div>
        </div>

        {/* Antigravity Skill */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-muted)] rounded-2xl p-6">
          <h3 className="font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            Antigravity Skill
          </h3>
          <p className="text-xs text-[var(--text-dim)] mb-4">
            {language === 'en' 
              ? "Enforces policy-compliant execution for Antigravity autonomous agents during long-running background tasks." 
              : "يفرض التنفيذ المتوافق مع السياسات للوكلاء المستقلين أثناء المهام الطويلة في الخلفية."}
          </p>
          <div className="bg-[#08090C] border border-[var(--border-bold)] rounded-lg p-3 mb-3">
            <div className="text-[10px] text-[var(--text-light)] mb-1 uppercase tracking-wider font-bold">Repo Path</div>
            <code className="text-xs text-indigo-400 font-mono">.agents/skills/axon-decision-engine/SKILL.md</code>
          </div>
          <div className="bg-[#08090C] border border-[var(--border-bold)] rounded-lg p-3">
            <div className="text-[10px] text-[var(--text-light)] mb-1 uppercase tracking-wider font-bold">Installation</div>
            <code className="text-xs text-[var(--text-main)] font-mono">cp .agents/skills/axon-decision-engine/SKILL.md /path/to/project/.agents/skills/axon-decision-engine/</code>
          </div>
        </div>
      </div>
    </div>
  );
}
