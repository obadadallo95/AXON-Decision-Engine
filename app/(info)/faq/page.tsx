'use client';

import React, { useState } from 'react';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { useLanguage } from '../../../lib/i18n';

const faqsEn = [
  {
    q: "How can non-technical managers add company policies to AXON?",
    a: "Managers can simply upload their official company security handbooks or policy documents (.json, .pdf, .txt, .md, .html). AXON uses Gemini's document and text comprehension to automatically extract and structure these rules, then presents them in a 'Candidate Review' interface for final human confirmation before enforcement."
  },
  {
    q: "What exactly does AXON decide?",
    a: "AXON decides whether a requested action (e.g., running a script, installing a dependency, migrating a database) violates the active security policies of the organization. It does not execute the action itself."
  },
  {
    q: "How are decisions calculated?",
    a: "Requests, typed context, supplied evidence, and active policies are normalized on the server. Gemini may provide a bounded interpretation, but the deterministic kernel selects EXECUTE, ASK, DEFER, ESCALATE, or REFUSE."
  },
  {
    q: "What does Gemini control?",
    a: "Gemini is an advisory interpreter only. It cannot select the final state, authorize execution, mutate policy, or create audit records. The server-owned deterministic workflow reconciles its output with explicit signals and policies."
  },
  {
    q: "Does AXON provide legal or compliance guarantees?",
    a: "No. AXON is an operational decision-support system. While it helps enforce internal rules, it does not constitute formal legal, regulatory, or compliance advice. Human-in-the-Loop review is required for tier-0 production modifications."
  },
  {
    q: "What integration surface exists today?",
    a: "AXON exposes a REST decision API and a source TypeScript client in this repository. There is no published npm package and no Codex, Claude, MCP, or execution adapter in the challenge prototype."
  },
  {
    q: "Can I use AXON with external agents?",
    a: "Yes. AXON exposes a secure `/api/decide` REST endpoint using Bearer token authentication. Any external agent, script, or CI/CD pipeline capable of making a cURL request can query the engine."
  },
  {
    q: "What happens when an action is flagged as ESCALATE?",
    a: "The decision is recorded and appears in the Review Queue. A simulated reviewer may append APPROVE or REJECT, but the review never executes the action or rewrites the original AXON decision."
  },
  {
    q: "How is the Audit History stored?",
    a: "Stage 3 writes decisions and reviews to a server-owned append-only process-local repository. The browser reads history through /api/audit and has no localStorage fallback for authoritative decisions. A durable transactional adapter is required for multi-instance production deployment."
  }
];

const faqsAr = [
  {
    q: "كيف يمكن للمديرين غير التقنيين إضافة سياسات الشركة إلى أكسون؟",
    a: "يمكن للمديرين ببساطة رفع كتيبات الأمان الرسمية أو مستندات سياسة الشركة (.json, .pdf, .txt, .md, .html). يستخدم أكسون قدرات Gemini لاستخراج هذه القواعد وهيكلتها تلقائياً، ثم يعرضها في واجهة 'مراجعة المرشحين' للتأكيد النهائي من قبل مسؤول بشري قبل تطبيقها."
  },
  {
    q: "ما الذي يقرره أكسون بالضبط؟",
    a: "يقرر أكسون ما إذا كان الإجراء المطلوب ينتهك السياسات الأمنية النشطة للمنظمة. وهو لا ينفذ الإجراء بنفسه."
  },
  {
    q: "كيف يتم حساب القرارات؟",
    a: "يتم تطبيع الطلب والسياق والأدلة والسياسات على الخادم. قد يقدم Gemini تفسيراً محدوداً، لكن نواة القرار الحتمية تختار EXECUTE أو ASK أو DEFER أو ESCALATE أو REFUSE."
  },
  {
    q: "ما الذي يتحكم به Gemini؟",
    a: "Gemini مستشار للتفسير فقط؛ ولا يستطيع اختيار الحالة النهائية أو تفويض التنفيذ أو تعديل السياسات أو إنشاء سجلات التدقيق."
  },
  {
    q: "هل يوفر أكسون ضمانات قانونية أو امتثال؟",
    a: "لا. أكسون هو نظام دعم قرارات تشغيلي ولا يمثل نصيحة قانونية أو تنظيمية رسمية."
  },
  {
    q: "ما هي واجهة التكامل المتاحة اليوم؟",
    a: "يوفر أكسون واجهة REST وعميل TypeScript مصدره موجود في هذا المستودع. لا توجد حزمة npm منشورة أو تكامل Codex أو Claude أو MCP أو منفذ تنفيذ في النموذج الأولي."
  },
  {
    q: "هل يمكنني استخدام أكسون مع وكلاء خارجيين؟",
    a: "نعم. يوفر أكسون واجهة برمجة تطبيقات (REST API) آمنة يمكن لأي وكيل أو سكريبت خارجي الوصول إليها."
  },
  {
    q: "ماذا يحدث عند تصعيد إجراء ما (ESCALATE)؟",
    a: "يتم تسجيل القرار ويظهر في قائمة المراجعة. يمكن للمراجع المحاكى إضافة APPROVE أو REJECT، لكن المراجعة لا تنفذ الإجراء ولا تعيد كتابة قرار أكسون الأصلي."
  },
  {
    q: "كيف يتم تخزين سجل التدقيق؟",
    a: "في المرحلة الثالثة، يحفظ الخادم القرارات والمراجعات في مستودع ملحق محلي داخل العملية. يقرأ المتصفح السجل عبر /api/audit ولا يستخدم localStorage كبديل للقرارات الموثوقة."
  }
];

export default function FAQPage() {
  const { language } = useLanguage();
  const faqs = language === 'en' ? faqsEn : faqsAr;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-[var(--text-main)] mb-8 flex items-center gap-3">
        <MessageCircleQuestion className="w-6 h-6 text-[#818CF8]" />
        {language === 'en' ? 'Frequently Asked Questions' : 'الأسئلة الشائعة'}
      </h2>
      
      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                isOpen 
                  ? 'bg-[var(--bg-panel)] border-[#6366F1]/50 shadow-sm' 
                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-panel)]'
              }`}
            >
              <button 
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full text-left px-5 py-4 flex items-center justify-between"
              >
                <span className="font-bold text-[var(--text-main)] text-sm">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-[var(--text-dim)] text-sm leading-relaxed border-t border-[var(--border-subtle)] pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
