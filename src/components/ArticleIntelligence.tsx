import React, { useState, useRef } from 'react';
import { ArticleSeriesResponse } from '../types';
import { BookOpen, Sparkles, RefreshCw, FileText, CheckCircle2, Copy, Check, Video, ListChecks, Layers, Compass, Brain, Shield, Users, Heart, Share2, HelpCircle, Zap, Cpu, Database } from 'lucide-react';

interface ArticleIntelligenceProps {
  knowledgeBaseText: string;
  selectedFile: any;
}

const TOPIC_PRESETS = [
  { id: 'living_the_dream', title: 'חיים את החלום ועדיין לא נהנים', icon: Compass, desc: 'פסיכולוג בכיס, מתכנת בכיס, דייט וירטואלי - למה השפע הדיגיטלי משאיר את המוח מבודד ותקוע, ואיך להשתחרר ללא אשמה' },
  { id: 'brain', title: 'המוח, מערכת העצבים ומערכת ההישרדות', icon: Brain, desc: 'פירוק האמיגדלה, תגובת הישרדות (Fight/Flight) ואיך המוח לומד ומעבד דפוסים' },
  { id: 'patterns', title: 'שחרור דפוסים והרגלים אוטומטיים', icon: RefreshCw, desc: 'איך דפוס נוצר בילדות, מה הרווח המשני שלו ואיך משחררים אותו ללא מאבק' },
  { id: 'anxiety', title: 'סוגי חרדות ומנגנוני הגנה הישרדותיים', icon: Shield, desc: 'חרדת ביצוע, חרדה חברתית, הסתרת הפחד ותגובות הגוף' },
  { id: 'parents_teens', title: 'דינמיקת הורים ונוער (Co-regulation)', icon: Users, desc: 'ויסות רגשי משותף, יצירת מרחב בטוח ללא מלכוד ההסברים ומעבר ממאבק לחיבור' },
];

