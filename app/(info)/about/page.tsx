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
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
          <div className="font-bold text-emerald-400 mb-1">ALLOW</div>
          <div className="text-xs text-[var(--text-dim)]">{language === 'en' ? 'Action complies with policy. Proceed safely.' : 'الإجراء متوافق. تابع بأمان.'}</div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
          <div className="font-bold text-rose-400 mb-1">DENY</div>
          <div className="text-xs text-[var(--text-dim)]">{language === 'en' ? 'Action violates policy. Execution halted.' : 'الإجراء ينتهك السياسة. تم الإيقاف.'}</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
          <div className="font-bold text-amber-400 mb-1">NEEDS_CLARIFICATION</div>
          <div className="text-xs text-[var(--text-dim)]">{language === 'en' ? 'Policy is ambiguous regarding the request. Requires user context.' : 'السياسة غامضة وتحتاج سياق إضافي من المستخدم.'}</div>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
          <div className="font-bold text-indigo-400 mb-1">ESCALATE_TO_HUMAN</div>
          <div className="text-xs text-[var(--text-dim)]">{language === 'en' ? 'High-risk action detected. Agent must defer to human execution.' : 'إجراء عالي المخاطر. يتطلب تدخلاً بشرياً.'}</div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-[var(--text-main)] mt-8 mb-3">{language === 'en' ? 'Native Policy Ingestion' : 'استيراد السياسات الأصلي'}</h3>
      <p className="text-[var(--text-dim)] leading-relaxed mb-6">
        {language === 'en'
          ? "Non-technical managers can directly upload their company's official security handbooks (PDFs). AXON automatically extracts, structures, and enforces the security rules using Gemini's native document comprehension capabilities without requiring manual data entry."
          : "يمكن للمديرين رفع سياسات الشركة الأمنية مباشرة كملفات (PDF). يقوم أكسون تلقائياً باستخراج القوانين وهيكلتها وتطبيقها باستخدام قدرات Gemini في فهم المستندات دون الحاجة لإدخال يدوي."}
      </p>

      <h3 className="text-lg font-bold text-[var(--text-main)] mt-8 mb-3">{language === 'en' ? 'Architecture' : 'البنية'}</h3>
      <p className="text-[var(--text-dim)] leading-relaxed">
        {language === 'en'
          ? "By offloading the authorization logic to the AXON API, your agents remain decoupled from corporate governance rules. The Decision Engine processes policies, executes search-grounding via Gemini to check external threats, and returns a decisive JSON payload through the SDK."
          : "من خلال نقل منطق التفويض إلى واجهة أكسون، يبقى وكلائك مستقلين عن قواعد الحوكمة. يقوم المحرك بمعالجة السياسات، والتحقق عبر نماذج Gemini، وإرجاع قرار حاسم عبر SDK."}
      </p>
    </div>
  );
}
