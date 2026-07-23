import React, { useState, useEffect } from 'react';
import { Mechanism, ContentPillar, ContentTemplate, Platform, DriveFile } from '../types';
import { CONTENT_PILLARS, CONTENT_TEMPLATES, PREPOPULATED_MECHANISMS } from '../data';
import { Layers, HelpCircle, FileText, Sparkles, Copy, Check, RefreshCw, Send, AlertCircle, PlayCircle, Smartphone, Youtube, Info, BookOpen, Video, ListChecks } from 'lucide-react';
import ArticleIntelligence from './ArticleIntelligence';

interface ContentMatrixProps {
  knowledgeBaseText: string;
  selectedFile: DriveFile | null;
}

export default function ContentMatrix({ knowledgeBaseText, selectedFile }: ContentMatrixProps) {
  const [matrixSubTab, setMatrixSubTab] = useState<'matrix' | 'articles'>('articles');
  const [mechanisms, setMechanisms] = useState<Mechanism[]>([]);
  const [selectedMechanism, setSelectedMechanism] = useState<string>('');

  const [selectedPillar, setSelectedPillar] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('reels');
  const [readyText, setReadyText] = useState('');
  const [anchorResearch, setAnchorResearch] = useState(true);
  const [includeSecondaryGain, setIncludeSecondaryGain] = useState(true);
  
  // Script generation state
  const [generating, setGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load mechanisms
  useEffect(() => {
    const saved = localStorage.getItem('mind_atlas_mechanisms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Mechanism[];
        // Force refresh if it is using the old couples/career schema
        const isOldSchema = parsed.some(m => !m.parentTeenExpression && m.id === 'pleasing');
        if (isOldSchema) {
          setMechanisms(PREPOPULATED_MECHANISMS);
          localStorage.setItem('mind_atlas_mechanisms', JSON.stringify(PREPOPULATED_MECHANISMS));
        } else {
          setMechanisms(parsed);
        }
      } catch (e) {
        setMechanisms(PREPOPULATED_MECHANISMS);
      }
    } else {
      setMechanisms(PREPOPULATED_MECHANISMS);
    }
  }, []);

  const handleGenerate = async () => {
    if (!readyText.trim() && (!selectedMechanism || !selectedPillar)) return;

    setGenerating(true);
    setGenError(null);
    setGeneratedScript('');
    
    const mechanismObj = mechanisms.find(m => m.id === selectedMechanism);
    const pillarObj = CONTENT_PILLARS.find(p => p.id === selectedPillar);
    const templateObj = CONTENT_TEMPLATES.find(t => t.id === selectedTemplate);

    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mechanism: mechanismObj ? `${mechanismObj.name} (${mechanismObj.quote})` : selectedMechanism,
          pillar: pillarObj ? `${pillarObj.name}: ${pillarObj.description}` : selectedPillar,
          template: templateObj ? `${templateObj.title} - ${templateObj.structure}` : undefined,
          platform: selectedPlatform,
          knowledgeBaseText: knowledgeBaseText, // Pass text from Google Drive if selected
          readyText: readyText.trim() || undefined,
          anchorResearch,
          includeSecondaryGain
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'נכשלה יצירת התסריט');
      }

      const data = await response.json();
      setGeneratedScript(data.script);
    } catch (err: any) {
      console.error(err);
      setGenError(err.message || 'שגיאה ביצירת התסריט מול מנוע ה-AI.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeMechanismObj = mechanisms.find(m => m.id === selectedMechanism);
  const activePillarObj = CONTENT_PILLARS.find(p => p.id === selectedPillar);

  return (
    <div className="space-y-6 text-right">
      
      {/* Sub-tab switcher for Content Matrix & Article Intelligence */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setMatrixSubTab('articles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            matrixSubTab === 'articles'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-300" />
          סורק מאמרים • סדרות ומדריכים
        </button>

        <button
          onClick={() => setMatrixSubTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            matrixSubTab === 'matrix'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-300" />
          מחולל תסריט בודד (מטריצה)
        </button>
      </div>

      {matrixSubTab === 'articles' ? (
        <ArticleIntelligence
          knowledgeBaseText={knowledgeBaseText}
          selectedFile={selectedFile}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-right">
      
      {/* Parameters Selection Panel */}
      <div className="lg:col-span-5 space-y-4">

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
          <h3 className="font-bold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800/60">
            <Layers className="w-5 h-5 text-indigo-400" />
            מטריצת התוכן: שילוב מנגנון + זירה
          </h3>

          {/* 1. Select Mechanism */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              1. איזה מנגנון נפשי נפרק? (השורש הפנימי)
            </label>
            <select
              value={selectedMechanism}
              onChange={(e) => setSelectedMechanism(e.target.value)}
              className="w-full px-3 py-2 border border-slate-800 rounded-xl text-sm text-slate-200 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            >
              <option value="">-- בחר מנגנון מתוך האטלס --</option>
              {mechanisms.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-950 text-slate-200">
                  {m.name}
                </option>
              ))}
            </select>
            {activeMechanismObj && (
              <p className="text-[11px] text-indigo-300 italic mt-1 pr-1">
                "{activeMechanismObj.quote}"
              </p>
            )}
          </div>

          {/* 2. Select Content Pillar */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              2. באיזה עולם/זירה נמקם אותו? (עמודי התוכן)
            </label>
            <select
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              className="w-full px-3 py-2 border border-slate-800 rounded-xl text-sm text-slate-200 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            >
              <option value="">-- בחר עולם תוכן --</option>
              {CONTENT_PILLARS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-950 text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
            {activePillarObj && (
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed pr-1">
                {activePillarObj.description}
              </p>
            )}
          </div>

          {/* 3. Select Template */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              3. תבנית כתיבה להובלה (אופציונלי)
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-800 rounded-xl text-sm text-slate-200 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            >
              <option value="">-- בחר תבנית (חופשי) --</option>
              {CONTENT_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-950 text-slate-200">
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Select Platform */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              4. פלטפורמת יעד ועטיפה
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'tiktok', name: 'טיקטוק', icon: Smartphone, desc: 'קצבי ומהיר (25ש)' },
                { id: 'reels', name: 'רילס / Reels', icon: Smartphone, desc: 'עם סיפור (60ש)' },
                { id: 'shorts', name: 'Shorts', icon: Youtube, desc: 'מהודק וקצר' },
                { id: 'youtube_long', name: 'יוטיוב ארוך', icon: Youtube, desc: 'ניתוח עומק (15ד)' }
              ].map((plat) => {
                const isSelected = selectedPlatform === plat.id;
                return (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => setSelectedPlatform(plat.id as Platform)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500/50 bg-indigo-950/40 text-white font-medium shadow-inner'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <plat.icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold">{plat.name}</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">{plat.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Existing Draft Text (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              5. טיוטת טקסט קיימת לשכתוב (אופציונלי)
            </label>
            <textarea
              value={readyText}
              onChange={(e) => setReadyText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-850 rounded-xl text-xs text-slate-200 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none font-sans"
              placeholder="הדבק כאן מאמר, רעיון גולמי או טיוטה שכתבת. המערכת תהפוך אותם לתסריט וידאו מנצח וממוקד..."
            />
          </div>

          {/* 6. Professional Enhancement Options */}
          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chk-anchor-research"
                checked={anchorResearch}
                onChange={(e) => setAnchorResearch(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
              />
              <label htmlFor="chk-anchor-research" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                ביסוס סמכותי ("מחקרים מוכיחים ש...")
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chk-secondary-gain"
                checked={includeSecondaryGain}
                onChange={(e) => setIncludeSecondaryGain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
              />
              <label htmlFor="chk-secondary-gain" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                חשיפת הרווח המשני מול המחיר הכבד
              </label>
            </div>
          </div>

          {/* Connected file indicator */}
          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs space-y-1">
            <div className="flex justify-between items-center text-slate-400 font-semibold">
              <span>מאגר ידע מחובר:</span>
              {selectedFile ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  פעיל
                </span>
              ) : (
                <span className="text-slate-500">לא מסונכרן</span>
              )}
            </div>
            <p className="text-slate-500 text-[10px] leading-relaxed mt-1">
              {selectedFile 
                ? `מסמך הדרייב '${selectedFile.name}' ישמש כמאגר רקע ישיר לדיוק התסריט.`
                : 'אינך משתמש כרגע בקובץ רקע. התסריט ייכתב על בסיס מודל הנפש הכללי.'
              }
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || (!readyText.trim() && (!selectedMechanism || !selectedPillar))}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer"
            id="btn-generate-script"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                מחלץ ידע ויוצר תסריט...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                צור תסריט תוכן מנצח
              </>
            )}
          </button>
        </div>
      </div>

      {/* Script Preview and Outputs */}
      <div className="lg:col-span-7">
        {generatedScript ? (
          <div id="generated-script-box" className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 flex flex-col h-full justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <div>
                  <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-semibold">
                    תסריט מוכן לשידור • {
                      selectedPlatform === 'tiktok' ? 'טיקטוק' :
                      selectedPlatform === 'reels' ? 'רילס' :
                      selectedPlatform === 'shorts' ? 'Shorts' : 'יוטיוב ארוך'
                    }
                  </span>
                  <h3 className="font-bold text-white text-lg mt-1">התסריט המקורי שלך</h3>
                </div>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300 text-xs rounded-lg transition-colors font-semibold cursor-pointer"
                  id="btn-copy-script"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      הועתק!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      העתק טקסט
                    </>
                  )}
                </button>
              </div>

              {/* Generated Text area with styling - now editable! */}
              <textarea
                value={generatedScript}
                onChange={(e) => setGeneratedScript(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-xl p-5 text-sm text-slate-200 leading-relaxed h-[360px] overflow-y-auto text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-sans resize-y"
                placeholder="ערוך את התסריט ישירות כאן..."
              />
            </div>

            {/* Checklist guidelines */}
            <div className="border-t border-slate-850 pt-4 mt-4 space-y-2.5 bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                איך להגיש את הסרטון הזה בצורה אפקטיבית?
              </h4>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li><strong>טון דיבור</strong>: דבר ישירות לעיניים, בשפה שקטה וכנה. אל תטיף - תשתף.</li>
                <li><strong>ההוק (Hook) של ה-3 שניות הראשונות</strong>: אל תגיד 'שלום לכולם', תפתח ישירות בשאלה הפסיכולוגית או בפרדוקס.</li>
                <li><strong>הפסקות לדגש</strong>: הפסקות של שנייה לפני משפט המפתח הן קריטיות להבנת המנגנון.</li>
                <li><strong>מסר קבוע</strong>: זכור, המטרה היא להראות שההתנהגות היא רק הרמז, ולא הבעיה עצמה!</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 shadow-2xl text-center flex flex-col items-center justify-center min-h-[450px] h-full">
            {generating ? (
              <div className="space-y-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-850 border-t-indigo-500 animate-spin mx-auto" />
                  <Sparkles className="w-6 h-6 text-indigo-400 absolute top-5 right-5 animate-pulse" />
                </div>
                <h4 className="font-bold text-white text-lg mt-4">מחולל התסריט בפעולה...</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  הבינה מנתחת את מנגנון השורש והעולם שבחרת, מפרקת את הפרדוקס הפנימי, ומאגדת הכל לתסריט אותנטי בעברית מעצימה.
                </p>
              </div>
            ) : (
              <>
                <PlayCircle className="w-16 h-16 text-slate-700 mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-white">התסריט שלך יופיע כאן</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                  בחר מנגנון מתוך האטלס, עולם תוכן (זירה) ותבנית כתיבה משמאל, ולאחר מכן לחץ על 'צור תסריט תוכן' כדי להפעיל את מנוע ה-AI.
                </p>
                {(!selectedMechanism || !selectedPillar) && (
                  <div className="mt-4 bg-amber-500/5 border border-amber-500/20 text-amber-400 text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    שים לב: עליך לבחור מנגנון ועולם תוכן תחילה.
                  </div>
                )}
              </>
            )}
            
            {genError && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl mt-4 max-w-md">
                {genError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )}
</div>
  );
}

