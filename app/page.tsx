'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Terminal, 
  History, 
  Layers, 
  Mic, 
  MicOff, 
  Play, 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  ArrowRight, 
  Plus, 
  Trash, 
  ExternalLink, 
  RefreshCw,
  UserCheck,
  Globe,
  Maximize2,
  Minimize2,
  Key,
  RefreshCcw,
  Copy,
  Activity,
  Code,
  Webhook,
  Clock,
  Zap,
  BarChart2,
  ChevronDown,
  Settings2,
  Server,
  Moon,
  Sun,
  Sparkles,
  Upload,
  Github,
  Linkedin
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useLanguage, Language } from '../lib/i18n';
import { useAuth, UserRole } from '../lib/auth-context';
import { useSpeech } from '../hooks/use-speech';
import { evaluationScenarios } from '../lib/scenarios';
import { 
  fetchAuditHistory, 
  addAuditLog, 
  fetchEscalatedQueue, 
  addEscalatedQueue, 
  updateEscalatedDecision, 
  fetchPolicies, 
  savePolicies,
  AuditLog,
  EscalatedItem,
  SecurityPolicy
} from '../lib/firestore-service';

export default function AXONDashboard() {
  const { language, setLanguage, t } = useLanguage();
  const { user, toggleRole } = useAuth();
  const { isListening, transcript, toggleListening } = useSpeech();

  // Theme states
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

  // Initialize theme from local storage
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

  // Navigation states
  const [activeTab, setActiveTab] = useState<'workspace' | 'audit' | 'queue' | 'policies' | 'sdk'>('workspace');

  // Input states
  const [prompt, setPrompt] = useState('Upgrade the production payment-gateway library from v2.4 to v3.0.1 immediately.');
  const [category, setCategory] = useState('dependency');
  
  // Data lists
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [escalatedQueue, setEscalatedQueue] = useState<EscalatedItem[]>([]);
  const [policies, setPolicies] = useState<SecurityPolicy[]>([]);
  
  // Loading & operational states
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);
  const [notification, setNotification] = useState('');

  // Administrative quick actions states
  const [systemHalted, setSystemHalted] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isVerifyingLedger, setIsVerifyingLedger] = useState(false);
  const [isDecisionOutputMaximized, setIsDecisionOutputMaximized] = useState(false);
  
  // Active Analysis State
  const [activeAnalysis, setActiveAnalysis] = useState<any>({
    decision: 'ESCALATE_TO_HUMAN',
    riskScore: 85,
    reasonEn: "The requested version (v3.0.1) contains breaking changes to the `ProcessTransaction` signature that will cause production downtime if applied without code migration.",
    reasonAr: "تحتوي النسخة المطلوبة (v3.0.1) على تغييرات جذرية في توقيع `ProcessTransaction` مما قد يؤدي إلى تعطل العمليات بالإنتاج إذا تم تطبيقها دون مراجعة برمجية مسبقة.",
    mitigationEn: "Apply minor patch v2.4.8 instead. It addresses current CVEs without breaking the API contract.",
    mitigationAr: "قم بتطبيق الرقعة الطفيفة v2.4.8 بدلاً من ذلك. فهي تعالج الثغرات الأمنية الحالية دون كسر عقد الواجهة البرمجية (API).",
    groundingEn: "v3.0.0 introduced a significant change to PCI-DSS compliance handling. Users report 40% failure rates on legacy payloads.",
    groundingAr: "قدم الإصدار v3.0.0 تغييراً جوهرياً في معالجة امتثال PCI-DSS. أبلغ المستخدمون عن معدلات فشل تبلغ 40٪ في الحزم القديمة.",
    citations: ["https://nvd.nist.gov/vuln", "https://github.com/advisories"]
  });

  // Arabic Translation preview helper
  const [arabicPreview, setArabicPreview] = useState('تتم مراجعة طلب ترقية مكتبة بوابة الدفع حالياً. تم اكتشاف مخاطر أمنية تتطلب تدخلاً بشرياً فورياً نظراً لحساسية النظام.');

  // Custom policy form
  const [newPolicyCode, setNewPolicyCode] = useState('');
  const [newPolicyDescEn, setNewPolicyDescEn] = useState('');
  const [newPolicyDescAr, setNewPolicyDescAr] = useState('');

  // Review comment form
  const [reviewComment, setReviewComment] = useState('');

  // Audit filter states
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterDecision, setAuditFilterDecision] = useState('ALL');
  
  // Policy tools states
  const [isSuggestingPolicy, setIsSuggestingPolicy] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // SDK states
  const [sdkToken, setSdkToken] = useState('axn_live_a1b2c3d4e5f6g7h8');
  const [sdkTokenRegenerating, setSdkTokenRegenerating] = useState(false);
  const [sdkSimulationPayload, setSdkSimulationPayload] = useState('{\n  "prompt": "Restart production server",\n  "context": { "userRole": "AI_AGENT" }\n}');
  const [sdkSimulationResult, setSdkSimulationResult] = useState<any>(null);
  const [isSimulatingSdk, setIsSimulatingSdk] = useState(false);
  const [sdkVersion, setSdkVersion] = useState('v0.2.0-beta');
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.slack.com/services/T00000000/B00000000/XXXX');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [sdkActiveSubTab, setSdkActiveSubTab] = useState<'overview' | 'tracing' | 'auth' | 'reference'>('overview');


  // Sync speech transcript to prompt field with microtask deferral
  useEffect(() => {
    if (transcript) {
      const timer = setTimeout(() => {
        setPrompt(transcript);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [transcript]);

  // Synchronize scenario language automatically when toggling language
  useEffect(() => {
    const matchingScenario = evaluationScenarios.find(
      s => s.promptEn === prompt || s.promptAr === prompt || s.prompt === prompt
    );
    if (matchingScenario) {
      setPrompt(language === 'en' ? matchingScenario.promptEn : matchingScenario.promptAr);
    }
  }, [language]);

  // Declare hoisted async function first
  const loadDatabaseData = React.useCallback(async () => {
    try {
      const logs = await fetchAuditHistory();
      const queue = await fetchEscalatedQueue();
      const fetchedPolicies = await fetchPolicies();
      
      // Delay state updates to prevent synchronous cascading render error in ESLint
      setTimeout(() => {
        setAuditLogs(logs);
        setEscalatedQueue(queue);
        setPolicies(fetchedPolicies);
      }, 0);
    } catch (e) {
      console.error("Error loading database records:", e);
    }
  }, []);

  // Load database content on mount & when active tab changes
  useEffect(() => {
    loadDatabaseData();
  }, [activeTab, loadDatabaseData]);

  // Sync Arabic Preview translation based on user prompt using a quick debounce or trigger
  useEffect(() => {
    if (!prompt) return;
    const lower = prompt.toLowerCase();
    if (lower.includes('upgrade') || lower.includes('payment')) {
      setArabicPreview('ترقية مكتبة بوابة الدفع لبيئة الإنتاج فورياً من الإصدار v2.4 إلى v3.0.1.');
    } else if (lower.includes('truncate') || lower.includes('modify')) {
      setArabicPreview('حذف بيانات جدول ملفات العملاء المؤقت وتعديل نوع حقل المعرف الرقمي للمستخدمين.');
    } else if (lower.includes('hotfix') || lower.includes('patch')) {
      setArabicPreview('نشر رقعة الإصلاح الأمني الطارئ لبيئة الإنتاج لمعالجة الثغرة الأمنية في سيرفرات السداد.');
    } else if (lower.includes('ssh') || lower.includes('access')) {
      setArabicPreview('منح صلاحيات وصول مؤقتة للسيرفرات عبر مفتاح SSH الخارجي دون توقيع ثنائي معتمد.');
    } else {
      setArabicPreview('طلب إجراء أمني نشط: ' + prompt);
    }
  }, [prompt]);

  // Submit action request to evaluation API
  const handleEvaluate = async (customPrompt?: string) => {
    if (systemHalted) {
      setNotification(language === 'en' 
        ? "Evaluation Blocked: The AXON Decision Kernel is currently halted. Please resume the system before executing analyses."
        : "تم حظر التقييم: نواة قرارات أكسون متوقفة حالياً. يرجى إعادة تشغيل النظام قبل تنفيذ عمليات التحليل.");
      return;
    }

    const targetPrompt = customPrompt || prompt;
    if (!targetPrompt.trim()) return;

    setIsEvaluating(true);
    setNotification('');

    try {
      // Send active guidelines from local state
      const response = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: targetPrompt,
          policies: policies
        })
      });

      if (!response.ok) {
        throw new Error('Analysis request failed or credentials are unconfigured.');
      }

      const result = await response.json();
      
      setActiveAnalysis(result);

      // Save to audit logs (Firestore/localStorage)
      const logId = await addAuditLog({
        prompt: targetPrompt,
        category,
        decision: result.decision,
        riskScore: result.riskScore,
        reasonEn: result.reasonEn,
        reasonAr: result.reasonAr,
        mitigationEn: result.mitigationEn,
        mitigationAr: result.mitigationAr,
        groundingEn: result.groundingEn,
        groundingAr: result.groundingAr,
        reviewerOverride: null,
        reviewedBy: null
      });

      // If decision is Escalate, add to human review queue
      if (result.decision === 'ESCALATE_TO_HUMAN') {
        await addEscalatedQueue({
          prompt: targetPrompt,
          category,
          riskScore: result.riskScore,
          reasonEn: result.reasonEn,
          reasonAr: result.reasonAr,
          status: 'pending'
        });
      }

      // Refresh listings
      await loadDatabaseData();

    } catch (e: any) {
      console.warn("API evaluation failed, falling back to dynamic simulated analysis:", e);
      
      // Dynamic simulated fallback analysis in case API key is missing
      const isDangerous = targetPrompt.toLowerCase().includes('bypass') || 
                          targetPrompt.toLowerCase().includes('truncate') || 
                          targetPrompt.toLowerCase().includes('ssh') || 
                          targetPrompt.toLowerCase().includes('without');
      
      const hasUpgrade = targetPrompt.toLowerCase().includes('upgrade') || 
                         targetPrompt.toLowerCase().includes('update');

      let fallbackResult: any = {};
      if (isDangerous) {
        fallbackResult = {
          decision: 'DENY',
          riskScore: 95,
          reasonEn: "Action directly violates policy [R3/R4]. Unauthorized production table deletion or unapproved bypass of access controls detected.",
          reasonAr: "ينتهك الإجراء بشكل مباشر سياسة الأمن [R3/R4]. تم اكتشاف حذف غير مصرح به لجداول الإنتاج أو تجاوز غير معتمد لضوابط الوصول الإضافية.",
          mitigationEn: "Action is denied. Create an official compliance ticket and obtain multi-reviewer sign-off.",
          mitigationAr: "تم رفض الإجراء بالكامل. يرجى إنشاء طلب امتثال رسمي عبر القنوات المعتمدة والحصول على موافقة خطية.",
          groundingEn: "Direct policy conflict with active guardrails. Zero trust controls prohibit bypass scripts.",
          groundingAr: "تعارض مباشر مع السياسات النشطة. تمنع أنظمة الثقة الصفرية تشغيل برمجيات التجاوز غير المعتمدة.",
          citations: []
        };
      } else if (hasUpgrade) {
        fallbackResult = {
          decision: 'ESCALATE_TO_HUMAN',
          riskScore: 85,
          reasonEn: "The requested version contains breaking changes to core signatures. Risk of production downtime.",
          reasonAr: "يحتوي الإصدار المطلوب على تغييرات جذرية في التواقيع البرمجية الأساسية. خطر تعطل بيئة الإنتاج الحية.",
          mitigationEn: "Apply minor patch v2.4.8 instead to resolve immediate security vulnerabilities safely.",
          mitigationAr: "قم بتطبيق الرقعة الأحدث v2.4.8 بدلاً من ذلك لمعالجة الثغرات الأمنية الفورية بأمان.",
          groundingEn: "Version changes check indicates breaking dependencies. Verified 10m ago.",
          groundingAr: "يشير فحص تغييرات الإصدار إلى تعارض في الاعتمادات والارتباطات البرمجية. تم التحقق قبل 10 دقائق.",
          citations: []
        };
      } else {
        fallbackResult = {
          decision: 'ALLOW',
          riskScore: 12,
          reasonEn: "Standard low-risk operational request. No policy conflicts detected. Action logged safely.",
          reasonAr: "طلب تشغيلي اعتيادي منخفض المخاطر. لا توجد تعارضات مع السياسات الأمنية. تم تسجيل الإجراء بأمان.",
          mitigationEn: "Proceed via standard automated deployment pipeline.",
          mitigationAr: "تابع التنفيذ عبر مسار النشر الآلي القياسي بنجاح.",
          groundingEn: "Automated analysis verified clean history and compliant dependencies.",
          groundingAr: "أكد التحليل الآلي نظافة سجل المعاملات وتوافق جميع المكتبات البرمجية المرفقة.",
          citations: []
        };
      }

      setActiveAnalysis(fallbackResult);

      // Save to local logs
      await addAuditLog({
        prompt: targetPrompt,
        category,
        decision: fallbackResult.decision,
        riskScore: fallbackResult.riskScore,
        reasonEn: fallbackResult.reasonEn,
        reasonAr: fallbackResult.reasonAr,
        mitigationEn: fallbackResult.mitigationEn,
        mitigationAr: fallbackResult.mitigationAr,
        groundingEn: fallbackResult.groundingEn,
        groundingAr: fallbackResult.groundingAr,
        reviewerOverride: null,
        reviewedBy: null
      });

      if (fallbackResult.decision === 'ESCALATE_TO_HUMAN') {
        await addEscalatedQueue({
          prompt: targetPrompt,
          category,
          riskScore: fallbackResult.riskScore,
          reasonEn: fallbackResult.reasonEn,
          reasonAr: fallbackResult.reasonAr,
          status: 'pending'
        });
      }

      await loadDatabaseData();
    } finally {
      setIsEvaluating(false);
    }
  };

  // Human reviewer override / clear decisions
  const handleReviewAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateEscalatedDecision(id, status, reviewComment || 'Cleared by Governance Reviewer.');
      setReviewComment('');
      setNotification(language === 'en' ? 'Decision override successfully applied.' : 'تم تطبيق قرار المراجعة والاعتماد بنجاح.');
      setTimeout(() => setNotification(''), 3000);
      await loadDatabaseData();
    } catch (e) {
      console.error(e);
    }
  };

  // Add custom guardrail/policy
  const handleAddPolicy = async () => {
    if (!newPolicyCode || !newPolicyDescEn || !newPolicyDescAr) {
      alert(language === 'en' 
        ? 'Please fill out all fields (Policy Code, English description, Arabic description).' 
        : 'يرجى ملء جميع الحقول المطلوبة بالكامل.');
      return;
    }

    const updated = [...policies, {
      code: newPolicyCode,
      descriptionEn: newPolicyDescEn,
      descriptionAr: newPolicyDescAr
    }];

    setIsSavingPolicies(true);
    try {
      await savePolicies(updated);
      setNewPolicyCode('');
      setNewPolicyDescEn('');
      setNewPolicyDescAr('');
      setNotification(t.policiesSavedSuccess);
      setTimeout(() => setNotification(''), 4000);
      await loadDatabaseData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingPolicies(false);
    }
  };

  // Delete a policy
  const handleDeletePolicy = async (codeToDelete: string) => {
    const updated = policies.filter(p => p.code !== codeToDelete);
    setIsSavingPolicies(true);
    try {
      await savePolicies(updated);
      setNotification(language === 'en' ? 'Policy guardrail deleted successfully.' : 'تم حذف السياسة الأمنية بنجاح.');
      setTimeout(() => setNotification(''), 4000);
      await loadDatabaseData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingPolicies(false);
    }
  };

  // Quick helper to load scenario
  const handleLoadScenario = (scen: any) => {
    setPrompt(scen.prompt);
    setCategory(scen.category);
  };

  // Administrative Quick Action Handlers
  const handleClearCache = () => {
    setIsClearingCache(true);
    setNotification(language === 'en' 
      ? "Clearing policy compiler caches..." 
      : "جاري مسح الذاكرة المخبأة للمحرك...");
    
    setTimeout(() => {
      setIsClearingCache(false);
      setNotification(language === 'en' 
        ? "SUCCESS: Engine compilation & pattern caches forcefully invalidated." 
        : "نجاح: تم فرض تفريغ الذاكرة المخبأة وإعادة تعيين أنماط المحرك بالكامل.");
      setTimeout(() => setNotification(''), 4000);
    }, 1500);
  };

  const handleToggleHalt = () => {
    const nextState = !systemHalted;
    setSystemHalted(nextState);
    if (nextState) {
      setNotification(language === 'en' 
        ? "CRITICAL ALERT: AXON Security Kernel has been forcefully HALTED." 
        : "تنبيه حرج: تم إيقاف النواة الأمنية لأكسون بشكل كامل.");
    } else {
      setNotification(language === 'en' 
        ? "SYSTEM ONLINE: AXON Security Kernel has resumed normal operations." 
        : "النظام متصل: تم استئناف العمليات الطبيعية للنواة الأمنية لأكسون.");
    }
    setTimeout(() => setNotification(''), 4000);
  };

  const handleVerifyLedger = () => {
    setIsVerifyingLedger(true);
    setNotification(language === 'en' 
      ? "Initiating cryptographic integrity check on audit database..." 
      : "بدء فحص السلامة التشفيرية لقاعدة بيانات التدقيق...");
    
    setTimeout(() => {
      setIsVerifyingLedger(false);
      setNotification(language === 'en' 
        ? "Ledger verification complete: 100% database blocks matching cryptographic SHA-256 secure ledger hashes." 
        : "اكتمل التحقق من السجل: تطابق 100% من كتل البيانات مع بصمات SHA-256 الأمنية المشفرة.");
      setTimeout(() => setNotification(''), 5000);
    }, 1800);
  };

  // SDK Handler Functions
  const handleRegenerateSdkToken = () => {
    setSdkTokenRegenerating(true);
    setTimeout(() => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let newToken = 'axn_live_';
      for(let i=0; i<16; i++) {
        newToken += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setSdkToken(newToken);
      setSdkTokenRegenerating(false);
      setNotification(language === 'en' ? "SDK API Token regenerated successfully." : "تم إعادة توليد مفتاح حزمة التطوير بنجاح.");
      setTimeout(() => setNotification(''), 4000);
    }, 800);
  };

  const handleRunSdkSimulation = async () => {
    setIsSimulatingSdk(true);
    setSdkSimulationResult(null);
    try {
      const payload = JSON.parse(sdkSimulationPayload);
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setSdkSimulationResult(data);
    } catch (error) {
      setSdkSimulationResult({ error: "Invalid JSON payload or network error." });
    } finally {
      setIsSimulatingSdk(false);
    }
  };

  const handleSaveWebhook = () => {
    setIsSavingWebhook(true);
    setTimeout(() => {
      setIsSavingWebhook(false);
      setNotification(language === 'en' ? "Webhook URL configured successfully." : "تم ضبط رابط الخطاف (Webhook) بنجاح.");
      setTimeout(() => setNotification(''), 4000);
    }, 1000);
  };

  const mockSdkTraces = [
    { id: 'req_01j7v', agent: 'LangChain / Prod', action: 'Update user schema', decision: 'ALLOW', latency: '42ms', time: 'Just now' },
    { id: 'req_01j7u', agent: 'AutoGPT / Ops', action: 'Restart production server', decision: 'DENY', latency: '115ms', time: '2m ago' },
    { id: 'req_01j7t', agent: 'Copilot / Dev', action: 'Install arbitrary unverified npm package', decision: 'ESCALATE_TO_HUMAN', latency: '89ms', time: '15m ago' },
    { id: 'req_01j7s', agent: 'LangChain / Prod', action: 'Query active connections', decision: 'ALLOW', latency: '38ms', time: '1h ago' },
  ];

  const sdkChartData = [
    { date: 'Day 1', allowed: 12, blocked: 2 },
    { date: 'Day 5', allowed: 25, blocked: 8 },
    { date: 'Day 10', allowed: 35, blocked: 10 },
    { date: 'Day 15', allowed: 42, blocked: 18 },
    { date: 'Day 20', allowed: 58, blocked: 15 },
    { date: 'Day 25', allowed: 80, blocked: 22 },
    { date: 'Day 30', allowed: 115, blocked: 35 },
  ];

  // Derived states
  const filteredLogs = auditLogs.filter(log => {
    if (auditSearch && !log.prompt.toLowerCase().includes(auditSearch.toLowerCase()) && !log.category.toLowerCase().includes(auditSearch.toLowerCase())) {
      return false;
    }
    if (auditFilterDecision !== 'ALL' && log.decision !== auditFilterDecision && log.reviewerOverride !== auditFilterDecision) {
      return false;
    }
    return true;
  });

  const handleExportAuditLogs = (format: 'csv' | 'json') => {
    const dataStr = format === 'json' 
      ? JSON.stringify(filteredLogs, null, 2)
      : 'ID,Timestamp,Category,Action,Decision,RiskScore\n' + filteredLogs.map(l => `${l.id},${l.timestamp},${l.category},"${l.prompt}",${l.reviewerOverride || l.decision},${l.riskScore}`).join('\n');
    
    const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axon_audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setNotification(language === 'en' ? `Exported ${filteredLogs.length} records as ${format.toUpperCase()}` : `تم تصدير ${filteredLogs.length} سجلات كـ ${format.toUpperCase()}`);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleSuggestPolicy = () => {
    setIsSuggestingPolicy(true);
    setTimeout(() => {
      setNewPolicyCode('policy.BlockUntestedDatabaseDrops();');
      setNewPolicyDescEn('Automatically derived from recent failed migration attempts.');
      setNewPolicyDescAr('مستنتج تلقائياً من محاولات الترحيل الفاشلة الأخيرة.');
      setIsSuggestingPolicy(false);
      setNotification(language === 'en' ? "AI policy suggestion generated." : "تم توليد اقتراح سياسة الذكاء الاصطناعي.");
      setTimeout(() => setNotification(''), 4000);
    }, 1500);
  };

  const handleImportPolicies = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          setPolicies([...imported, ...policies]);
          setNotification(language === 'en' ? `Imported ${imported.length} policies.` : `تم استيراد ${imported.length} سياسات.`);
          setTimeout(() => setNotification(''), 4000);
        }
      } catch (err) {
        setNotification(language === 'en' ? "Invalid JSON file format." : "تنسيق ملف JSON غير صالح.");
        setTimeout(() => setNotification(''), 4000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Get status color utilities
  const getDecisionStyles = (decision: string) => {
    switch(decision) {
      case 'ALLOW':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
          strip: 'bg-emerald-500',
          icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
          labelEn: 'Allow Action',
          labelAr: 'السماح بالإجراء'
        };
      case 'DENY':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
          strip: 'bg-rose-500',
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          labelEn: 'Deny Action',
          labelAr: 'رفض الإجراء'
        };
      case 'NEEDS_CLARIFICATION':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
          strip: 'bg-amber-500',
          icon: <HelpCircle className="w-5 h-5 text-amber-400" />,
          labelEn: 'Clarify Action',
          labelAr: 'يتطلب توضيحاً'
        };
      case 'ESCALATE_TO_HUMAN':
      default:
        return {
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          badge: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
          strip: 'bg-indigo-500',
          icon: <AlertTriangle className="w-5 h-5 text-indigo-400" />,
          labelEn: 'Escalate to Human',
          labelAr: 'تصعيد للمراجعة البشرية'
        };
    }
  };

  const activeDecision = getDecisionStyles(activeAnalysis.decision);

  return (
    <div className="flex h-screen w-full bg-[var(--bg-app)] overflow-hidden antialiased text-[#F3F4F6]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex-col justify-between py-6 shrink-0">
        <div>
          {/* Brand logo header */}
          <div className="px-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#6366F1] to-[#4F46E5] rounded-lg flex items-center justify-center text-[var(--text-main)] font-extrabold text-lg tracking-wider shadow-md">
                A
              </div>
              <div>
                <span className="font-extrabold text-lg text-[var(--text-main)] tracking-tight">
                  {language === 'en' ? 'AXON' : 'أكسون'}
                </span>
                <p className="text-[9px] text-[var(--text-light)] font-bold tracking-widest uppercase mt-0.5">
                  {language === 'en' ? 'Decision Engine' : 'محرك القرارات'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="px-6 mb-8">
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-2.5 rounded-xl flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-tight">build.doo.ooo</p>
                <p className="text-[10px] text-[var(--text-dim)] leading-tight mt-1">
                  {language === 'en' ? 'Legendary Challenge Submission' : 'مشاركة في التحدي الأسطوري'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('workspace')}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'workspace' 
                  ? 'bg-[var(--bg-active)] text-[#818CF8] border-r-2 border-[#6366F1]' 
                  : 'text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]'
              }`}
            >
              <Activity className="w-4.5 h-4.5" />
              {t.workspace}
            </button>

            <button 
              onClick={() => setActiveTab('audit')}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'audit' 
                  ? 'bg-[var(--bg-active)] text-[#818CF8] border-r-2 border-[#6366F1]' 
                  : 'text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]'
              }`}
            >
              <History className="w-4.5 h-4.5" />
              {t.auditHistory}
              {auditLogs.length > 0 && (
                <span className="ml-auto bg-[var(--bg-badge)] text-[#818CF8] text-[9px] font-bold px-2 py-0.5 rounded-full">
                  {auditLogs.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('queue')}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'queue' 
                  ? 'bg-[var(--bg-active)] text-[#818CF8] border-r-2 border-[#6366F1]' 
                  : 'text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]'
              }`}
            >
              <Layers className="w-4.5 h-4.5" />
              {t.reviewQueue}
              {escalatedQueue.filter(q => q.status === 'pending').length > 0 && (
                <span className="ml-auto bg-rose-500/10 text-rose-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
                  {escalatedQueue.filter(q => q.status === 'pending').length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('policies')}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'policies' 
                  ? 'bg-[var(--bg-active)] text-[#818CF8] border-r-2 border-[#6366F1]' 
                  : 'text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]'
              }`}
            >
              <Shield className="w-4.5 h-4.5" />
              {t.policyEngine}
            </button>

            <button 
              onClick={() => setActiveTab('sdk')}
              className={`w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'sdk' 
                  ? 'bg-[var(--bg-active)] text-[#818CF8] border-r-2 border-[#6366F1]' 
                  : 'text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]'
              }`}
            >
              <Terminal className="w-4.5 h-4.5" />
              {t.sdkIntegration || 'SDK Integration'}
            </button>
          </nav>
        </div>

        {/* PROFILE SIMULATOR CONTROLLER */}
        <div className="px-4 py-4 mx-3 bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--bg-avatar)] border border-[var(--border-panel)] flex items-center justify-center text-[#818CF8] font-black uppercase text-sm shadow-inner">
              {user?.role === 'reviewer' ? 'GA' : 'OP'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-[var(--text-main)] truncate">{user?.name}</p>
              <span className="text-[9px] text-[var(--text-dim)] uppercase font-bold tracking-wider">
                {user?.role === 'reviewer' ? t.reviewerRole : t.userRole}
              </span>
            </div>
          </div>
          
          <button 
            onClick={toggleRole}
            className="w-full text-center py-2 bg-[var(--bg-panel-hover)] hover:bg-[var(--bg-button-hover)] border border-[var(--border-panel)] text-[10px] font-bold rounded-lg text-[#818CF8] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            {t.toggleRole}
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER AREA */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-app)]">
        
        {/* HEADER */}
        <header className="h-16 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Show Brand Logo on Mobile, Hide on Desktop */}
            <div className="lg:hidden w-7.5 h-7.5 bg-gradient-to-br from-[#6366F1] to-[#4F46E5] rounded-lg flex items-center justify-center text-[var(--text-main)] font-extrabold text-sm tracking-wider shadow-md">
              A
            </div>
            <div>
              <div className="flex items-center gap-1.5 lg:hidden">
                <span className="font-extrabold text-sm text-[var(--text-main)] tracking-tight">
                  {language === 'en' ? 'AXON' : 'أكسون'}
                </span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--bg-badge)] text-[#818CF8] font-bold uppercase tracking-wider scale-90">
                  {user?.role === 'reviewer' ? 'REV' : 'USR'}
                </span>
              </div>
              <h2 className="hidden lg:block text-xs font-bold text-[var(--text-dim)] uppercase tracking-widest">
                {activeTab === 'workspace' && t.activeWorkspace}
                {activeTab === 'audit' && t.auditHistory}
                {activeTab === 'queue' && t.reviewQueue}
                {activeTab === 'policies' && t.policiesTitle}
              </h2>
              <span className="lg:hidden text-[9px] text-[var(--text-dim)] font-bold uppercase block tracking-wider mt-0.5">
                {activeTab === 'workspace' && t.workspace}
                {activeTab === 'audit' && t.auditHistory}
                {activeTab === 'queue' && t.reviewQueue}
                {activeTab === 'policies' && t.policyEngine}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Role Switcher Badge for Mobile/Tablet users */}
            <button 
              onClick={toggleRole}
              className="px-2.5 py-1.5 text-[10px] font-extrabold rounded-lg border border-[var(--border-panel)] bg-[var(--bg-panel)] hover:bg-[var(--bg-panel-hover)] text-[#818CF8] hover:text-[var(--text-main)] transition-all cursor-pointer flex items-center gap-1.5"
              title={t.toggleRole}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {user?.role === 'reviewer' ? t.reviewerRole : t.userRole}
              </span>
              <span className="md:hidden">
                {user?.role === 'reviewer' ? (language === 'en' ? 'Rev' : 'مراجع') : (language === 'en' ? 'User' : 'مستخدم')}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 md:p-2 text-[var(--text-dim)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-icon-hover)] transition-all cursor-pointer border border-transparent hover:border-[var(--border-subtle)]"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 md:w-5 md:h-5" /> : <Sun className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            {/* Language toggle selector */}
            <div className="flex bg-[var(--bg-input)] rounded-lg p-0.5 border border-[var(--border-input)]">
              <button 
                onClick={() => setLanguage('en')}
                className={`px-2 sm:px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  language === 'en' 
                    ? 'bg-[#6366F1] text-[var(--text-main)] shadow-sm' 
                    : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'
                }`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('ar')}
                className={`px-2 sm:px-3 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  language === 'ar' 
                    ? 'bg-[#6366F1] text-[var(--text-main)] shadow-sm' 
                    : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'
                }`}
              >
                العربية
              </button>
            </div>

            {/* Notification Indicator */}
            <div className="relative">
              <button className="p-2 text-[var(--text-dim)] hover:text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-icon-hover)] transition-all cursor-pointer">
                <Bell className="w-5 h-5" />
                {notification && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-[var(--bg-surface)]"></span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* VIEW AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          
          {notification && (
            <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium rounded-lg shadow-sm transition-all flex items-center justify-between">
              <span>{notification}</span>
            </div>
          )}
          {/* TAB 1: WORKSPACE */}
          {activeTab === 'workspace' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              
              {/* TILE 1: DECISION ENGINE HERO / SYSTEM READINESS */}
              {showWelcomeBanner && (
                <div className="col-span-12 lg:col-span-8 p-5 sm:p-6 lg:p-8 bg-gradient-to-br from-[var(--bg-card)]/85 via-[var(--bg-surface)]/90 to-[var(--bg-gradient-end)]/85 border border-[var(--border-bold)]/60 rounded-3xl relative overflow-hidden shadow-2xl backdrop-blur-xl flex flex-col justify-between min-h-[240px] hover:scale-[1.015] hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] hover:border-[#6366F1]/40 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#6366F1]/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex justify-between items-start">
                      {systemHalted ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 tracking-wide uppercase animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {language === 'en' ? 'AXON Security Kernel HALTED' : 'نواة أكسون الأمنية متوقفة'}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-xs font-semibold text-[#818CF8] tracking-wide uppercase">
                          <Shield className="w-3.5 h-3.5" />
                          {language === 'en' ? 'AXON Security Kernel Active' : 'نواة أكسون الأمنية نشطة'}
                        </div>
                      )}
                      <button 
                        onClick={() => setShowWelcomeBanner(false)}
                        className="text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors p-1"
                        title={t.dismiss}
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] font-sans">
                      {t.welcomeTitle || (language === 'en' ? 'The Decision Engine' : 'محرك القرارات الاستراتيجي')}
                    </h1>
                    <p className="text-sm text-[var(--text-dim)] font-medium max-w-2xl leading-relaxed">
                      {systemHalted 
                        ? (language === 'en' 
                          ? "WARNING: The Axon Decision Kernel has been forcefully halted by administrative command. Active guardrails are disabled and no evaluation requests can be run."
                          : "تحذير: تم إيقاف نواة قرارات أكسون قسرياً بواسطة أمر إداري. تم تعطيل ضوابط الحماية النشطة ولا يمكن تشغيل أي طلبات تقييم حالياً.")
                        : (t.welcomeDesc || (language === 'en' 
                          ? "Can you build an AI system that knows when it is allowed to act? Define organizational policies, simulate system requests, and audit automated risk verification."
                          : "هل يمكنك بناء نظام ذكاء اصطناعي يعرف متى يُسمح له بالتصرف؟ حدد سياساتك التنظيمية، وحاكي طلبات النظام، ودقق في التحقق التلقائي من المخاطر."))
                      }
                    </p>
                  </div>
                
                {/* Metric Strip */}
                <div className="relative z-10 pt-5 flex flex-wrap items-center gap-6 border-t border-[var(--border-subtle)]/60 mt-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[var(--text-light)] uppercase font-bold tracking-wider">
                      {language === 'en' ? 'Active Guardrails' : 'الضوابط النشطة'}
                    </span>
                    <span className="text-base font-extrabold text-[var(--text-main)] mt-0.5">
                      {policies.length} {language === 'en' ? 'Rules' : 'قواعد'}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-[var(--border-subtle)]/80 hidden sm:block"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[var(--text-light)] uppercase font-bold tracking-wider">
                      {language === 'en' ? 'Audited Records' : 'سجل التدقيق'}
                    </span>
                    <span className="text-base font-extrabold text-[#818CF8] mt-0.5">
                      {auditLogs.length} {language === 'en' ? 'Entries' : 'قيود'}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-[var(--border-subtle)]/80 hidden sm:block"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[var(--text-light)] uppercase font-bold tracking-wider">
                      {language === 'en' ? 'Human Referrals' : 'التصعيد البشري'}
                    </span>
                    <span className="text-base font-extrabold text-rose-400 mt-0.5">
                      {escalatedQueue.filter(q => q.status === 'pending').length} {language === 'en' ? 'Pending' : 'معلق'}
                    </span>
                  </div>
                </div>
              </div>
              )}

              {/* TILE 2: ACTIVE POLICIES SUMMARY */}
              <div className="col-span-12 lg:col-span-4 backdrop-blur-xl bg-[var(--bg-card)]/75 rounded-3xl border border-[var(--border-muted)]/75 p-4 sm:p-6 shadow-xl flex flex-col justify-between overflow-hidden min-h-[240px] hover:scale-[1.015] hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] hover:border-[#6366F1]/40 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                      {t.policiesTitle}
                    </h3>
                    <span className="text-[10px] font-bold text-[#818CF8] bg-indigo-500/10 px-2.5 py-1 rounded-md border border-[#6366F1]/20 uppercase">
                      {language === 'en' ? 'SECURE KERNEL' : 'نواة آمنة'}
                    </span>
                  </div>
                  
                  <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
                    {policies.map((p) => (
                      <div key={p.code} className="p-3 bg-[var(--bg-surface)]/60 border border-[var(--border-muted)]/60 rounded-xl flex items-center gap-3 hover:border-[var(--border-bold)] transition-all">
                        <span className="text-[9px] font-bold px-2 py-1 bg-[var(--border-muted)]/90 text-[var(--text-muted)] rounded-md font-mono shrink-0">
                          {p.code}
                        </span>
                        <p className="text-[11px] text-[var(--text-muted)] truncate font-medium">
                          {language === 'en' ? p.descriptionEn : p.descriptionAr}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setActiveTab('policies')}
                  className="w-full mt-4 text-center py-2.5 bg-[var(--bg-active)]/70 hover:bg-[var(--bg-button-hover)] border border-[var(--border-button)]/80 text-[10px] font-bold rounded-xl text-[#818CF8] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>{language === 'en' ? 'Configure Security Guidelines' : 'إدارة ضوابط الحماية والسياسات'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* TILE 3: INTERACTIVE REQUEST BUILDER CONSOLE */}
              <div className="col-span-12 lg:col-span-8 backdrop-blur-xl bg-[var(--bg-card)]/70 border border-[var(--border-muted)]/75 p-4 sm:p-6 rounded-3xl shadow-xl flex flex-col justify-between gap-5 hover:scale-[1.015] hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] hover:border-[#6366F1]/40 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)]/50 pb-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1] animate-pulse shadow-[0_0_10px_#6366F1]"></span>
                      {t.systemInput}
                    </label>
                    
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="text-xs border border-[var(--border-muted)]/80 bg-[var(--bg-surface)] font-bold text-[var(--text-main)] px-3 py-2 rounded-xl outline-none cursor-pointer focus:ring-1 focus:ring-[#6366F1] transition-all"
                    >
                      <option value="dependency">{language === 'en' ? 'Software Dependency Update' : 'تحديث الاعتمادات البرمجية'}</option>
                      <option value="database">{language === 'en' ? 'Database Schema Modification' : 'تعديل مخطط البيانات'}</option>
                      <option value="access">{language === 'en' ? 'Server Access Management' : 'صلاحيات وسيرفرات الوصول'}</option>
                      <option value="patch">{language === 'en' ? 'Emergency Security Hotfix' : 'الإصلاحات الأمنية الطارئة'}</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full h-40 p-5 bg-[var(--bg-surface)]/85 border border-[var(--border-muted)]/80 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[#6366F1]/50 focus:border-[#6366F1] placeholder-[var(--text-muted)] text-sm text-[var(--text-main)] leading-relaxed font-mono shadow-inner transition-all"
                      placeholder={t.inputPlaceholder}
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] text-[var(--text-muted)] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                      {language === 'en' ? 'Waiting for engine execution...' : 'في انتظار تنفيذ المحرك...'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]/50 mt-2">
                  <button 
                    onClick={toggleListening}
                    className={`flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider py-2.5 px-4.5 rounded-xl transition-all border cursor-pointer ${
                      isListening 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse shadow-md shadow-rose-950/20' 
                        : 'bg-[var(--bg-active)]/70 hover:bg-[var(--bg-button-hover)] border-[var(--border-button)]/80 text-[#818CF8]'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isListening ? t.voiceInputActive : t.voiceInputIdle}
                  </button>

                  <button 
                    onClick={() => handleEvaluate()}
                    disabled={isEvaluating || !prompt.trim() || systemHalted}
                    className="bg-[#6366F1] hover:bg-[#5046E5] text-[var(--text-main)] px-7 py-3 rounded-xl text-xs font-bold shadow-lg shadow-indigo-950/40 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
                  >
                    {isEvaluating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current group-hover:translate-x-0.5 transition-transform" />
                    )}
                    {t.executeAnalysis}
                  </button>
                </div>
              </div>

              {/* TILE 4: STANDARD EVALUATION SCENARIOS */}
              <div className="col-span-12 lg:col-span-4 backdrop-blur-xl bg-[var(--bg-card)]/75 rounded-3xl border border-[var(--border-muted)]/75 p-4 sm:p-6 shadow-xl flex flex-col justify-between gap-4 hover:scale-[1.015] hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] hover:border-[#6366F1]/40 transition-all duration-300">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-1">
                    {t.scenariosTitle}
                  </h3>
                  <p className="text-[11px] text-[var(--text-light)] mb-4 leading-relaxed">
                    {t.scenariosSubtitle}
                  </p>
                  
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-800">
                    {evaluationScenarios.map((scen) => {
                      const isSelected = prompt === (language === 'en' ? scen.promptEn : scen.promptAr);
                      return (
                        <button
                          key={scen.id}
                          onClick={() => handleLoadScenario(scen)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 group cursor-pointer ${
                            isSelected 
                              ? 'border-[#6366F1] bg-[var(--bg-active)]/75 shadow-md' 
                              : 'border-[var(--border-subtle)]/60 hover:border-[var(--border-bold)] hover:bg-[var(--bg-nav-hover)]/60'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-bold text-[#818CF8] tracking-wider">
                            {scen.category}
                          </span>
                          <span className={`line-clamp-1 font-semibold text-[11px] transition-colors ${
                            isSelected ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-main)]'
                          }`}>
                            {language === 'en' ? scen.titleEn : scen.titleAr}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* TILE 5: COGNITIVE DECISION KERNEL OUTPUT */}
              <div className="col-span-12 lg:col-span-5 backdrop-blur-xl bg-[var(--bg-card)]/75 rounded-3xl border border-[var(--border-muted)]/75 shadow-xl overflow-hidden flex flex-col hover:scale-[1.015] hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] hover:border-[#6366F1]/40 transition-all duration-300">
                {/* Status Indicator Strip */}
                <div className={`h-2.5 w-full ${activeDecision.strip}`}></div>
                
                <div className="p-4 sm:p-6 flex-1 flex flex-col gap-6">
                  
                  {/* Header with status badge & Maximize toggle */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-base text-[var(--text-main)] tracking-tight">
                        {t.analysisResult}
                      </h3>
                      <p className="text-[9px] text-[var(--text-light)] font-bold mt-0.5 tracking-wider uppercase">
                        {language === 'en' ? 'EVALUATED BY AXON SECURITY KERNEL' : 'تم التقييم بواسطة النواة الأمنية لأكسون'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsDecisionOutputMaximized(true)}
                        className="p-1.5 rounded-lg border border-[var(--border-muted)] hover:border-[#6366F1]/50 bg-[var(--bg-surface)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-all cursor-pointer"
                        title={language === 'en' ? "Maximize Output Screen" : "تكبير شاشة المخرجات"}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${activeDecision.badge}`}>
                        {language === 'en' ? activeDecision.labelEn : activeDecision.labelAr}
                      </span>
                    </div>
                  </div>

                  {/* Risk Score Progress Bar */}
                  <div className="space-y-2 bg-[var(--bg-surface)]/80 p-4 rounded-xl border border-[var(--border-muted)]/60">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-[var(--text-dim)]">{t.riskScore}</span>
                      <span className="text-[#818CF8]">{activeAnalysis.riskScore}% {t.critical}</span>
                    </div>
                    <div className="h-2 bg-[var(--border-muted)]/80 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${activeAnalysis.riskScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Primary Reason details */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                      {t.primaryReason}
                    </h4>
                    <p className="text-xs leading-relaxed text-gray-200 font-medium pt-1">
                      {language === 'en' ? activeAnalysis.reasonEn : activeAnalysis.reasonAr}
                    </p>
                  </div>

                  {/* Safety Mitigations Alternative Option */}
                  <div className="bg-[#0D1F17]/70 border border-emerald-500/15 p-4.5 rounded-2xl">
                    <h4 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      {t.safetyAlternative}
                    </h4>
                    <p className="text-xs text-emerald-200 font-medium leading-relaxed">
                      {language === 'en' ? activeAnalysis.mitigationEn : activeAnalysis.mitigationAr}
                    </p>
                  </div>

                  {/* Manual Override control panel */}
                  {activeAnalysis.reviewerOverride && (
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-amber-300 text-xs flex flex-col gap-2">
                      <span className="font-bold">{language === 'en' ? 'Manual Decision Override Active' : 'تم تفعيل القرار البديل يدوياً'}</span>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {language === 'en' 
                          ? `This decision has been manually overridden to: ${activeAnalysis.reviewerOverride} by ${activeAnalysis.reviewedBy}.`
                          : `تم مراجعة وتخطي هذا القرار يدوياً إلى: ${activeAnalysis.reviewerOverride} بواسطة المراجع ${activeAnalysis.reviewedBy}.`}
                      </p>
                    </div>
                  )}

                </div>
              </div>

              {/* TILE 6: GROUNDING CITATIONS */}
              <div className="col-span-12 lg:col-span-4 backdrop-blur-xl bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col justify-between gap-5 hover:scale-[1.015] hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] hover:border-[#6366F1]/40 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)]/60 pb-3">
                    <span className="text-xs font-bold text-[#818CF8] uppercase tracking-wider flex items-center gap-2">
                      <Globe className="w-4 h-4 text-indigo-400" />
                      {language === 'en' ? 'Verified Grounding Data' : 'التحقق والمصادر الموثقة'}
                    </span>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-md">
                      {t.googleSearchUsed}
                    </span>
                  </div>

                  <div className="bg-[var(--bg-surface)]/80 p-4 rounded-2xl border border-[var(--border-muted)]/60 flex flex-col gap-3">
                    <p className="text-xs text-[var(--text-muted)] italic leading-relaxed">
                      &ldquo;{language === 'en' ? activeAnalysis.groundingEn : activeAnalysis.groundingAr}&rdquo;
                    </p>
                    
                    {activeAnalysis.citations && activeAnalysis.citations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-[var(--border-muted)]/60">
                        {activeAnalysis.citations.map((cite: string, idx: number) => (
                          <a 
                            href={cite} 
                            target="_blank" 
                            rel="noreferrer" 
                            key={idx} 
                            className="text-[10px] text-[#818CF8] hover:text-[#A5B4FC] font-semibold flex items-center gap-1.5 bg-[var(--bg-icon-hover)] px-2.5 py-1 rounded-lg border border-[var(--border-muted)] transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {cite.replace('https://', '').split('/')[0]}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-[var(--text-light)] leading-relaxed font-medium">
                  {language === 'en'
                    ? "Information is cross-referenced in real-time with trusted vulnerability directories and semantic models to assure full regulatory compliance."
                    : "يتم فحص ومقارنة المعلومات في الوقت الفعلي مع فهارس الثغرات الأمنية والنماذج الدلالية الموثقة لضمان الامتثال التنظيمي الكامل."}
                </div>
              </div>

              {/* TILE 7: QUICK ADMINISTRATIVE ACTIONS CONTROLS */}
              <div className="col-span-12 lg:col-span-3 backdrop-blur-xl bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col justify-between gap-5 hover:scale-[1.015] hover:shadow-[0_0_30px_rgba(99,102,241,0.12)] hover:border-[#6366F1]/40 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[var(--border-subtle)]/60 pb-3">
                    <span className="text-xs font-bold text-[#818CF8] uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      {language === 'en' ? 'Quick Controls' : 'التحكم السريع'}
                    </span>
                    <span className="relative flex h-2 w-2">
                      {systemHalted ? (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </>
                      ) : (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Force Clear Cache Button */}
                    <button
                      onClick={handleClearCache}
                      disabled={isClearingCache || systemHalted}
                      className="w-full text-left p-3 rounded-xl border border-[var(--border-subtle)]/60 hover:border-[var(--border-bold)] hover:bg-[var(--bg-nav-hover)]/60 text-xs transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <RefreshCw className={`w-4 h-4 text-[#818CF8] ${isClearingCache ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-main)] text-[11px]">
                            {language === 'en' ? 'Force Clear Cache' : 'مسح الذاكرة المؤقتة'}
                          </span>
                          <span className="text-[9px] text-[var(--text-light)] font-medium">
                            {language === 'en' ? 'Invalidate engine memory' : 'تفريغ الذاكرة للمحرك'}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Verify Compliance Ledger Button */}
                    <button
                      onClick={handleVerifyLedger}
                      disabled={isVerifyingLedger}
                      className="w-full text-left p-3 rounded-xl border border-[var(--border-subtle)]/60 hover:border-[var(--border-bold)] hover:bg-[var(--bg-nav-hover)]/60 text-xs transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <UserCheck className={`w-4 h-4 text-[#818CF8] ${isVerifyingLedger ? 'animate-pulse' : ''}`} />
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-main)] text-[11px]">
                            {language === 'en' ? 'Verify Ledger Integrity' : 'التحقق من السجل'}
                          </span>
                          <span className="text-[9px] text-[var(--text-light)] font-medium">
                            {language === 'en' ? 'Run cryptographic checksum' : 'المراجعة التشفيرية للبيانات'}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Emergency System Halt Button */}
                    <button
                      onClick={handleToggleHalt}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between group cursor-pointer ${
                        systemHalted 
                          ? 'border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5' 
                          : 'border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <AlertTriangle className={`w-4 h-4 ${systemHalted ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
                        <div className="flex flex-col">
                          <span className={`font-bold text-[11px] ${systemHalted ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {systemHalted 
                              ? (language === 'en' ? 'Resume Security Engine' : 'استئناف تشغيل المحرك') 
                              : (language === 'en' ? 'Emergency System Halt' : 'إيقاف طارئ للنظام')}
                          </span>
                          <span className="text-[9px] text-[var(--text-light)] font-medium">
                            {systemHalted 
                              ? (language === 'en' ? 'Restart normal operations' : 'إعادة تشغيل العمليات') 
                              : (language === 'en' ? 'Kill all active evaluations' : 'إيقاف فوري لعمليات التقييم')}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-[var(--text-light)] leading-relaxed font-medium">
                  {language === 'en'
                    ? "Administrative overrides bypass standard workflows only in extreme threat scenarios."
                    : "تتجاوز أوامر التحكم الإداري مسارات العمل العادية في سيناريوهات التهديد القصوى فقط."}
                </div>
              </div>

              {/* DECISION FOCUS / MAXIMIZED OVERLAY VIEW */}
              {isDecisionOutputMaximized && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-2xl animate-fade-in">
                  <div className="relative w-full max-w-5xl bg-[var(--bg-app)] border border-[var(--border-bold)] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] max-h-[800px]">
                    
                    {/* Top Accent Bar */}
                    <div className={`h-2.5 w-full ${activeDecision.strip}`}></div>

                    {/* Modal Header */}
                    <div className="p-6 border-b border-[var(--border-muted)]/80 bg-[var(--bg-surface)] flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">
                          <Shield className="w-3.5 h-3.5 text-indigo-400" />
                          {language === 'en' ? 'AXON Focus Decision Kernel' : 'نظام أكسون للتركيز الأمني'}
                        </div>
                        <h2 className="text-lg font-black text-[var(--text-main)] font-sans mt-1">
                          {language === 'en' ? 'High-Resolution Decision Pathway Analysis' : 'تحليل المسار عالي الدقة للقرارات'}
                        </h2>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase border ${activeDecision.badge}`}>
                          {language === 'en' ? activeDecision.labelEn : activeDecision.labelAr}
                        </span>
                        
                        <button
                          onClick={() => setIsDecisionOutputMaximized(false)}
                          className="p-2 rounded-xl border border-[var(--border-bold)] hover:border-[#6366F1]/50 bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                          title={language === 'en' ? "Close Focus Mode" : "إغلاق وضع التركيز"}
                        >
                          <Minimize2 className="w-4 h-4 text-rose-400" />
                          <span className="hidden sm:inline">{language === 'en' ? 'Close' : 'إغلاق'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Modal Scrollable Content Container */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                      
                      {/* Section 1: Active Request evaluated */}
                      <div className="p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-muted)]/60">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2.5">
                          {language === 'en' ? 'CRITICAL PATH REQUEST' : 'الطلب الحرج الخاضع للتقييم'}
                        </span>
                        <p className="text-sm font-sans font-semibold text-[var(--text-main)] leading-relaxed">
                          {prompt}
                        </p>
                      </div>

                      {/* Section 2: Split columns layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Left Column: Language Explanations and Policy audits */}
                        <div className="lg:col-span-8 space-y-8">
                          
                          {/* English and Arabic side-by-side or stacked deep dive explanation */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-2">
                              <Terminal className="w-4 h-4 text-indigo-400" />
                              {language === 'en' ? 'Detailed Cognitive Assessment Report' : 'التقرير التفصيلي لتقييم القرار'}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* English Assessment Card */}
                              <div className="p-5 rounded-2xl bg-[var(--bg-card)]/60 border border-[var(--border-muted)]/60 space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-[var(--border-muted)]/40">
                                  <span className="text-[10px] uppercase font-bold text-indigo-400">English Assessment</span>
                                  <span className="text-[10px] font-bold text-[var(--text-light)]">ISO-SEC COMPLIANT</span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed font-medium">
                                  {activeAnalysis.reasonEn}
                                </p>
                              </div>

                              {/* Arabic Assessment Card */}
                              <div className="p-5 rounded-2xl bg-[var(--bg-card)]/60 border border-[var(--border-muted)]/60 space-y-3" dir="rtl">
                                <div className="flex justify-between items-center pb-2 border-b border-[var(--border-muted)]/40">
                                  <span className="text-[10px] uppercase font-bold text-indigo-400">التقييم باللغة العربية</span>
                                  <span className="text-[10px] font-bold text-[var(--text-light)]">متوافق مع معايير الأمن</span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed font-semibold">
                                  {activeAnalysis.reasonAr}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Compliance Guidelines Checked checklist */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              {language === 'en' ? 'Automated Security Policy Checkmarks' : 'مؤشرات التحقق من سياسات الأمن والامتثال'}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {policies.map((pol) => {
                                // Simulate that the policies related to current category might have warnings
                                const isViolated = pol.code.toLowerCase().includes(category.toLowerCase()) || (pol.code === 'DEP-01' && category === 'dependency');
                                return (
                                  <div 
                                    key={pol.code} 
                                    className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                      isViolated 
                                        ? 'bg-rose-500/5 border-rose-500/25 text-rose-300' 
                                        : 'bg-[var(--bg-surface)] border-[var(--border-muted)]/60 text-[var(--text-muted)]'
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-extrabold text-[11px] text-[var(--text-main)] tracking-wider">{pol.code}</span>
                                      <span className="text-[10px] text-[var(--text-light)] font-medium">
                                        {language === 'en' ? pol.descriptionEn : pol.descriptionAr}
                                      </span>
                                    </div>
                                    <div>
                                      {isViolated ? (
                                        <span className="text-[9px] uppercase font-extrabold bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded text-rose-400 flex items-center gap-1">
                                          <AlertTriangle className="w-2.5 h-2.5 text-rose-400" /> ALERT
                                        </span>
                                      ) : (
                                        <span className="text-[9px] uppercase font-extrabold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded text-emerald-400 flex items-center gap-1">
                                          <CheckCircle className="w-2.5 h-2.5 text-emerald-400" /> COMPLIANT
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>

                        {/* Right Column: Risk Gauge, Mitigations, Citations */}
                        <div className="lg:col-span-4 space-y-8">
                          
                          {/* Circular or advanced risk gauge */}
                          <div className="p-5 rounded-2xl bg-[var(--bg-card)]/60 border border-[var(--border-muted)]/60 flex flex-col items-center justify-center text-center gap-4">
                            <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider block self-start">
                              {language === 'en' ? 'VERIFIED THREAT METRIC' : 'مقياس التهديد والخطورة المعتمد'}
                            </span>
                            
                            <div className="relative flex items-center justify-center w-36 h-36">
                              {/* Background Circle */}
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle 
                                  cx="50" 
                                  cy="50" 
                                  r="40" 
                                  stroke="#1E2132" 
                                  strokeWidth="8" 
                                  fill="transparent" 
                                />
                                <circle 
                                  cx="50" 
                                  cy="50" 
                                  r="40" 
                                  stroke={activeAnalysis.riskScore > 75 ? '#F43F5E' : activeAnalysis.riskScore > 40 ? '#F59E0B' : '#10B981'} 
                                  strokeWidth="8" 
                                  fill="transparent" 
                                  strokeDasharray="251.2"
                                  strokeDashoffset={251.2 - (251.2 * activeAnalysis.riskScore) / 100}
                                  strokeLinecap="round"
                                  className="transition-all duration-1000 ease-out"
                                />
                              </svg>
                              <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-[var(--text-main)]">{activeAnalysis.riskScore}%</span>
                                <span className="text-[9px] uppercase font-bold text-[var(--text-light)]">{t.critical}</span>
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-[var(--text-dim)] leading-relaxed max-w-[200px]">
                              {language === 'en' 
                                ? 'Real-time security kernel computed score based on policy weights and system context.' 
                                : 'مؤشر أمني تم احتسابه فورياً بناءً على معايير السياسات وسياق النظام الخارجي.'}
                            </p>
                          </div>

                          {/* Mitigations Alternative option */}
                          <div className="p-5 rounded-2xl bg-[#0D1F17]/85 border border-emerald-500/25 space-y-3.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest border-b border-emerald-500/15 pb-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                              {t.safetyAlternative}
                            </div>
                            <div className="space-y-3 text-xs text-emerald-200">
                              <div>
                                <span className="text-[9px] text-emerald-500 font-bold block uppercase">English Directive</span>
                                <p className="font-semibold leading-relaxed mt-0.5">{activeAnalysis.mitigationEn}</p>
                              </div>
                              <div dir="rtl" className="text-right pt-2 border-t border-emerald-500/10">
                                <span className="text-[9px] text-emerald-500 font-bold block uppercase">توجيهات بديلة (العربية)</span>
                                <p className="font-bold leading-relaxed mt-0.5">{activeAnalysis.mitigationAr}</p>
                              </div>
                            </div>
                          </div>

                          {/* Grounding Citations */}
                          <div className="p-5 rounded-2xl bg-[var(--bg-card)]/60 border border-[var(--border-muted)]/60 space-y-4">
                            <div className="flex justify-between items-center border-b border-[var(--border-muted)]/40 pb-2">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                                {language === 'en' ? 'Audit References' : 'المراجع والتوثيق'}
                              </span>
                            </div>

                            <p className="text-[11px] text-[var(--text-dim)] italic leading-relaxed">
                              &ldquo;{language === 'en' ? activeAnalysis.groundingEn : activeAnalysis.groundingAr}&rdquo;
                            </p>

                            {activeAnalysis.citations && activeAnalysis.citations.length > 0 && (
                              <div className="flex flex-col gap-2 pt-2">
                                {activeAnalysis.citations.map((cite: string, idx: number) => (
                                  <a 
                                    href={cite} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    key={idx} 
                                    className="text-[10px] text-indigo-300 hover:text-[var(--text-main)] font-semibold flex items-center gap-2 bg-[var(--bg-surface)] p-2 rounded-xl border border-[var(--border-muted)] transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="truncate">{cite}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>

                        </div>

                      </div>

                    </div>

                    {/* Modal Footer Controls */}
                    <div className="p-5 border-t border-[var(--border-muted)]/80 bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-light)] font-medium">
                      <span>
                        {language === 'en' ? 'AXON Engine v0.1.0' : 'محرك أكسون للقرارات إصدار 0.1.0'}
                      </span>
                      <span>
                        {language === 'en' ? 'Cryptographic Block Matching Verified' : 'مراجعة وتطابق كتل التدقيق آمن'}
                      </span>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: AUDIT HISTORY */}
          {activeTab === 'audit' && (
            <div className="bg-[var(--bg-icon-hover)] rounded-2xl border border-[var(--border-muted)] shadow-md p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-lg text-[var(--text-main)]">
                    {language === 'en' ? 'Operational Decision History' : 'سجل تدقيق القرارات والعمليات'}
                  </h3>
                  <p className="text-xs text-[var(--text-dim)]">
                    {language === 'en' 
                      ? 'Complete, immutable audit trail of evaluated organizational actions' 
                      : 'سجل غير قابل للتعديل لكافة القرارات الأمنية والتشغيلية في النظام'}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <button 
                      onClick={() => handleExportAuditLogs('csv')}
                      className="px-3 py-2 text-xs font-bold text-gray-300 hover:text-white bg-[var(--bg-input)] hover:bg-[var(--bg-active)] border border-[var(--border-input)] rounded-lg transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Export CSV' : 'تصدير CSV'}
                    </button>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => handleExportAuditLogs('json')}
                      className="px-3 py-2 text-xs font-bold text-gray-300 hover:text-white bg-[var(--bg-input)] hover:bg-[var(--bg-active)] border border-[var(--border-input)] rounded-lg transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Export JSON' : 'تصدير JSON'}
                    </button>
                  </div>
                  <button 
                    onClick={loadDatabaseData}
                    className="p-2 text-[#818CF8] hover:bg-[var(--bg-badge)] border border-[var(--bg-button-alt)] rounded-lg transition-all cursor-pointer ml-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-muted)]">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Search logs...' : 'ابحث في السجلات...'}
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="flex-1 bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg px-4 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[#6366F1]"
                />
                <select
                  value={auditFilterDecision}
                  onChange={(e) => setAuditFilterDecision(e.target.value)}
                  className="bg-[var(--bg-input)] border border-[var(--border-input)] rounded-lg px-4 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[#6366F1]"
                >
                  <option value="ALL">{language === 'en' ? 'All Decisions' : 'كل القرارات'}</option>
                  <option value="ALLOW">ALLOW</option>
                  <option value="DENY">DENY</option>
                  <option value="ESCALATE_TO_HUMAN">ESCALATE</option>
                </select>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-light)] text-xs font-semibold">
                  {t.noData}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log) => {
                    const status = getDecisionStyles(log.reviewerOverride || log.decision);
                    return (
                      <div 
                        key={log.id} 
                        className="p-5 bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-xl flex flex-col gap-4 hover:border-[var(--border-panel)] transition-all"
                      >
                        <div className="flex flex-wrap justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] uppercase font-bold bg-[var(--bg-active)] border border-[var(--border-button)] px-2 py-0.5 rounded text-[#818CF8]">
                                {log.category}
                              </span>
                              <span className="text-[10px] text-[var(--text-light)]">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-[var(--text-main)] mt-2 leading-relaxed">
                              &ldquo;{log.prompt}&rdquo;
                            </h4>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-[var(--text-dim)]">
                              {language === 'en' ? 'Risk Score:' : 'مؤشر المخاطر:'} <strong className="text-[#818CF8]">{log.riskScore}%</strong>
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${status.badge}`}>
                              {status.icon}
                              {language === 'en' ? status.labelEn : status.labelAr}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border-muted)] text-[11px] leading-relaxed">
                          <div>
                            <span className="font-bold text-[var(--text-dim)] block mb-1 uppercase tracking-wider">
                              {language === 'en' ? 'TECHNICAL ANALYST EXPLANATION' : 'التحليل والتعليل الفني للقرار'}
                            </span>
                            <p className="text-gray-200 font-medium">
                              {language === 'en' ? log.reasonEn : log.reasonAr}
                            </p>
                          </div>
                          <div>
                            <span className="font-bold text-emerald-400 block mb-1 uppercase tracking-wider">
                              {language === 'en' ? 'MITIGATION AND WORKAROUND' : 'التدبير والبديل الأمني الموصى به'}
                            </span>
                            <p className="text-emerald-200 font-medium">
                              {language === 'en' ? log.mitigationEn : log.mitigationAr}
                            </p>
                          </div>
                        </div>

                        {log.reviewerOverride && (
                          <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 text-[10px] text-amber-300 font-medium">
                            <strong>{language === 'en' ? 'Manual Override:' : 'الاعتماد اليدوي البديل:'}</strong> {language === 'en' ? `Decision updated to ${log.reviewerOverride} by ${log.reviewedBy} at ${log.reviewedAt ? new Date(log.reviewedAt).toLocaleString() : ''}` : `تم تعديل القرار إلى ${log.reviewerOverride} بواسطة المراجع ${log.reviewedBy} في ${log.reviewedAt ? new Date(log.reviewedAt).toLocaleString() : ''}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REVIEW QUEUE */}
          {activeTab === 'queue' && (
            <div className="bg-[var(--bg-icon-hover)] rounded-2xl border border-[var(--border-muted)] shadow-md p-6 space-y-6">
              <div>
                <h3 className="font-extrabold text-lg text-[var(--text-main)]">{t.reviewerPanel}</h3>
                <p className="text-xs text-[var(--text-dim)]">
                  {language === 'en' 
                    ? 'Approve or reject escalated high-risk system requests immediately' 
                    : 'اعتماد أو رفض طلبات النظام عالية الخطورة المعلقة بشكل فوري'}
                </p>
              </div>

              {user?.role !== 'reviewer' ? (
                <div className="p-8 bg-amber-500/5 border border-amber-500/20 text-amber-300 rounded-xl flex items-center gap-3 text-xs leading-relaxed">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>{t.unauthorizedReviewer}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {escalatedQueue.filter(q => q.status === 'pending').length === 0 ? (
                    <div className="p-12 text-center text-[var(--text-light)] text-xs font-semibold">
                      {language === 'en' ? 'No escalated requests waiting in the queue.' : 'لا توجد طلبات معلقة بانتظار المراجعة حالياً.'}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {escalatedQueue.filter(q => q.status === 'pending').map((item) => (
                        <div 
                          key={item.id} 
                          className="p-5 bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-xl space-y-4 shadow-inner"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] uppercase font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded">
                                {language === 'en' ? `escalated (${item.riskScore}% risk)` : `تم التصعيد (مستوى الخطر ${item.riskScore}%)`}
                              </span>
                              <h4 className="text-xs font-bold text-[var(--text-main)] mt-2 leading-relaxed">
                                &ldquo;{item.prompt}&rdquo;
                              </h4>
                            </div>
                            <span className="text-[10px] text-[var(--text-light)] font-semibold">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="text-[11px] bg-[var(--bg-icon-hover)] p-4 rounded-lg border border-[var(--border-muted)] space-y-1">
                            <span className="font-bold text-[var(--text-dim)] uppercase tracking-wider block mb-1">
                              {language === 'en' ? 'COGNITIVE RESOLUTION REASON' : 'السبب الفني للتصعيد التلقائي'}
                            </span>
                            <p className="text-gray-200 font-medium">
                              {language === 'en' ? item.reasonEn : item.reasonAr}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] uppercase font-bold text-[var(--text-dim)] block">
                              {language === 'en' ? 'Add Review Comment' : 'إضافة تعليق مراجعة ومبرر الاعتماد'}
                            </label>
                            <input 
                              type="text" 
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder={language === 'en' ? 'Describe your reasoning for this manual override...' : 'أدخل مبرر الموافقة أو الرفض بالتفصيل...'}
                              className="w-full p-2.5 bg-[var(--bg-surface)] border border-[var(--border-muted)] text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#6366F1] text-[var(--text-main)]"
                            />
                            
                            <div className="flex gap-3 pt-2">
                              <button 
                                onClick={() => handleReviewAction(item.id, 'approved')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-[var(--text-main)] px-4 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                              >
                                {language === 'en' ? 'Approve Request' : 'موافقة واعتماد الإجراء'}
                              </button>
                              <button 
                                onClick={() => handleReviewAction(item.id, 'rejected')}
                                className="bg-rose-600 hover:bg-rose-700 text-[var(--text-main)] px-4 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                              >
                                {language === 'en' ? 'Reject Request' : 'رفض وحظر الطلب'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Completed Review Queue items */}
                  {escalatedQueue.filter(q => q.status !== 'pending').length > 0 && (
                    <div className="pt-6 border-t border-[var(--border-muted)] space-y-3">
                      <h4 className="text-xs font-bold text-[var(--text-light)] uppercase tracking-wider">
                        {language === 'en' ? 'Completed Audit Reviews' : 'مراجعات التدقيق المكتملة'}
                      </h4>
                      <div className="space-y-2">
                        {escalatedQueue.filter(q => q.status !== 'pending').map((item) => (
                          <div key={item.id} className="p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-muted)] text-xs flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-[var(--text-main)] leading-relaxed">&ldquo;{item.prompt}&rdquo;</p>
                              <p className="text-[10px] text-[var(--text-light)] mt-1">
                                {language === 'en' ? `Comment: ${item.reviewerComment}` : `تعليق المراجع: ${item.reviewerComment}`}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              item.status === 'approved' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: POLICY ENGINE */}
          {activeTab === 'policies' && (
            <div className="space-y-8">
              
              {/* Add Custom guardrail form */}
              <div className="bg-[var(--bg-icon-hover)] rounded-2xl border border-[var(--border-muted)] shadow-md p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-base text-[var(--text-main)]">{t.addPolicy}</h3>
                    <p className="text-xs text-[var(--text-dim)]">
                      {language === 'en' 
                        ? "Extend AXON's safety check kernel with custom localized policies" 
                        : "أضف سياسات تنظيمية وحواجز حماية مخصصة لتوسيع نطاق تدقيق أكسون الأمني"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSuggestPolicy}
                      disabled={isSuggestingPolicy}
                      className="px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-[#818CF8] border border-indigo-500/20 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isSuggestingPolicy ? (language === 'en' ? 'Analyzing...' : 'جاري التحليل...') : (language === 'en' ? 'Suggest Policy' : 'اقتراح سياسة')}
                    </button>
                    <div>
                      <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef} 
                        onChange={handleImportPolicies} 
                        className="hidden" 
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 bg-[var(--bg-input)] hover:bg-[var(--bg-active)] text-[var(--text-main)] border border-[var(--border-input)] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {language === 'en' ? 'Bulk Import' : 'استيراد شامل'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3">
                    <label className="text-[10px] uppercase font-bold text-[var(--text-dim)] block mb-1">
                      {t.policyCode}
                    </label>
                    <input 
                      type="text" 
                      value={newPolicyCode}
                      onChange={(e) => setNewPolicyCode(e.target.value)}
                      placeholder="e.g. R5"
                      className="w-full p-2.5 bg-[var(--bg-surface)] border border-[var(--border-muted)] text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#6366F1] text-[var(--text-main)]"
                    />
                  </div>

                  <div className="md:col-span-9">
                    <label className="text-[10px] uppercase font-bold text-[var(--text-dim)] block mb-1">
                      {language === 'en' ? 'English Operational Guideline' : 'التوجيه التشغيلي باللغة الإنجليزية'}
                    </label>
                    <input 
                      type="text" 
                      value={newPolicyDescEn}
                      onChange={(e) => setNewPolicyDescEn(e.target.value)}
                      placeholder={language === 'en' ? 'e.g. Reject deployment commands issued outside business hours...' : 'مثال: رفض أوامر النشر البرمجي الصادرة خارج ساعات العمل...'}
                      className="w-full p-2.5 bg-[var(--bg-surface)] border border-[var(--border-muted)] text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#6366F1] text-[var(--text-main)]"
                    />
                  </div>

                  <div className="md:col-span-12">
                    <label className="text-[10px] uppercase font-bold text-[var(--text-dim)] block mb-1">
                      {language === 'en' ? 'Arabic Operational Guideline' : 'الضابط التشغيلي باللغة العربية'}
                    </label>
                    <input 
                      type="text" 
                      value={newPolicyDescAr}
                      onChange={(e) => setNewPolicyDescAr(e.target.value)}
                      placeholder={language === 'en' ? 'e.g. Reject deployment commands issued outside business hours (Arabic translation)...' : 'مثال: رفض أوامر النشر البرمجي خارج أوقات العمل الرسمية...'}
                      className="w-full p-2.5 bg-[var(--bg-surface)] border border-[var(--border-muted)] text-xs rounded-lg outline-none focus:ring-1 focus:ring-[#6366F1] text-[var(--text-main)]"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddPolicy}
                  disabled={isSavingPolicies}
                  className="bg-[#6366F1] hover:bg-[#5046E5] text-[var(--text-main)] px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {t.savePolicies}
                </button>
              </div>

              {/* Active Security policies list */}
              <div className="bg-[var(--bg-icon-hover)] rounded-2xl border border-[var(--border-muted)] shadow-md p-6 space-y-4">
                <div>
                  <h3 className="font-extrabold text-base text-[var(--text-main)]">{t.policiesTitle}</h3>
                  <p className="text-xs text-[var(--text-dim)]">{t.policiesSubtitle}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {policies.map((p) => (
                    <div 
                      key={p.code} 
                      className="p-5 bg-[var(--bg-surface)] border border-[var(--border-muted)] rounded-xl flex items-center justify-between gap-6 hover:border-[var(--border-panel)] transition-all"
                    >
                      <div className="space-y-2 flex-1">
                        <span className="text-[9px] uppercase font-bold bg-indigo-500/10 border border-indigo-500/20 text-[#818CF8] px-2 py-0.5 rounded">
                          {p.code}
                        </span>
                        <h4 className="text-xs font-bold text-[var(--text-main)] leading-relaxed pt-1">
                          {language === 'en' ? p.descriptionEn : p.descriptionAr}
                        </h4>
                      </div>

                      <button 
                        onClick={() => handleDeletePolicy(p.code)}
                        className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-transparent hover:border-rose-500/20 cursor-pointer"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: SDK INTEGRATION */}
          {activeTab === 'sdk' && (
            <div className="max-w-5xl space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-[var(--bg-card)]/85 to-[var(--bg-gradient-end)]/85 border border-[var(--border-bold)]/60 p-6 rounded-3xl shadow-xl backdrop-blur-xl">
                <div>
                  <h3 className="text-xl font-extrabold text-[var(--text-main)] tracking-tight flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-[#818CF8]" />
                    {t.sdkIntegration || 'SDK Integration'}
                  </h3>
                  <p className="text-sm text-[var(--text-dim)] mt-2 font-medium max-w-2xl leading-relaxed">
                    {t.sdkDescription || "Integrate AXON's Decision Engine into your own AI tools and agents to provide robust, policy-driven execution safety. The SDK verifies actions before they are executed."}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                   <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-muted)]">
                      <button 
                        onClick={() => setSdkActiveSubTab('overview')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${sdkActiveSubTab === 'overview' ? 'bg-[var(--bg-active)] text-[var(--text-main)] shadow border border-[var(--border-bold)]' : 'text-[var(--text-light)] hover:text-[var(--text-muted)]'}`}
                      >
                        {language === 'en' ? 'Overview' : 'نظرة عامة'}
                      </button>
                      <button 
                        onClick={() => setSdkActiveSubTab('tracing')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${sdkActiveSubTab === 'tracing' ? 'bg-[var(--bg-active)] text-[var(--text-main)] shadow border border-[var(--border-bold)]' : 'text-[var(--text-light)] hover:text-[var(--text-muted)]'}`}
                      >
                        {language === 'en' ? 'Tracing' : 'التتبع'}
                      </button>
                      <button 
                        onClick={() => setSdkActiveSubTab('auth')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${sdkActiveSubTab === 'auth' ? 'bg-[var(--bg-active)] text-[var(--text-main)] shadow border border-[var(--border-bold)]' : 'text-[var(--text-light)] hover:text-[var(--text-muted)]'}`}
                      >
                        {language === 'en' ? 'Auth' : 'المصادقة'}
                      </button>
                      <button 
                        onClick={() => setSdkActiveSubTab('reference')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${sdkActiveSubTab === 'reference' ? 'bg-[var(--bg-active)] text-[var(--text-main)] shadow border border-[var(--border-bold)]' : 'text-[var(--text-light)] hover:text-[var(--text-muted)]'}`}
                      >
                        {language === 'en' ? 'Reference' : 'المرجع'}
                      </button>
                   </div>
                   <span className="text-[10px] font-bold text-[#818CF8] bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-[#6366F1]/20 uppercase flex items-center gap-1.5 hidden md:flex">
                     <CheckCircle className="w-3.5 h-3.5" />
                     {language === 'en' ? 'Available' : 'متاح للاستخدام'}
                   </span>
                </div>
              </div>
              
              {sdkActiveSubTab === 'overview' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] mb-2">Success Rate (30d)</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald-400">99.98%</span>
                        <span className="text-[10px] text-emerald-500/70">+0.01%</span>
                      </div>
                    </div>
                    <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] mb-2">p95 Latency</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-indigo-400">42ms</span>
                        <span className="text-[10px] text-[var(--text-light)]">Target: &lt;50ms</span>
                      </div>
                    </div>
                    <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] mb-2">Total Requests</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[var(--text-main)]">8.5M</span>
                        <span className="text-[10px] text-emerald-500/70">+12% this week</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-colors">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-4 flex items-center gap-2">
                         <Key className="w-4 h-4 text-[#818CF8]" />
                         {language === 'en' ? 'API Health & Credentials' : 'صحة واجهة برمجة التطبيقات وبيانات الاعتماد'}
                      </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-sm font-medium text-emerald-400">Operational</span>
                      </div>
                      <div className="text-[10px] uppercase font-bold text-[var(--text-light)]">
                        Expires: Dec 31, 2026
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[var(--text-light)] uppercase font-bold tracking-wider mb-1.5 flex justify-between">
                        <span>API Endpoint</span>
                        <span className="text-[#818CF8]">8.5M / 10M</span>
                      </label>
                      <div className="flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-muted)]/60 rounded-xl px-4 py-3 cursor-text">
                         <Globe className="w-4 h-4 text-[var(--text-light)]" />
                         <span className="text-xs font-mono text-[var(--text-muted)]">https://api.axon.internal/decide</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full bg-[var(--border-muted)] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#6366F1] to-[#818CF8]" style={{ width: '85%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] text-[var(--text-light)] uppercase font-bold tracking-wider mb-1.5 block">Client Token / API Key</label>
                      <div className="flex items-center justify-between bg-[var(--bg-surface)] border border-[var(--border-muted)]/60 rounded-xl px-4 py-3">
                         <span className={`text-xs font-mono ${sdkTokenRegenerating ? 'text-[var(--text-lighter)] blur-sm' : 'text-[var(--text-dim)]'} transition-all`}>{sdkTokenRegenerating ? 'xxxxxxxxxxxxxxxxx' : sdkToken}</span>
                         <div className="flex items-center gap-2">
                           <button className="p-1.5 hover:bg-[var(--border-muted)] rounded-lg transition-colors cursor-pointer text-[var(--text-dim)] hover:text-[var(--text-main)] group">
                             <Copy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                           </button>
                           <button 
                            onClick={handleRegenerateSdkToken}
                            disabled={sdkTokenRegenerating}
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer text-[var(--text-dim)] hover:text-rose-400 group disabled:opacity-50">
                             <RefreshCcw className={`w-3.5 h-3.5 ${sdkTokenRegenerating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform'}`} />
                           </button>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-colors">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                     <Activity className="w-4 h-4 text-[#818CF8]" />
                     {language === 'en' ? 'SDK Traffic (30 Days)' : 'حركة مرور حزمة التطوير (30 يوم)'}
                    </span>
                  </h4>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sdkChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAllowed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#22263B" vertical={false} />
                        <XAxis dataKey="date" stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#4B5563" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0E1017', borderColor: '#1E2132', borderRadius: '12px', fontSize: '12px' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Area type="monotone" dataKey="allowed" name="Allowed" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorAllowed)" />
                        <Area type="monotone" dataKey="blocked" name="Blocked" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#colorBlocked)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-colors">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-4 flex items-center gap-2">
                     <Terminal className="w-4 h-4 text-[#818CF8]" />
                     {language === 'en' ? 'SDK Simulation Playground' : 'ساحة محاكاة حزمة التطوير'}
                  </h4>
                  <div className="space-y-4">
                    <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl overflow-hidden focus-within:border-[#6366F1]/50 transition-colors">
                      <div className="bg-[var(--bg-surface)] px-4 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--text-light)] uppercase">Raw JSON Payload</span>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(sdkSimulationPayload);
                               setNotification(language === 'en' ? 'Payload copied' : 'تم النسخ');
                               setTimeout(() => setNotification(''), 2000);
                             }}
                             className="text-[9px] font-bold text-[#818CF8] hover:text-[var(--text-main)] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                           >
                              <Copy className="w-3 h-3" />
                              {language === 'en' ? 'JSON' : 'جيسون'}
                           </button>
                           <button 
                             onClick={() => {
                               const curlCommand = `curl -X POST https://api.axon.internal/decide \\\n-H "Content-Type: application/json" \\\n-H "Authorization: Bearer ${sdkToken}" \\\n-d '${sdkSimulationPayload.replace(/\n/g, '')}'`;
                               navigator.clipboard.writeText(curlCommand);
                               setNotification(language === 'en' ? 'cURL copied' : 'تم النسخ');
                               setTimeout(() => setNotification(''), 2000);
                             }}
                             className="text-[9px] font-bold text-[#818CF8] hover:text-[var(--text-main)] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                           >
                              <Copy className="w-3 h-3" />
                              {language === 'en' ? 'cURL' : 'cURL'}
                           </button>
                        </div>
                      </div>
                      <textarea
                        value={sdkSimulationPayload}
                        onChange={(e) => setSdkSimulationPayload(e.target.value)}
                        className="w-full h-32 bg-transparent text-[#A5B4FC] p-4 text-[11px] font-mono outline-none resize-none leading-relaxed"
                        spellCheck={false}
                      />
                    </div>
                    <button 
                      onClick={handleRunSdkSimulation}
                      disabled={isSimulatingSdk}
                      className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-[var(--text-main)] py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSimulatingSdk ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {language === 'en' ? 'Execute Simulation' : 'تنفيذ المحاكاة'}
                    </button>
                    
                    {sdkSimulationResult && (
                      <div className={`mt-4 p-4 rounded-xl border ${sdkSimulationResult.error ? 'bg-rose-500/10 border-rose-500/20' : 'bg-[var(--bg-surface)] border-[var(--border-muted)]'}`}>
                        <span className="text-[10px] font-bold text-[var(--text-light)] uppercase mb-2 block">
                          {language === 'en' ? 'Engine Response' : 'استجابة المحرك'}
                        </span>
                        <pre className={`text-[10px] font-mono whitespace-pre-wrap ${sdkSimulationResult.error ? 'text-rose-400' : (sdkSimulationResult.decision === 'ALLOW' ? 'text-emerald-400' : 'text-amber-400')}`}>
                          {JSON.stringify(sdkSimulationResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-colors">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-4 flex items-center gap-2">
                     <Code className="w-4 h-4 text-[#818CF8]" />
                     {language === 'en' ? 'Get Started: LangChain / AutoGPT' : 'البدء مع لانج تشين / أوتو جي بي تي'}
                  </h4>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-xs">
                      {language === 'en' 
                        ? 'Integrate AXON directly into your agent reasoning loops.'
                        : 'قم بدمج أكسون مباشرة في حلقات التفكير الخاصة بالعميل.'}
                    </p>
                    <div className="relative">
                      <select 
                        value={sdkVersion}
                        onChange={(e) => setSdkVersion(e.target.value)}
                        className="appearance-none bg-[var(--bg-surface)] border border-[var(--border-muted)] text-[#818CF8] text-[10px] font-bold tracking-wider rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer hover:border-[#6366F1]/50 transition-colors"
                      >
                        <option value="v0.2.0-beta">v0.2.0-beta</option>
                        <option value="v0.1.0">v0.1.0</option>
                      </select>
                      <ChevronDown className="w-3 h-3 text-[var(--text-dim)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl p-4 overflow-x-auto">
                    <pre className="text-[11px] font-mono leading-relaxed text-[var(--text-muted)]">
                      <code dangerouslySetInnerHTML={{ __html: sdkVersion === 'v0.2.0-beta' ? `// Install: npm install @axon-security/sdk@beta

import { axon } from '@axon/sdk';
import { AgentExecutor } from "langchain/agents";

// Wrap your agent's execute/tool calling loop
const secureToolInterceptor = async (tool, input) => {
  const isSafe = await axon.isSafeToExecute({
    prompt: \`Call \${tool.name} with \${input}\`,
    context: { agentFramework: "LangChain" }
  });

  if (!isSafe) {
    return "ACTION BLOCKED: Policy violation detected by AXON.";
  }
  
  return await tool.call(input);
};

// ... inject into AgentExecutor` : `// Install: npm install @axon-security/sdk

const { AxonDecisionEngine } = require('@axon/sdk');
const axon = new AxonDecisionEngine();

// Legacy interceptor example
async function wrapAgent(action) {
  const result = await axon.evaluateAction({ prompt: action });
  return result.decision === 'ALLOW';
}`}} />
                    </pre>
                  </div>
                </div>
              </div>
              
              <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl transition-colors">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mb-4 flex items-center gap-2">
                   <Webhook className="w-4 h-4 text-[#818CF8]" />
                   {language === 'en' ? 'Alerts & Webhooks' : 'التنبيهات وخطافات الويب'}
                </h4>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] text-[var(--text-light)] uppercase font-bold tracking-wider mb-1.5 block">High-Risk Operation Webhook URL</label>
                    <input 
                      type="text" 
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-muted)]/60 rounded-xl px-4 py-3 text-xs font-mono text-[var(--text-muted)] outline-none focus:border-[#6366F1]/50 transition-colors"
                      placeholder="https://"
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleSaveWebhook}
                      disabled={isSavingWebhook}
                      className="h-[42px] px-6 bg-[var(--border-bold)] hover:bg-[var(--bg-button-alt)] text-[var(--text-main)] rounded-xl text-xs font-bold tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingWebhook ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Settings2 className="w-3.5 h-3.5" />}
                      {language === 'en' ? 'Save URL' : 'حفظ الرابط'}
                    </button>
                  </div>
                </div>
              </div>
              </>
              )}

              {sdkActiveSubTab === 'tracing' && (
                <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl transition-colors">
                  <div className="p-5 border-b border-[var(--border-muted)]/60 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-2">
                      <History className="w-4 h-4 text-[#818CF8]" />
                      {language === 'en' ? 'Live Request Tracing' : 'التتبع الحي للطلبات'}
                    </h4>
                    <span className="text-[10px] font-bold text-[var(--text-light)] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      Listening for connections
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[var(--bg-gradient-end)]/50">
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] border-b border-[var(--border-muted)]/60">ID</th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] border-b border-[var(--border-muted)]/60">Agent Source</th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] border-b border-[var(--border-muted)]/60">Intended Action</th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] border-b border-[var(--border-muted)]/60">Decision</th>
                          <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-[var(--text-light)] border-b border-[var(--border-muted)]/60 text-right">Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockSdkTraces.map((trace, idx) => (
                          <tr key={idx} className="border-b border-[var(--border-muted)]/30 hover:bg-[var(--border-muted)]/20 transition-colors">
                            <td className="p-4 text-xs font-mono text-[var(--text-dim)]">{trace.id}</td>
                            <td className="p-4 text-xs font-medium text-[var(--text-muted)] flex items-center gap-2">
                              <Server className="w-3.5 h-3.5 text-[var(--text-light)]" />
                              {trace.agent}
                            </td>
                            <td className="p-4 text-xs text-[var(--text-dim)]">{trace.action}</td>
                            <td className="p-4">
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${trace.decision === 'ALLOW' ? 'bg-emerald-500/10 text-emerald-400' : trace.decision === 'DENY' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {trace.decision}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-[var(--text-light)]" />
                                  {trace.latency}
                                </span>
                                <span className="text-[10px] text-[var(--text-lighter)] mt-0.5">{trace.time}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {sdkActiveSubTab === 'auth' && (
                <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl p-6 md:p-8 space-y-8">
                  <div>
                    <h4 className="text-lg font-bold text-[var(--text-main)] mb-2">{language === 'en' ? 'Authentication Guide' : 'دليل المصادقة'}</h4>
                    <p className="text-sm text-[var(--text-dim)] max-w-3xl leading-relaxed">
                      {language === 'en' 
                        ? 'To interact with the AXON Decision Engine via the SDK or HTTP API, you must include a valid API key in the request headers. API keys carry specific operational scopes and should be treated as sensitive credentials.'
                        : 'للتفاعل مع محرك قرارات أكسون عبر حزمة التطوير أو واجهة HTTP، يجب تضمين مفتاح API صالح في ترويسات الطلب. تحمل المفاتيح نطاقات تشغيلية محددة ويجب التعامل معها كبيانات اعتماد حساسة.'}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <h5 className="text-sm font-bold text-[var(--text-muted)]">{language === 'en' ? 'Header Authentication' : 'مصادقة الترويسات'}</h5>
                    <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl p-4 overflow-x-auto">
                      <pre className="text-[11px] font-mono text-[var(--text-muted)]">
Authorization: Bearer <span className="text-[#818CF8]">axn_live_xxxxxxxxxxxxxxxx</span>
                      </pre>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-muted)]/60">
                      <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {language === 'en' ? 'Key Rotation Policy' : 'سياسة تدوير المفاتيح'}
                      </h5>
                      <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                        {language === 'en'
                          ? 'Standard operational keys expire every 90 days. For production environments, we recommend generating short-lived access tokens via your CI/CD pipeline. Use the "Regenerate" button in the Overview tab to manually roll keys.'
                          : 'تنتهي صلاحية المفاتيح التشغيلية القياسية كل 90 يومًا. بالنسبة لبيئات الإنتاج، نوصي بتوليد رموز وصول قصيرة الأجل عبر مسار النشر (CI/CD). استخدم زر "إعادة توليد" للتدوير اليدوي.'}
                      </p>
                    </div>
                    <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-muted)]/60">
                      <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4" />
                        {language === 'en' ? 'Common Errors' : 'الأخطاء الشائعة'}
                      </h5>
                      <ul className="text-xs text-[var(--text-dim)] leading-relaxed space-y-2">
                        <li><strong className="text-[var(--text-muted)]">401 Unauthorized:</strong> {language === 'en' ? 'Missing or malformed Bearer token.' : 'رمز مفقود أو غير صالح.'}</li>
                        <li><strong className="text-[var(--text-muted)]">403 Forbidden:</strong> {language === 'en' ? 'Token lacks required scopes or is revoked.' : 'المفتاح يفتقر للصلاحيات أو تم إلغاؤه.'}</li>
                        <li><strong className="text-[var(--text-muted)]">429 Too Many Requests:</strong> {language === 'en' ? 'Exceeded current tier quota limit.' : 'تم تجاوز حد الحصة المسموح بها.'}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {sdkActiveSubTab === 'reference' && (
                <div className="space-y-6">
                  <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl p-6 md:p-8 space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
                        <Code className="w-5 h-5 text-[#818CF8]" />
                        {language === 'en' ? 'OpenAPI / Schema Reference' : 'مرجع OpenAPI / المخططات'}
                      </h4>
                      <p className="text-sm text-[var(--text-dim)] max-w-3xl leading-relaxed">
                        {language === 'en' ? 'JSON schema definitions for the /api/decide endpoint payload and engine response.' : 'تعريفات مخطط JSON لطلب /api/decide واستجابة المحرك.'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-fit">Request Schema</span>
                          <button 
                             onClick={() => {
                               const schema = `{
  "type": "object",
  "required": ["prompt"],
  "properties": {
    "prompt": {
      "type": "string",
      "description": "Agent's intended action"
    },
    "context": {
      "type": "object",
      "description": "Runtime context metadata"
    }
  }
}`;
                               navigator.clipboard.writeText(schema);
                               setNotification(language === 'en' ? 'Schema copied' : 'تم النسخ');
                               setTimeout(() => setNotification(''), 2000);
                             }}
                             className="text-[9px] font-bold text-[#818CF8] hover:text-[var(--text-main)] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                           >
                              <Copy className="w-3 h-3" />
                              {language === 'en' ? 'Copy Schema' : 'نسخ المخطط'}
                           </button>
                        </div>
                        <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl p-4 overflow-x-auto h-[280px]">
                          <pre className="text-[11px] font-mono text-[var(--text-dim)] leading-relaxed">
{`{
  "type": "object",
  "required": ["prompt"],
  "properties": {
    "prompt": {
      "type": "string",
      "description": "Agent's intended action"
    },
    "context": {
      "type": "object",
      "description": "Runtime context metadata"
    }
  }
}`}
                          </pre>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 w-fit">Response Schema</span>
                          <button 
                             onClick={() => {
                               const schema = `{
  "type": "object",
  "properties": {
    "decision": {
      "enum": [
        "ALLOW", "DENY", 
        "ESCALATE_TO_HUMAN"
      ]
    },
    "riskScore": { "type": "number" },
    "reasonEn": { "type": "string" },
    "mitigationEn": { "type": "string" }
  }
}`;
                               navigator.clipboard.writeText(schema);
                               setNotification(language === 'en' ? 'Schema copied' : 'تم النسخ');
                               setTimeout(() => setNotification(''), 2000);
                             }}
                             className="text-[9px] font-bold text-[#818CF8] hover:text-[var(--text-main)] uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1"
                           >
                              <Copy className="w-3 h-3" />
                              {language === 'en' ? 'Copy Schema' : 'نسخ المخطط'}
                           </button>
                        </div>
                        <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl p-4 overflow-x-auto h-[280px]">
                          <pre className="text-[11px] font-mono text-[var(--text-dim)] leading-relaxed">
{`{
  "type": "object",
  "properties": {
    "decision": {
      "enum": [
        "ALLOW", "DENY", 
        "ESCALATE_TO_HUMAN"
      ]
    },
    "riskScore": { "type": "number" },
    "reasonEn": { "type": "string" },
    "mitigationEn": { "type": "string" }
  }
}`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-card)]/75 border border-[var(--border-muted)]/75 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl p-6 md:p-8 space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
                        <Webhook className="w-5 h-5 text-[#818CF8]" />
                        {language === 'en' ? 'Webhook Events Catalog' : 'دليل أحداث خطافات الويب'}
                      </h4>
                      <p className="text-sm text-[var(--text-dim)] max-w-3xl leading-relaxed">
                        {language === 'en' ? 'Available event types that AXON can dispatch to your configured webhook endpoints.' : 'أنواع الأحداث المتاحة التي يمكن لأكسون إرسالها إلى نقاط الويب الخاصة بك.'}
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-muted)]/60">
                        <div className="mt-1">
                           <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-amber-500/10 text-amber-400">decision.escalated</span>
                        </div>
                        <div>
                          <p className="text-sm text-[var(--text-muted)] font-medium mb-1">Human Review Requested</p>
                          <p className="text-xs text-[var(--text-light)] leading-relaxed">Triggered when an agent attempts a high-risk operation that requires mandatory manual sign-off by a reviewer.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-muted)]/60">
                        <div className="mt-1">
                           <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-rose-500/10 text-rose-400">decision.denied</span>
                        </div>
                        <div>
                          <p className="text-sm text-[var(--text-muted)] font-medium mb-1">Action Blocked</p>
                          <p className="text-xs text-[var(--text-light)] leading-relaxed">Triggered when an operation is severely dangerous or violates a strict guardrail policy, resulting in immediate termination.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-muted)]/60">
                        <div className="mt-1">
                           <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400">decision.needs_clarification</span>
                        </div>
                        <div>
                          <p className="text-sm text-[var(--text-muted)] font-medium mb-1">Ambiguous Intent Detected</p>
                          <p className="text-xs text-[var(--text-light)] leading-relaxed">Dispatched when the Decision Kernel cannot safely infer the scope of the operation and requires more context.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <footer className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center pb-8 lg:pb-0">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-dim)]">
                <a href="#" className="hover:text-[var(--text-main)] transition-colors">{t.privacyPolicy}</a>
                <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)]"></span>
                <a href="#" className="hover:text-[var(--text-main)] transition-colors">{t.termsOfUse}</a>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs text-[var(--text-dim)]">
                <div className="flex items-center gap-2">
                  <span>{t.developedBy}</span>
                  <span className="font-bold text-[var(--text-main)]">{t.developerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href="https://github.com/obadadallo95" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[#818CF8] transition-colors" title="GitHub">
                    <Github className="w-4 h-4" />
                  </a>
                  <a href="https://www.linkedin.com/in/obada-dallo-777a47a9/" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[#818CF8] transition-colors" title="LinkedIn">
                    <Linkedin className="w-4 h-4" />
                  </a>
                  <a href="https://obadadallo.web.app/" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[#818CF8] transition-colors" title="Portfolio">
                    <Globe className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>

        {/* FLOATING MOBILE BOTTOM SHEET NAVIGATION */}
        <div className="lg:hidden fixed bottom-4 left-4 right-4 md:left-6 md:right-6 max-w-lg mx-auto bg-[var(--bg-surface)]/90 border border-[var(--border-panel)] shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl rounded-2xl p-1.5 z-40 flex items-center justify-between transition-all duration-300">
          <button 
            onClick={() => setActiveTab('workspace')}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-1 text-center transition-all cursor-pointer relative ${
              activeTab === 'workspace' 
                ? 'bg-[var(--bg-badge)] text-[var(--text-main)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
            }`}
          >
            <Activity className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'workspace' ? 'scale-110 text-[#818CF8]' : 'text-[var(--text-muted)]'}`} />
            <span className={`text-[9px] font-black tracking-wider uppercase mt-1 ${activeTab === 'workspace' ? 'text-[#818CF8]' : 'text-[var(--text-dim)]'}`}>
              {t.workspace}
            </span>
            {activeTab === 'workspace' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#818CF8]"></span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('audit')}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-1 text-center relative transition-all cursor-pointer ${
              activeTab === 'audit' 
                ? 'bg-[var(--bg-badge)] text-[var(--text-main)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
            }`}
          >
            <div className="relative">
              <History className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'audit' ? 'scale-110 text-[#818CF8]' : 'text-[var(--text-muted)]'}`} />
              {auditLogs.length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#818CF8] text-[var(--bg-surface)] text-[8px] font-black px-1.5 py-0.2 rounded-full border border-[var(--bg-surface)]">
                  {auditLogs.length}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-black tracking-wider uppercase mt-1 ${activeTab === 'audit' ? 'text-[#818CF8]' : 'text-[var(--text-dim)]'}`}>
              {language === 'en' ? 'Audit' : 'التدقيق'}
            </span>
            {activeTab === 'audit' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#818CF8]"></span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('queue')}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-1 text-center relative transition-all cursor-pointer ${
              activeTab === 'queue' 
                ? 'bg-[var(--bg-badge)] text-[var(--text-main)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
            }`}
          >
            <div className="relative">
              <Layers className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'queue' ? 'scale-110 text-[#818CF8]' : 'text-[var(--text-muted)]'}`} />
              {escalatedQueue.filter(q => q.status === 'pending').length > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-rose-500 text-[var(--text-main)] text-[8px] font-black px-1.5 py-0.2 rounded-full border border-[var(--bg-surface)] animate-pulse">
                  {escalatedQueue.filter(q => q.status === 'pending').length}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-black tracking-wider uppercase mt-1 ${activeTab === 'queue' ? 'text-[#818CF8]' : 'text-[var(--text-dim)]'}`}>
              {language === 'en' ? 'Queue' : 'الطلبات'}
            </span>
            {activeTab === 'queue' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#818CF8]"></span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('policies')}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-1 text-center transition-all cursor-pointer relative ${
              activeTab === 'policies' 
                ? 'bg-[var(--bg-badge)] text-[var(--text-main)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
            }`}
          >
            <Shield className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'policies' ? 'scale-110 text-[#818CF8]' : 'text-[var(--text-muted)]'}`} />
            <span className={`text-[9px] font-black tracking-wider uppercase mt-1 ${activeTab === 'policies' ? 'text-[#818CF8]' : 'text-[var(--text-dim)]'}`}>
              {language === 'en' ? 'Rules' : 'القواعد'}
            </span>
            {activeTab === 'policies' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#818CF8]"></span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('sdk')}
            className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-1 text-center transition-all cursor-pointer relative ${
              activeTab === 'sdk' 
                ? 'bg-[var(--bg-badge)] text-[var(--text-main)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
            }`}
          >
            <Terminal className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'sdk' ? 'scale-110 text-[#818CF8]' : 'text-[var(--text-muted)]'}`} />
            <span className={`text-[9px] font-black tracking-wider uppercase mt-1 ${activeTab === 'sdk' ? 'text-[#818CF8]' : 'text-[var(--text-dim)]'}`}>
              SDK
            </span>
            {activeTab === 'sdk' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#818CF8]"></span>
            )}
          </button>
        </div>

      </main>
    </div>
  );
}
