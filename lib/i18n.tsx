import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

export interface TranslationSet {
  appName: string;
  tagline: string;
  workspace: string;
  auditHistory: string;
  reviewQueue: string;
  policyEngine: string;
  activeWorkspace: string;
  systemInput: string;
  inputPlaceholder: string;
  voiceInputActive: string;
  voiceInputIdle: string;
  executeAnalysis: string;
  contextualGuidelines: string;
  arabicTranslationRef: string;
  nativeFluidityCheck: string;
  analysisResult: string;
  riskScore: string;
  critical: string;
  primaryReason: string;
  groundingData: string;
  safetyAlternative: string;
  viewLog: string;
  confirmEscalation: string;
  noData: string;
  roleController: string;
  userRole: string;
  reviewerRole: string;
  toggleRole: string;
  reviewerPanel: string;
  reviewerOverride: string;
  decisionAllow: string;
  decisionDeny: string;
  decisionClarify: string;
  decisionEscalate: string;
  unauthorizedReviewer: string;
  googleSearchUsed: string;
  verifiedTime: string;
  scenariosTitle: string;
  scenariosSubtitle: string;
  policiesTitle: string;
  policiesSubtitle: string;
  addPolicy: string;
  policyCode: string;
  policyDescription: string;
  savePolicies: string;
  policiesSavedSuccess: string;
  sdkIntegration: string;
  developerHub: string;
  sdkDescription: string;
  sdkCodeSnippet: string;
  welcomeTitle: string;
  welcomeDesc: string;
  dismiss: string;
  privacyPolicy: string;
  termsOfUse: string;
  developedBy: string;
  developerName: string;
}