export default function ArticleIntelligence({ knowledgeBaseText, selectedFile }: ArticleIntelligenceProps) {
  const [topic, setTopic] = useState('');
  const [outputType, setOutputType] = useState<'video_series' | 'short_guide' | 'both'>('both');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.5-flash' | 'gemini-3.1-pro'>('gemini-3.5-flash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ArticleSeriesResponse | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [copiedEpisode, setCopiedEpisode] = useState<number | null>(null);
  const [copiedGuide, setCopiedGuide] = useState(false);

  // Client-side response cache to save API calls
  const cacheRef = useRef<Map<string, ArticleSeriesResponse>>(new Map());

  const handleGenerate = async (presetTitle?: string, forceRefresh = false) => {
    const targetTopic = presetTitle || topic;
    if (!targetTopic.trim()) return;

    if (presetTitle) {
      setTopic(presetTitle);
    }

    const cacheKey = `${targetTopic.trim().toLowerCase()}_${outputType}_${selectedModel}`;

    // Check cache first to avoid API quota waste
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
      const response = await fetch('/api/gemini/article-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          outputType,
          model: selectedModel,
          knowledgeBaseText,
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        if (!response.ok) {
          throw new Error(`שגיאה בתקשורת עם השרת: ${responseText.slice(0, 150) || 'תגובה לא תקינה'}`);
        }
      }

      if (!response.ok) {
        throw new Error(data.error || 'נכשלה סריקת המאמרים ביצירת הסדרה');
      }

      cacheRef.current.set(cacheKey, data);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'אירעה שגיאה בעיבוד המאמרים');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEpisode = (ep: any, index: number) => {
    const textToCopy = `🎬 ${ep.title}
    
📌 הוק (3 שניות): ${ep.hook}

🧠 מנגנון מהמאמר: ${ep.coreConcept}

📜 תסריט / ראשי פרקים:
${ep.scriptOutline}

💡 מסר וסיכום:
${ep.takeaway}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedEpisode(index);
    setTimeout(() => setCopiedEpisode(null), 2000);
  };

  const handleCopyGuide = () => {
    if (!result?.shortGuide) return;
    const g = result.shortGuide;
    const textToCopy = `📘 ${g.guideTitle}
קהל יעד: ${g.targetAudience}

💡 תובנות מפתח מהמאמרים:
${g.coreInsights.map(i => `• ${i}`).join('\n')}

✅ צ'ק ליסט פרקטי לניסוי בבית:
${g.practicalChecklist.map(c => `[ ] ${c}`).join('\n')}

🧭 סיכום:
${g.summaryCallToAction}
`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedGuide(true);
    setTimeout(() => setCopiedGuide(false), 2000);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-right">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> מקור האמת: סורק המאמרים ופירוק לסדרות
            </span>
            {selectedFile ? (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                מחובר לקובץ '{selectedFile.name}'
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                מחובר למאגר הידע האסטרטגי
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
            פירוק מאמרים וחומרי ידע לסדרת סרטונים ומדריכים קצרים
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
            המאמרים הם מקור האמת. בחר נושא מרכזי (המוח, שחרור דפוסים, מערכת העצבים, סוגי חרדות, הורים ונוער) והמערכת תסרוק את הידע ותפרק אותו לסדרת סרטונים מובנית ולמדריכים פרקטיים.
          </p>
        </div>
      </div>

      {/* Preset Topics */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-300 block">
          בחר נושא ליבה לסריקת המאמרים ופירוקם:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TOPIC_PRESETS.map((preset) => {
            const isSelected = topic === preset.title;
            const IconComp = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleGenerate(preset.title)}
                disabled={loading}
                className={`p-4 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/15 text-white font-semibold shadow-lg shadow-indigo-950/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500 text-slate-950' : 'bg-slate-900 text-indigo-400'}`}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold leading-snug">{preset.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  {preset.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Selection & Quota Optimization Selector */}
      <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-slate-200">בחירת מודל Gemini וחיסכון במכסת API:</span>
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            (סריקת מאמרים מותאמת עם קטיעת טוקנים חכמה למניעת בזבוז)
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="inline-flex bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedModel('gemini-3.5-flash')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedModel === 'gemini-3.5-flash'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Gemini 3.5 Flash (מהיר וחסכוני)
            </button>
            <button
              type="button"
              onClick={() => setSelectedModel('gemini-3.1-pro')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedModel === 'gemini-3.1-pro'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Gemini 3.1 Pro (ניתוח מעמיק)
            </button>
          </div>
        </div>
      </div>

      {/* Custom Topic Input & Output Mode */}
      <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="או הקלד נושא מותאם אישית מהמאמרים (לדוגמה: 'איך לעזור לנער שננעל מול חרדת ביצוע')..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
          />

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setOutputType('both')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                outputType === 'both' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              סדרה + מדריך
            </button>
            <button
              type="button"
              onClick={() => setOutputType('video_series')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                outputType === 'video_series' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              סדרת סרטונים
            </button>
            <button
              type="button"
              onClick={() => setOutputType('short_guide')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                outputType === 'short_guide' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              מדריך קצר
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={loading || !topic.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                סורק מאמרים ומפרק...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                סרוק ופרק עכשיו
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Generated Output */}
      {result && (
        <div className="space-y-6 mt-6 animate-in fade-in duration-300">
          
          {/* Single Source of Truth Summary */}
          <div className="bg-gradient-to-r from-indigo-950/60 to-slate-950 border border-indigo-500/30 rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <FileText className="w-4 h-4 shrink-0" />
                מקור האמת: תובנות מפתח שנשלפו מתוך המאמרים
              </div>
              {isFromCache ? (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-400" />
                  תוצאה משוחזרת מהמטמון (אפס ניצול מכסת API)
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  מודל: {selectedModel} (קטיעת טוקנים אופטימלית)
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-100/90 leading-relaxed font-sans">
              {result.sourceSummary}
            </p>
          </div>

          {/* Video Series Section */}
          {result.episodes && result.episodes.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 rounded-full">
                    🎬 סדרת סרטונים מובנית
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {result.seriesTitle || `סדרת סרטונים: ${result.topic}`}
                  </h3>
                  {result.seriesDescription && (
                    <p className="text-xs text-slate-400 mt-0.5">{result.seriesDescription}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {result.episodes.map((ep, idx) => (
                  <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 relative">
                    <div className="flex justify-between items-start gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          פרק {ep.episodeNumber || idx + 1}
                        </span>
                        <h4 className="text-md font-bold text-white mt-1">{ep.title}</h4>
                      </div>
                      <button
                        onClick={() => handleCopyEpisode(ep, idx)}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                      >
                        {copiedEpisode === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedEpisode === idx ? 'הועתק!' : 'העתק פרק'}
                      </button>
                    </div>

                    {/* Hook */}
                    <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-amber-400 block">⚡ הוק ל-3 השניות הראשונות:</span>
                      <p className="text-xs text-amber-100 font-medium">"{ep.hook}"</p>
                    </div>

                    {/* Core Concept */}
                    <div className="bg-indigo-950/20 border border-indigo-500/20 p-3 rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-indigo-300 block">🧠 המנגנון מהמאמר:</span>
                      <p className="text-xs text-indigo-100">{ep.coreConcept}</p>
                    </div>

                    {/* Script Outline */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-slate-300 block">📜 תסריט קולח בפרומפטר / פירוק פרק:</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 whitespace-pre-line">
                        {ep.scriptOutline}
                      </p>
                    </div>

                    {/* Takeaway */}
                    <div className="text-xs text-slate-400 italic pt-1 border-t border-slate-850 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>{ep.takeaway}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Short Guide Section */}
          {result.shortGuide && (
            <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 rounded-full flex items-center gap-1 w-fit">
                    <ListChecks className="w-3.5 h-3.5" /> מדריך קצר וצ'ק-ליסט לפעולה בבית
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {result.shortGuide.guideTitle}
                  </h3>
                  <p className="text-xs text-slate-400">
                    קהל יעד: <strong className="text-slate-200">{result.shortGuide.targetAudience}</strong>
                  </p>
                </div>
                <button
                  onClick={handleCopyGuide}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-white bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {copiedGuide ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedGuide ? 'הועתק!' : 'העתק מדריך'}
                </button>
              </div>

              {/* Core Insights */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  תובנות ליבה מתוך המאמרים:
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {result.shortGuide.coreInsights.map((insight, idx) => (
                    <li key={idx} className="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-xl text-xs text-indigo-100 leading-relaxed">
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Practical Checklist */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  צ'ק-ליסט מעשי לניסוי בבית:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.shortGuide.practicalChecklist.map((item, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl text-xs text-slate-200 flex items-start gap-2">
                      <div className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                        {idx + 1}
                      </div>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{result.shortGuide.summaryCallToAction}</span>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
