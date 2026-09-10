'use client';

import React from 'react';
import { useLanguage } from '../../../lib/i18n';

export default function AboutPage() {
  const { language } = useLanguage();

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-[var(--text-main)] mb-4">{language === 'en' ? 'About AXON' : 'حول أكسون'}</h2>
      <p className="text-[var(--text-dim)] leading-relaxed mb-6">
        {language === 'en' 
          ? "AXON is an operational decision safety engine. It acts as a dedicated security governance kernel for autonomous and semi-autonomous AI agents (such as Cursor, Claude Code, and Antigravity) and automated infrastructure pipelines."
          : "أكسون هو محرك قرارات أمان تشغيلي. يعمل كنواة حوكمة أمنية مخصصة للوكلاء الذكيين المستقلين أو شبه المستقلين وخطوط البنية التحتية المؤتمتة."}
      </p>
      
      <h3 className="text-lg font-bold text-[var(--text-main)] mt-8 mb-3">{language === 'en' ? 'The Problem It Solves' : 'المشكلة التي يحلها'}</h3>
      <p className="text-[var(--text-dim)] leading-relaxed mb-6">
        {language === 'en'
          ? "Modern AI agents have powerful capabilities to write code, install dependencies, and run terminal commands. However, they lack institutional awareness. They do not naturally know if a specific package is forbidden by your company's security policy, or if modifying a database schema requires senior engineering review."
          : "يتمتع الوكلاء الذكيون بقدرات قوية لكتابة التعليمات البرمجية وتشغيل الأوامر. ومع ذلك، يفتقرون للوعي المؤسسي ولا يعرفون بطبيعتهم القواعد الأمنية للشركات."}
      </p>

      <h3 className="text-lg font-bold text-[var(--text-main)] mt-8 mb-3">{language === 'en' ? 'Deterministic Action Verification' : 'التحقق الحتمي من الإجراءات'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[
          ['EXECUTE', 'Safe to proceed autonomously.'],
          ['ASK', 'Requester must provide missing information.'],
          ['DEFER', 'Wait for evidence, timing, or system conditions.'],
          ['ESCALATE', 'Human authority is required.'],
          ['REFUSE', 'The action is prohibited.'],
        ].map(([state, description]) => (
          <div key={state} className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
            <div className="font-bold text-indigo-300 mb-1">{state}</div>
            <div className="text-xs text-[var(--text-dim)]">{description}</div>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold text-[var(--text-main)] mt-8 mb-3">{language === 'en' ? 'Policy Ingestion Pipeline' : 'مسار استيراد السياسات متعدد الصيغ'}</h3>
      <p className="text-[var(--text-dim)] leading-relaxed mb-6">
        {language === 'en'
          ? "The repository includes a policy-extraction prototype for exploration. It is not the active authorization surface for the challenge; the scenario runner uses server-owned typed policies."
          : "يمكن لفرق الأمن والمديرين استيراد السياسات المنظمة أو المستندات المباشرة (.pdf, .txt, .md, .html, .json). يوجه أكسون الملف بذكاء، ويستخرج القواعد الأمنية، ثم يضعها في مرحلة 'المراجعة' للتأكيد من قبل العنصر البشري قبل التنفيذ الفعلي، مما يمنع تنشيط قوانين غير دقيقة."}
      </p>

      <h3 className="text-lg font-bold text-[var(--text-main)] mt-8 mb-3">{language === 'en' ? 'Architecture' : 'البنية'}</h3>
      <p className="text-[var(--text-dim)] leading-relaxed">
        {language === 'en'
          ? "By placing authorization in the AXON API, agents remain decoupled from governance rules. The Decision Engine processes typed context and evidence, may use Gemini for bounded interpretation, and returns a canonical JSON outcome through REST or the source TypeScript client."
          : "من خلال نقل منطق التفويض إلى واجهة أكسون، يبقى وكلائك مستقلين عن قواعد الحوكمة. يقوم المحرك بمعالجة السياسات، والتحقق عبر نماذج Gemini، وإرجاع قرار حاسم عبر SDK."}
      </p>
    </div>
  );
}
