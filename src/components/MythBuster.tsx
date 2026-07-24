import React, { useState, useRef } from 'react';
import { MythBusterResult } from '../types';
import { Zap, Sparkles, RefreshCw, Coffee, Brain, ShieldAlert, CheckCircle2, ArrowRight, Copy, Check, Compass, HelpCircle, Cpu, Database } from 'lucide-react';

interface MythBusterProps {
  knowledgeBaseText: string;
  initialConcept?: string;
  onSelectConceptForScript?: (conceptText: string) => void;
}

const PRESET_CONCEPTS = [
  "חיים את החלום ועדיין לא נהנים: פסיכולוג בכיס, מתכנת בכיס, דייט וירטואלי - ולמה המוח משאיר אותנו מבודדים ולא מאושרים",
  "תגובת אינסטנט - לקפוץ בשנייה שהילד מבקש משהו",
  "מלכוד ההסברים - וויכוחים בלתי נגמרים והסברים מתישים",
  "הסתגרות המתבגר בחדר וניתוח שתיקות",
  "התפרצויות זעם ונעילת המוח החושב (אמיגדלה)",
  "אימפולסיביות ומסכים - מנגנון הדופמין והצפה רגשית"
];

export default function MythBuster({ knowledgeBaseText, initialConcept, onSelectConceptForScript }: MythBusterProps) {
  const [concept, setConcept] = useState(initialConcept || '');
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro'>('gemini-2.5-flash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MythBusterResult | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [copied, setCopied] = useState(false);

  const cacheRef = useRef<Map<string, MythBusterResult>>(new Map());

  // Automatically load and analyze when initialConcept is passed from Atlas
  React.useEffect(() => {
    if (initialConcept && initialConcept.trim()) {
      setConcept(initialConcept);
      handleGenerate(initialConcept);
    }
  }, [initialConcept]);

  const handleGenerate = async (selectedConcept?: string, forceRefresh = false) => {
    const targetConcept = selectedConcept || concept;
    if (!targetConcept.trim()) return;

    if (selectedConcept) {
      setConcept(selectedConcept);
    }

    const cacheKey = `${targetConcept.trim().toLowerCase()}_${selectedModel}`;

    if (!forceRefresh && cacheRef.current.has(cacheKey)) {
      setResult(cacheRef.current.get(cacheKey)!);
      setIsFromCache(true);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setIsFromCache(false);

    try {
      const response = await fetch('/api/gemini/mythbuster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: targetConcept,
          model: selectedModel,
          knowledgeBaseText
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        if (!response.ok) {
          throw new Error(`שגיאה בשרת: ${responseText.slice(0, 150) || 'תגובה לא תקינה'}`);
        }
      }

      if (!response.ok) {
        throw new Error(data.error || 'נכשלה יצירת הניתוח');
      }

      cacheRef.current.set(cacheKey, data);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'אירעה שגיאה ביצירת הניתוח');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const textToCopy = `🔥 מנפץ המיתוסים • לב המצפן

📌 מושג: ${result.concept}

❌ המיתוס הרווח:
${result.myth}

🧠 המציאות המדעית / הביולוגית:
${result.reality}

☕ בשיחת קפה בגובה העיניים:
${result.friendExplanation}

💡 מה כדאי לנסות בפעם הבאה:
${result.tryNextTime}

⚓ עוגן מדעי: ${result.scientificAnchor}

🧭 הבנה אלגנטית:
${result.takeaway}
`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-right">
      
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> מנוע ניפוץ מיתוסים
            </span>
            {knowledgeBaseText && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                מחובר למאגר הידע
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
            MythBuster: מיתוס מול מציאות מדגשית וביולוגית
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            קח תגובה הורית, דפוס התנהגות או מנגנון נפשי, והוכח בצורה קלילה, עניינית ומעוגנת מדעית מה המוח והפסיכולוגיה ההתפתחותית באמת מראים.
          </p>
        </div>
      </div>

      {/* Preset Concepts */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-300 block">
          בחר תגובה/דפוס נפוץ או הקלד משהו מותאם אישית:
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_CONCEPTS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleGenerate(preset)}
              disabled={loading}
              className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                concept === preset
                  ? 'border-amber-500 bg-amber-500/15 text-amber-300 font-semibold'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection Bar */}
      <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold text-slate-200">מודל Gemini:</span>
        </div>
        <div className="inline-flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setSelectedModel('gemini-2.5-flash')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
              selectedModel === 'gemini-2.5-flash'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3 h-3" />
            Flash (מהיר)
          </button>
          <button
            type="button"
            onClick={() => setSelectedModel('gemini-2.5-pro')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
              selectedModel === 'gemini-2.5-pro'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3 h-3" />
            Pro (עמוק)
          </button>
        </div>
      </div>

      {/* Custom Input Form */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="או הקלד תגובה/מושג, לדוגמה: 'להתווכח על שעות שינה', 'קפיצה מתוך חרדה'..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
        />
        <button
          type="button"
          onClick={() => handleGenerate()}
          disabled={loading || !concept.trim()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-amber-600/10 disabled:opacity-50 cursor-pointer shrink-0"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              מנתח ומנפץ מיתוס...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              נפץ מיתוס עכשיו
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="mt-6 space-y-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden animate-in fade-in duration-300">
          
          {/* Header Action Bar */}
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20 font-semibold">
                {result.scientificAnchor || "עוגן מדעי/פסיכולוגי"}
              </span>
              {isFromCache && (
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-400" />
                  מטמון מקומי
                </span>
              )}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'הועתק!' : 'העתק ניתוח'}
            </button>
          </div>

          {/* Grid: Myth vs Reality */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* The Myth Card */}
            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                ❌ המיתוס הרווח (מה חושבים בטעות)
              </div>
              <p className="text-xs text-red-200/90 leading-relaxed font-sans">
                {result.myth}
              </p>
            </div>

            {/* The Reality Card */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Brain className="w-4 h-4 shrink-0" />
                🧠 המציאות המדעית / הביולוגית
              </div>
              <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
                {result.reality}
              </p>
            </div>

          </div>

          {/* Friendly Coffee Explanation */}
          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
              <Coffee className="w-4 h-4 shrink-0 text-amber-400" />
              ☕ בשיחת קפה בגובה העיניים (איך להסביר לחברה/הורה)
            </div>
            <p className="text-xs text-indigo-100/90 leading-relaxed font-sans">
              {result.friendExplanation}
            </p>
          </div>

          {/* What to try next time */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4 shrink-0" />
              💡 מה כדאי לנסות בפעם הבאה
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed font-sans">
              {result.tryNextTime}
            </p>
          </div>

          {/* Elegant Takeaway & Professional Guidance */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950/80 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
            <Compass className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-300 block">
                הבנה אלגנטית • הצעד הראשון לשינוי אמיתי
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {result.takeaway}
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
