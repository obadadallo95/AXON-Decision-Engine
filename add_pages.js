const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Update State
code = code.replace(
  /useState<'workspace' \| 'audit' \| 'queue' \| 'policies' \| 'sdk'>\('workspace'\);/,
  "useState<'workspace' | 'audit' | 'queue' | 'policies' | 'sdk' | 'about' | 'skills'>('workspace');"
);

// 2. Add Desktop Nav Buttons
const desktopNavRegex = /(<button \n              onClick=\{\(\) => setActiveTab\('sdk'\)\}[\s\S]*?<\/button>\n\s*)(<\/nav>)/;
const desktopAdditions = `
            {/* Secondary Navigation */}
            <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] space-y-1">
              <button 
                onClick={() => setActiveTab('about')}
                className={\`w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all \${
                  activeTab === 'about' 
                    ? 'bg-[var(--bg-active)] text-[#818CF8] border-r-2 border-[#6366F1]' 
                    : 'text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]'
                }\`}
              >
                <HelpCircle className="w-4.5 h-4.5" />
                {language === 'en' ? 'About AXON' : 'حول أكسون'}
              </button>
              <button 
                onClick={() => setActiveTab('skills')}
                className={\`w-full text-left px-6 py-3 flex items-center gap-3 text-xs font-semibold tracking-wide transition-all \${
                  activeTab === 'skills' 
                    ? 'bg-[var(--bg-active)] text-[#818CF8] border-r-2 border-[#6366F1]' 
                    : 'text-[var(--text-dim)] hover:bg-[var(--bg-nav-hover)] hover:text-[#F3F4F6]'
                }\`}
              >
                <Code className="w-4.5 h-4.5" />
                {language === 'en' ? 'Integration Skills' : 'مهارات التكامل'}
              </button>
            </div>
`;
code = code.replace(desktopNavRegex, `$1${desktopAdditions}$2`);

// 3. Add Mobile Nav Buttons
const mobileNavRegex = /(<div className="lg:hidden fixed bottom-4 left-4 right-4 md:left-6 md:right-6 max-w-lg mx-auto bg-\[var\(--bg-surface\)\]\/90 border border-\[var\(--border-panel\)\] shadow-\[0_12px_40px_rgba\(0,0,0,0.85\)\] backdrop-blur-xl rounded-2xl p-1.5 z-40 flex items-center justify-between transition-all duration-300">)/;
// Update the mobile container to allow scrolling if there are many items
code = code.replace(mobileNavRegex, `<div className="lg:hidden fixed bottom-4 left-4 right-4 md:left-6 md:right-6 max-w-lg mx-auto bg-[var(--bg-surface)]/90 border border-[var(--border-panel)] shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl rounded-2xl p-1.5 z-40 flex items-center justify-between overflow-x-auto hide-scrollbar gap-1 transition-all duration-300">`);

const mobileSdkRegex = /(<button \n            onClick=\{\(\) => setActiveTab\('sdk'\)\}[\s\S]*?<\/button>\n)/;
const mobileAdditions = `
          <div className="w-px h-8 bg-[var(--border-panel)] mx-1 flex-shrink-0"></div>
          <button 
            onClick={() => setActiveTab('about')}
            className={\`flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-shrink-0 min-w-[64px] text-center transition-all cursor-pointer relative \${
              activeTab === 'about' 
                ? 'bg-[var(--bg-badge)] text-[var(--text-main)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
            }\`}
          >
            <HelpCircle className={\`w-5 h-5 transition-transform duration-200 \${activeTab === 'about' ? 'scale-110 text-[#818CF8]' : 'text-[var(--text-muted)]'}\`} />
            <span className={\`text-[9px] font-black tracking-wider uppercase mt-1 \${activeTab === 'about' ? 'text-[#818CF8]' : 'text-[var(--text-dim)]'}\`}>
              {language === 'en' ? 'About' : 'حول'}
            </span>
            {activeTab === 'about' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#818CF8]"></span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('skills')}
            className={\`flex flex-col items-center justify-center py-2 px-3 rounded-xl flex-shrink-0 min-w-[64px] text-center transition-all cursor-pointer relative \${
              activeTab === 'skills' 
                ? 'bg-[var(--bg-badge)] text-[var(--text-main)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                : 'text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]/50'
            }\`}
          >
            <Code className={\`w-5 h-5 transition-transform duration-200 \${activeTab === 'skills' ? 'scale-110 text-[#818CF8]' : 'text-[var(--text-muted)]'}\`} />
            <span className={\`text-[9px] font-black tracking-wider uppercase mt-1 \${activeTab === 'skills' ? 'text-[#818CF8]' : 'text-[var(--text-dim)]'}\`}>
              {language === 'en' ? 'Skills' : 'مهارات'}
            </span>
            {activeTab === 'skills' && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#818CF8]"></span>
            )}
          </button>
`;
code = code.replace(mobileSdkRegex, `$1${mobileAdditions}`);