export const translations: Record<Language, TranslationSet> = {
  en: {
    appName: "AXON",
    tagline: "DECISION ENGINE v1.0",
    workspace: "Workspace",
    auditHistory: "Audit History",
    reviewQueue: "Review Queue",
    policyEngine: "Policy Engine",
    activeWorkspace: "Active Workspace",
    systemInput: "System Action Request",
    inputPlaceholder: "Describe the action you want to execute (Text or Voice)...",
    voiceInputActive: "Voice Input Listening...",
    voiceInputIdle: "Use Voice Input",
    executeAnalysis: "Execute Analysis",
    contextualGuidelines: "Contextual Security Policies",
    arabicTranslationRef: "Arabic Translation Reference",
    nativeFluidityCheck: "Bilingual Alignment",
    analysisResult: "Decision Analysis",
    riskScore: "Risk Score",
    critical: "Critical",
    primaryReason: "Primary Reason & Analysis",
    groundingData: "Grounding Data Sources",
    safetyAlternative: "Recommended Safety Mitigation",
    viewLog: "View Details",
    confirmEscalation: "Confirm Decision",
    noData: "No audit records found.",
    roleController: "Simulation Profile",
    userRole: "AI Agent (Submitter)",
    reviewerRole: "Human Reviewer (Governance)",
    toggleRole: "Simulate Role",
    reviewerPanel: "Governance Reviewer Panel",
    reviewerOverride: "Authorized override active. Click buttons below to override decision.",
    decisionAllow: "Allow Action",
    decisionDeny: "Deny Action",
    decisionClarify: "Needs Clarification",
    decisionEscalate: "Escalate to Human",
    unauthorizedReviewer: "Requires Governance Reviewer clearance. Click the profile controller in the sidebar to simulate manual clearance.",
    googleSearchUsed: "Supplied Evidence Status",
    verifiedTime: "Verified just now",
    scenariosTitle: "Evaluation Missions",
    scenariosSubtitle: "Select a mission brief to test the AXON Decision Engine",
    policiesTitle: "Active Security Guardrails",
    policiesSubtitle: "Operational guidelines and boundary criteria evaluated by the AXON engine",
    addPolicy: "Add Custom Guardrail",
    policyCode: "Policy Reference",
    policyDescription: "Operational Directive Description",
    savePolicies: "Deploy Operational Guardrails",
    policiesSavedSuccess: "Operational guardrails successfully deployed to Firestore.",
    sdkIntegration: "SDK Integration",
    developerHub: "Developer Hub",
    sdkDescription: "Integrate AXON's Decision Engine into your own AI tools and agents to provide robust, policy-driven execution safety. The SDK verifies actions before they are executed.",
    sdkCodeSnippet: "Install & Setup",
    welcomeTitle: "Welcome to The Decision Engine",
    welcomeDesc: "Can you build an AI system that knows when it is allowed to act? Define organizational policies, simulate system requests, and audit automated risk verification. Try the sample scenarios below to see it in action.",
    dismiss: "Dismiss",
    privacyPolicy: "Privacy Policy",
    termsOfUse: "Terms of Use",
    developedBy: "Developed by",
    developerName: "Obada Dallo",
  },
  ar: {
    appName: "أكسون",
    tagline: "محرك القرارات v1.0",
    workspace: "مساحة العمل",
    auditHistory: "سجل التدقيق",
    reviewQueue: "طابور المراجعة",
    policyEngine: "محرك السياسات",
    activeWorkspace: "مساحة العمل النشطة",
    systemInput: "طلب الإجراء المطلوب بالنظام",
    inputPlaceholder: "صف الإجراء الذي ترغب في تنفيذه (كتابةً أو صوتاً)...",
    voiceInputActive: "جاري الاستماع للمدخل الصوتي...",
    voiceInputIdle: "استخدم المدخل الصوتي",
    executeAnalysis: "بدء تحليل القرار",
    contextualGuidelines: "سياسات الأمن التنظيمية",
    arabicTranslationRef: "المرجع العربي المعتمد",
    nativeFluidityCheck: "المحاذاة ثنائية اللغة",
    analysisResult: "تحليل قرار الحوكمة",
    riskScore: "مؤشر المخاطر",
    critical: "حرجة",
    primaryReason: "السبب الرئيسي والتحليل الفني",
    groundingData: "مصادر البيانات المرجعية",
    safetyAlternative: "التدبير الوقائي الموصى به",
    viewLog: "عرض التفاصيل",
    confirmEscalation: "تأكيد القرار",
    noData: "لا توجد سجلات تدقيق حالية.",
    roleController: "ملف المحاكاة الحالي",
    userRole: "وكيل ذكاء اصطناعي (مُرسل)",
    reviewerRole: "مراجع بشري (حوكمة)",
    toggleRole: "تغيير الصلاحية",
    reviewerPanel: "لوحة تحكم مراجع الحوكمة",
    reviewerOverride: "تم تفعيل صلاحيات المراجعة اليدوية. انقر على الأزرار أدناه لتعديل القرار.",
    decisionAllow: "السماح بالإجراء",
    decisionDeny: "رفض الإجراء",
    decisionClarify: "تطلب توضيحاً إضافياً",
    decisionEscalate: "تصعيد للمراجعة البشرية",
    unauthorizedReviewer: "يتطلب صلاحية 'مراجع الحوكمة'. انقر على ملف المحاكاة في القائمة الجانبية لتفعيل الصلاحية.",
    googleSearchUsed: "حالة الأدلة المقدمة",
    verifiedTime: "تم التحقق الآن",
    scenariosTitle: "مهام التقييم (Missions)",
    scenariosSubtitle: "اختر موجز المهمة لاختبار محرك قرارات أكسون",
    policiesTitle: "حواجز الحماية الأمنية النشطة",
    policiesSubtitle: "الضوابط التشغيلية والمعايير التنظيمية التي يتم تقييمها بواسطة محرك أكسون",
    addPolicy: "إضافة ضابط أمني جديد",
    policyCode: "رمز السياسة المرجعي",
    policyDescription: "تفصيل التوجيه التشغيلي",
    savePolicies: "نشر ضوابط الحماية والتشغيل",
    policiesSavedSuccess: "تم نشر ضوابط التشغيل والأمن بنجاح إلى قاعدة بيانات فايرستور.",
    sdkIntegration: "تكامل حزمة التطوير (SDK)",
    developerHub: "مركز المطورين",
    sdkDescription: "قم بدمج محرك قرارات أكسون في أدوات الذكاء الاصطناعي الخاصة بك لتوفير حماية تنفيذية قوية مبنية على السياسات. تتحقق حزمة التطوير من الأوامر قبل تنفيذها.",
    sdkCodeSnippet: "التثبيت والإعداد",
    welcomeTitle: "مرحباً بك في محرك القرارات",
    welcomeDesc: "هل يمكنك بناء نظام ذكاء اصطناعي يعرف متى يُسمح له بالتصرف؟ حدد سياساتك التنظيمية، وحاكي طلبات النظام، ودقق في التحقق التلقائي من المخاطر. جرب السيناريوهات أدناه لرؤية ذلك عملياً.",
    dismiss: "إخفاء",
    privacyPolicy: "سياسة الخصوصية",
    termsOfUse: "شروط الاستخدام",
    developedBy: "تطوير",
    developerName: "عبادة دللو",
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationSet;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <div dir={language === 'ar' ? 'rtl' : 'ltr'} className={language === 'ar' ? 'ar-text' : ''}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
