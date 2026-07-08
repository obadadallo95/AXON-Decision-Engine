const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// 1. Remove "Suggest Policy" button
code = code.replace(/<button\s+onClick=\{handleSuggestPolicy\}[\s\S]*?<\/button>/, '');

// 2. Remove Admin Actions Buttons
const adminBtnsRegex = /<div className="flex flex-col gap-3">\s*\{\/\* Force Clear Cache Button \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<div className="text-\[10px\] text-\[var\(--text-light\)\] leading-relaxed font-medium">/;
code = code.replace(adminBtnsRegex, '</div>\n\n                <div className="text-[10px] text-[var(--text-light)] leading-relaxed font-medium">');

// 3. Keep SDK Simulation, remove fake tracing/auth/overview graphs
// Instead of regexing all subtabs, we'll just rewrite the whole SDK tab content to be honest.
const sdkTabRegex = /\{\/\* TAB 5: SDK INTEGRATION \*\/\}([\s\S]*?)<\/div>\n\s*\}\n\s*<\/div>\n\s*<\/main>/;

// We'll replace the entire TAB 5 block with a clean version that only has the simulation form and minimal docs.
const cleanSdkTab = `{/* TAB 5: SDK INTEGRATION */}
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
              </div>
              
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-sm">
                 <h4 className="font-extrabold text-[var(--text-main)] mb-4 flex items-center gap-2">
                   <Play className="w-4 h-4 text-indigo-400" />
                   {language === 'en' ? 'Live API Simulation' : 'محاكاة حية للواجهة البرمجية'}
                 </h4>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2 block">
                          {language === 'en' ? 'Request Payload (JSON)' : 'حمولة الطلب'}
                        </label>
                        <textarea 
                          value={sdkSimulationPayload}
                          onChange={(e) => setSdkSimulationPayload(e.target.value)}
                          className="w-full h-48 bg-[#0F172A] border border-[var(--border-bold)] rounded-xl p-4 text-[11px] font-mono text-emerald-400 focus:outline-none focus:border-indigo-500/50 resize-none"
                          spellCheck={false}
                        />
                      </div>
                      <button
                        onClick={handleRunSdkSimulation}
                        disabled={isSimulatingSdk}
                        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-70"
                      >
                        {isSimulatingSdk ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {isSimulatingSdk ? (language === 'en' ? 'Executing...' : 'جاري التنفيذ...') : (language === 'en' ? 'Simulate SDK Request' : 'محاكاة الطلب')}
                      </button>
                   </div>
                   
                   <div>
                      <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2 block">
                        {language === 'en' ? 'Evaluation Response' : 'استجابة التقييم'}
                      </label>
                      <div className="w-full h-60 bg-[#0F172A] border border-[var(--border-bold)] rounded-xl p-4 text-[11px] font-mono text-[#E2E8F0] overflow-y-auto whitespace-pre-wrap">
                        {sdkSimulationResult ? JSON.stringify(sdkSimulationResult, null, 2) : (language === 'en' ? '// Run simulation to see the decision engine output\\n// The API is available at /api/decide' : '// قم بتشغيل المحاكاة لرؤية مخرجات محرك اتخاذ القرار')}
                      </div>
                   </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </main>`;

code = code.replace(sdkTabRegex, cleanSdkTab);

fs.writeFileSync('app/page.tsx', code);
console.log("Updated app/page.tsx");