// 4. Add Tab Content
const tabContentRegex = /(\{\/\* TAB 5: SDK INTEGRATION \*\/\}[\s\S]*?<\/div>\n\s*\)\}\n\n\s*)(<\/div>\n\s*<\/main>)/;

const newPagesContent = `
          {/* TAB 6: ABOUT */}
          {activeTab === 'about' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl">
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

                <h3 className="text-lg font-bold text-[var(--text-main)] mt-8 mb-3">{language === 'en' ? 'Architecture' : 'البنية'}</h3>
                <p className="text-[var(--text-dim)] leading-relaxed">
                  {language === 'en'
                    ? "By offloading the authorization logic to the AXON API, your agents remain decoupled from corporate governance rules, while AXON maintains the ultimate verification authority via Google Gemini models and search grounding."
                    : "من خلال نقل منطق التفويض إلى واجهة أكسون، يبقى وكلائك مستقلين عن قواعد الحوكمة بينما يحتفظ أكسون بسلطة التحقق النهائية."}
                </p>
              </div>
            </div>
          )}

          {/* TAB 7: SKILLS */}
          {activeTab === 'skills' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl">
                <h2 className="text-2xl font-black text-[var(--text-main)] mb-4 flex items-center gap-3">
                  <Code className="w-6 h-6 text-[#818CF8]" />
                  {language === 'en' ? 'Agent Integration Skills' : 'مهارات تكامل الوكلاء'}
                </h2>
                <p className="text-[var(--text-dim)] leading-relaxed mb-8">
                  {language === 'en'
                    ? "We provide pre-configured rules to instantly inject AXON policy awareness into popular developer tools. These skills force your AI agents to consult AXON before executing structural or terminal changes."
                    : "نوفر قواعد مسبقة التكوين لحقن الوعي بسياسات أكسون في أدوات التطوير المتقدمة."}
                </p>

                <div className="space-y-6">
                  <div className="bg-[var(--bg-panel)] border border-[var(--border-muted)] rounded-2xl p-6">
                    <h3 className="font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Cursor IDE Rule
                    </h3>
                    <p className="text-xs text-[var(--text-dim)] mb-4">
                      {language === 'en' ? "Forces Cursor's Composer to consult AXON before applying codebase refactors." : "يجبر محرر Cursor على مراجعة أكسون قبل تطبيق التغييرات الجذرية."}
                    </p>
                    <div className="bg-[#08090C] border border-[var(--border-bold)] rounded-lg p-3">
                      <div className="text-[10px] text-[var(--text-light)] mb-1 uppercase tracking-wider font-bold">Install Path</div>
                      <code className="text-xs text-emerald-400 font-mono">.cursor/rules/axon-decision.mdc</code>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-panel)] border border-[var(--border-muted)] rounded-2xl p-6">
                    <h3 className="font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-400" />
                      Claude Code Skill
                    </h3>
                    <p className="text-xs text-[var(--text-dim)] mb-4">
                      {language === 'en' ? "Binds AXON to Claude Code's terminal execution layer." : "يربط أكسون بطبقة تنفيذ الأوامر الطرفية الخاصة بـ Claude Code."}
                    </p>
                    <div className="bg-[#08090C] border border-[var(--border-bold)] rounded-lg p-3">
                      <div className="text-[10px] text-[var(--text-light)] mb-1 uppercase tracking-wider font-bold">Install Path</div>
                      <code className="text-xs text-amber-400 font-mono">.claude/skills/axon-decision/SKILL.md</code>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-panel)] border border-[var(--border-muted)] rounded-2xl p-6">
                    <h3 className="font-bold text-[var(--text-main)] mb-2 flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-indigo-400" />
                      Antigravity Skill
                    </h3>
                    <p className="text-xs text-[var(--text-dim)] mb-4">
                      {language === 'en' ? "Enforces policy-compliant execution for Antigravity autonomous agents." : "يفرض التنفيذ المتوافق مع السياسات للوكلاء المستقلين."}
                    </p>
                    <div className="bg-[#08090C] border border-[var(--border-bold)] rounded-lg p-3">
                      <div className="text-[10px] text-[var(--text-light)] mb-1 uppercase tracking-wider font-bold">Install Path</div>
                      <code className="text-xs text-indigo-400 font-mono">.agents/skills/axon-decision-engine/SKILL.md</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
`;
code = code.replace(tabContentRegex, `$1${newPagesContent}$2`);

fs.writeFileSync('app/page.tsx', code);
console.log("Updated app/page.tsx with About and Skills tabs");
