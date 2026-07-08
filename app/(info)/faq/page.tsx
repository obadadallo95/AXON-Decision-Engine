'use client';

import React, { useState } from 'react';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import { useLanguage } from '../../../lib/i18n';

const faqsEn = [
  {
    q: "How can non-technical managers add company policies to AXON?",
    a: "Managers can simply upload their official company security handbooks or policy documents as PDF files. AXON uses Gemini's native document comprehension to automatically extract, structure, and enforce these rules without any manual coding or data entry."
  },
  {
    q: "What exactly does AXON decide?",
    a: "AXON decides whether a requested action (e.g., running a script, installing a dependency, migrating a database) violates the active security policies of the organization. It does not execute the action itself."
  },
  {
    q: "How are decisions calculated?",
    a: "Decisions are made by feeding the natural language request, the current context, and the active organizational policies into a Gemini 1.5-flash model. The model is constrained to return a strict JSON payload with a deterministic state (ALLOW, DENY, NEEDS_CLARIFICATION, ESCALATE_TO_HUMAN)."
  },
  {
    q: "When is Search Grounding used?",
    a: "Search grounding (Google Search tools) is activated dynamically by the model when it encounters specific entities—such as an npm package version or a CLI tool—that require real-time verification for known vulnerabilities (CVEs) or deprecation notices."
  },
  {
    q: "Does AXON provide legal or compliance guarantees?",
    a: "No. AXON is an operational decision-support system. While it helps enforce internal rules, it does not constitute formal legal, regulatory, or compliance advice. Human-in-the-Loop review is required for tier-0 production modifications."
  },
  {
    q: "What is the difference between the SDK and the Skills?",
    a: "The SDK is a TypeScript library for developers building their own tools to programmatically query the decision engine. Skills are pre-packaged configuration files that instantly bind popular AI IDEs (like Cursor) to the AXON API without writing custom code."
  },
  {
    q: "Can I use AXON with external agents?",
    a: "Yes. AXON exposes a secure `/api/decide` REST endpoint using Bearer token authentication. Any external agent, script, or CI/CD pipeline capable of making a cURL request can query the engine."
  },
  {
    q: "What happens when an action is flagged as ESCALATE_TO_HUMAN?",
    a: "The request is denied execution at the agent level, and a record is pushed to the AXON Review Queue. A human administrator must manually review the payload and approve or reject the action."
  },
  {
    q: "How is the Audit History stored?",
    a: "Audit logs are persisted immutably to Firebase Firestore. If the database is offline or unreachable, AXON fails over to a local browser storage cache until the connection is restored."
  }
];

const faqsAr = [
  {
    q: "كيف يمكن للمديرين غير التقنيين إضافة سياسات الشركة إلى أكسون؟",
    a: "يمكن للمديرين ببساطة رفع كتيبات الأمان الرسمية أو مستندات سياسة الشركة كملفات PDF. يستخدم أكسون قدرات Gemini في فهم المستندات لاستخراج هذه القواعد وهيكلتها وتطبيقها تلقائياً دون أي برمجة أو إدخال بيانات يدوي."
  },
  {
    q: "ما الذي يقرره أكسون بالضبط؟",
    a: "يقرر أكسون ما إذا كان الإجراء المطلوب ينتهك السياسات الأمنية النشطة للمنظمة. وهو لا ينفذ الإجراء بنفسه."
  },
  {
    q: "كيف يتم حساب القرارات؟",
    a: "يتم اتخاذ القرارات من خلال تمرير الطلب، والسياق الحالي، والسياسات النشطة إلى نموذج Gemini 1.5-flash ليرجع حالة حتمية (سماح، رفض، بحاجة لتوضيح، تصعيد لبشري)."
  },
  {
    q: "متى يتم استخدام البحث الميداني (Search Grounding)؟",
    a: "يتم تنشيطه ديناميكياً بواسطة النموذج للتحقق في الوقت الفعلي من الثغرات الأمنية (CVEs) للحزم أو الأدوات."
  },
  {
    q: "هل يوفر أكسون ضمانات قانونية أو امتثال؟",
    a: "لا. أكسون هو نظام دعم قرارات تشغيلي ولا يمثل نصيحة قانونية أو تنظيمية رسمية."
  },
  {
    q: "ما الفرق بين SDK والمهارات (Skills)؟",
    a: "SDK هي مكتبة برمجية للمطورين. أما المهارات فهي ملفات تكوين جاهزة لربط بيئات التطوير (مثل Cursor) بواجهة أكسون دون كتابة تعليمات برمجية إضافية."
  },
  {
    q: "هل يمكنني استخدام أكسون مع وكلاء خارجيين؟",
    a: "نعم. يوفر أكسون واجهة برمجة تطبيقات (REST API) آمنة يمكن لأي وكيل أو سكريبت خارجي الوصول إليها."
  },
  {
    q: "ماذا يحدث عند تصعيد إجراء ما (ESCALATE_TO_HUMAN)؟",
    a: "يتم إيقاف التنفيذ عند الوكيل، ويُرسل السجل إلى طابور المراجعة في أكسون ليقوم مسؤول بشري بمراجعته."
  },
  {
    q: "كيف يتم تخزين سجل التدقيق؟",
    a: "يتم حفظ السجلات بشكل ثابت في Firebase Firestore، مع إمكانية التخزين المؤقت المحلي في حال انقطاع الاتصال."
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
