import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Sparkles, 
  Link2, 
  Globe, 
  Check, 
  Copy, 
  HelpCircle, 
  ArrowRightLeft, 
  BookOpen, 
  Flame, 
  Play, 
  AlertCircle, 
  Plus, 
  Loader2, 
  FileText, 
  Compass, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Users
} from 'lucide-react';
import { Campaign, ScrapedArticle, DriveFile, ScriptSequence, ScriptAnalysisResult } from '../types';

interface CampaignPlannerProps {
  knowledgeBaseText: string;
  selectedFile: DriveFile | null;
}

export default function CampaignPlanner({ knowledgeBaseText, selectedFile }: CampaignPlannerProps) {
  // Sub-Tab State
  const [plannerSubTab, setPlannerSubTab] = useState<'campaign' | 'sequence'>('campaign');

  // Target Demography State
  const [targetDemography, setTargetDemography] = useState<'parents' | 'teens' | 'dialog'>('parents');

  // Campaign Generation State
  const [theme, setTheme] = useState('התמודדות עם התפרצות זעם והסתגרות של מתבגר בלי להיגרר למאבקי כוח');
  const [seriesType, setSeriesType] = useState<'short_series' | 'monthly_series' | 'full_calendar'>('monthly_series');
  const [useZeigarnik, setUseZeigarnik] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['tiktok', 'reels']);
  
  const [generating, setGenerating] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Direct Connected Script Sequence State
  const [sequenceTheme, setSequenceTheme] = useState('איך לזהות עומס רגשי וחרדה אצל מתבגרים ולבסס ויסות רגשי משותף');
  const [sequenceCount, setSequenceCount] = useState<number>(3);
  const [sequencePlatform, setSequencePlatform] = useState<string>('tiktok');
  const [sequenceGenerating, setSequenceGenerating] = useState(false);
  const [scriptSequence, setScriptSequence] = useState<ScriptSequence | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [copiedSeqIdx, setCopiedSeqIdx] = useState<number | null>(null);

  // Scraper State
  const [scraperUrl, setScraperUrl] = useState('https://www.heartcompass.co.il/articles');
  const [scraping, setScraping] = useState(false);
  const [scrapedArticles, setScrapedArticles] = useState<ScrapedArticle[]>([]);
  const [scraperError, setScraperError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ScrapedArticle | null>(null);

  // Script Generator for selected video
  const [selectedVideoIdx, setSelectedVideoIdx] = useState<number | null>(null);
  const [scriptGenerating, setScriptGenerating] = useState<number | null>(null);
  const [generatedScripts, setGeneratedScripts] = useState<Record<number, string>>({});
  const [copiedVideoIdx, setCopiedVideoIdx] = useState<number | null>(null);

  // Professional Language Accuracy State
  const [analysisResult, setAnalysisResult] = useState<ScriptAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Load sample articles on start just to populate nicely or let them scrape
  useEffect(() => {
    // We can pre-populate with some high-fidelity mock summaries that reflect heartcompass's true language
    // just in case they don't click scrape first, but encourage them to scrape!
    setScrapedArticles([
      {
        title: "ההתנהגות היא לא הבעיה - היא הרמז",
        url: "https://www.heartcompass.co.il/articles",
        summary: "הניתוח הפסיכולוגי העמוק של מנגנוני הגנה רגשיים. המאמר מסביר כיצד הניסיונות של אנשים לשנות ישירות הרגלים והתנהגויות נכשלים שוב ושוב מפני שהשורש הרגשי לא טופל.",
        terminology: ["מנגנון שורש", "התנהגות כרמז", "שינוי סיפור"],
        insight: "אנחנו נלחמים בסימפטום במקום להקשיב למה שהוא מנסה להגיד לנו על חוסר האונים שלנו."
      },
      {
        title: "מדוע אנחנו מרצים את כולם ומבטלים את עצמנו?",
        url: "https://www.heartcompass.co.il/articles",
        summary: "פירוק מנגנון הריצוי (Pleasing) כתוצר הישרדותי של פחד עמוק מדחייה או נטישה בילדות, ואיך להפוך הצבת גבולות למעשה של קירבה.",
        terminology: ["ריצוי הישרדותי", "אשמה זמנית", "הצבת גבולות כקירבה"],
        insight: "הסכמה לשאת את האשמה הרגעית של ה-לא לאחר, היא הדרך היחידה להגיד כן לעצמך."
      }
    ]);
  }, []);

  // Clear analysis on tab switch
  useEffect(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
  }, [plannerSubTab]);

  // Handle URL scraping
  const handleScrape = async () => {
    setScraping(true);
    setScraperError(null);
    try {
      const res = await fetch('/api/articles/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scraperUrl })
      });
      if (!res.ok) {
        throw new Error('שגיאה בשליפת המאמרים מהאתר. ודא שהכתובת תקינה.');
      }
      const data = await res.json();
      if (data.articles && data.articles.length > 0) {
        setScrapedArticles(data.articles);
        setSelectedArticle(data.articles[0]); // Select first automatically
      } else {
        throw new Error('לא נמצאו מאמרים בפורמט הנדרש בקוד ה-HTML של העמוד.');
      }
    } catch (err: any) {
      setScraperError(err.message || 'שגיאה לא צפויה בעת סריקת האתר.');
    } finally {
      setScraping(false);
    }
  };

  // Generate monthly campaign
  const handleGenerateCampaign = async () => {
    setGenerating(true);
    setError(null);
    setCampaign(null);
    setSelectedVideoIdx(null);
    setGeneratedScripts({});
    setAnalysisResult(null);
    setAnalysisError(null);

    // Combine user's drive context and the website scraped context
    let combinedKnowledge = '';
    if (selectedFile && knowledgeBaseText) {
      combinedKnowledge += `[מאגר ידע מתוך דרייב - קובץ ${selectedFile.name}]:\n${knowledgeBaseText}\n\n`;
    }
    if (selectedArticle) {
      combinedKnowledge += `[מאגר ידע סרוק ממאמר באתר - "${selectedArticle.title}"]:
תמצית: ${selectedArticle.summary}
מונחים מרכזיים: ${selectedArticle.terminology?.join(', ') || ''}
ציטוט מפתח: ${selectedArticle.insight || ''}\n\n`;
    }

    try {
      const res = await fetch('/api/gemini/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          seriesType,
          useZeigarnik,
          platforms: selectedPlatforms,
          knowledgeBaseText: combinedKnowledge,
          targetDemography
        })
      });
      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        if (!res.ok) {
          throw new Error(`שגיאה בשרת: ${responseText.slice(0, 150) || 'תגובה לא תקינה'}`);
        }
      }

      if (!res.ok) {
        throw new Error(data.error || 'שגיאה ביצירת תוכנית הקמפיין. נסה שוב.');
      }

      setCampaign(data);
    } catch (err: any) {
      setError(err.message || 'ארעה שגיאה בתהליך הניתוח של ג׳ימיני.');
    } finally {
      setGenerating(false);
    }
  };

  // Handle Connected Script Sequence Generation
  const handleGenerateScriptSequence = async () => {
    setSequenceGenerating(true);
    setSequenceError(null);
    setScriptSequence(null);
    setAnalysisResult(null);
    setAnalysisError(null);

    // Combine user's drive context and the website scraped context
    let combinedKnowledge = '';
    if (selectedFile && knowledgeBaseText) {
      combinedKnowledge += `[מאגר ידע מתוך דרייב - קובץ ${selectedFile.name}]:\n${knowledgeBaseText}\n\n`;
    }
    if (selectedArticle) {
      combinedKnowledge += `[מאגר ידע סרוק ממאמר באתר - "${selectedArticle.title}"]:
תמצית: ${selectedArticle.summary}
מונחים מרכזיים: ${selectedArticle.terminology?.join(', ') || ''}
ציטוט מפתח: ${selectedArticle.insight || ''}\n\n`;
    }

    try {
      const res = await fetch('/api/gemini/generate-script-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: sequenceTheme,
          count: sequenceCount,
          platform: sequencePlatform,
          knowledgeBaseText: combinedKnowledge,
          targetDemography
        })
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        if (!res.ok) {
          throw new Error(`שגיאה בשרת: ${responseText.slice(0, 150) || 'תגובה לא תקינה'}`);
        }
      }

      if (!res.ok) {
        throw new Error(data.error || 'שגיאה ביצירת סדרת התסריטים. אנא נסה שוב.');
      }

      setScriptSequence(data);
    } catch (err: any) {
      setSequenceError(err.message || 'ארעה שגיאה בתהליך הניתוח של ג׳ימיני.');
    } finally {
      setSequenceGenerating(false);
    }
  };

  // Analyze professional accuracy of currently active scripts
  const handleAnalyzeScriptsAccuracy = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    // Collect the correct scripts to analyze
    let scriptsToAnalyze: any[] = [];
    if (plannerSubTab === 'sequence') {
      if (!scriptSequence || !scriptSequence.scripts || scriptSequence.scripts.length === 0) {
        setAnalysisError('אין עדיין סדרת תסריטים מחוברים לניתוח. אנא ייצר סדרה תחילה.');
        setAnalyzing(false);
        return;
      }
      scriptsToAnalyze = scriptSequence.scripts.map((s, idx) => ({
        title: s.title || `סרטון ${idx + 1} (${s.episode})`,
        scriptText: s.scriptText
      }));
    } else {
      if (!campaign || !campaign.videos || campaign.videos.length === 0) {
        setAnalysisError('אין עדיין תוכנית קמפיין לניתוח. אנא בנה תוכנית תחילה.');
        setAnalyzing(false);
        return;
      }
      scriptsToAnalyze = campaign.videos.map((v, idx) => ({
        title: `${v.day} - ${v.title}`,
        scriptText: generatedScripts[idx] || `[רק קונספט קיים]: מנגנון: ${v.mechanism}. הוק: ${v.hook}. לולאה פתוחה: ${v.openLoop}`
      }));
    }

    // Combine user's drive context and the website scraped context
    let combinedKnowledge = '';
    if (selectedFile && knowledgeBaseText) {
      combinedKnowledge += `[מאגר ידע מתוך דרייב - קובץ ${selectedFile.name}]:\n${knowledgeBaseText}\n\n`;
    }
    if (selectedArticle) {
      combinedKnowledge += `[מאגר ידע סרוק ממאמר באתר - "${selectedArticle.title}"]:
תמצית: ${selectedArticle.summary}
מונחים מרכזיים: ${selectedArticle.terminology?.join(', ') || ''}
ציטוט מפתח: ${selectedArticle.insight || ''}\n\n`;
    }

    try {
      const res = await fetch('/api/gemini/analyze-scripts-accuracy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scripts: scriptsToAnalyze,
          knowledgeBaseText: combinedKnowledge || undefined
        })
      });

      if (!res.ok) {
        throw new Error('שגיאה במהלך פניית הניתוח לג׳ימיני. אנא נסה שוב.');
      }
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err: any) {
      setAnalysisError(err.message || 'ניתוח הדיוק נכשל. ודא שברשותך חיבור תקין.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate script for a specific campaign video
  const handleGenerateScriptForVideo = async (video: any, index: number) => {
    setScriptGenerating(index);
    try {
      // Build a target context that strictly guides Gemini to write the script
      // based on the Campaign context and the Zeigarnik open loops!
      const systemInstructionContext = `
קמפיין אסטרטגי: "${campaign?.themeTitle}"
מטרת הקמפיין: ${campaign?.description}
הסרטון הנוכחי בסדרה: ${video.day} - "${video.title}"
מנגנון נפשי ממוקד: ${video.mechanism}
הוק של 3 שניות: "${video.hook}"
מהלך ואווירה (Green Effect): ${video.greenEffectVibe}
סיום עם לולאת גרייניק פתוחה (Zeigarnik Loop) לקישור לסרטון הבא: "${video.openLoop}"
`;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mechanism: video.mechanism,
          pillar: campaign?.themeTitle || 'תוכנית קמפיין מבוססת מנגנונים',
          template: `תבנית רצף נרטיבי: ${video.title}`,
          platform: selectedPlatforms[0] || 'tiktok',
          targetDemography,
          knowledgeBaseText: `${systemInstructionContext}\n\nהקפד לסיים את הסרטון בדיוק בלולאה הפתוחה (Open Loop) שהוגדרה כדי לגרום לצופה לחכות בשיגעון לסרטון הבא ברצף!`
        })
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setGeneratedScripts(prev => ({ ...prev, [index]: data.script }));
      setSelectedVideoIdx(index);
    } catch (err) {
      alert('שגיאה ביצירת התסריט. אנא נסה שוב.');
    } finally {
      setScriptGenerating(null);
    }
  };

  const copyScriptText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedVideoIdx(index);
    setTimeout(() => setCopiedVideoIdx(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="campaign-planner-container">
      
      {/* Sidebar: Source Articles Web-Scraper */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* Scraper Box */}
        <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800/60">
            <Globe className="w-5 h-5 text-indigo-400" />
            סנכרון מאמרים מהאתר
          </h3>
          
          <p className="text-xs text-slate-400 leading-relaxed">
            חבר את האתר <span className="font-mono text-indigo-300">heartcompass.co.il/articles</span> או כל דף אחר כדי שג׳ימיני ישאב ישירות את המחקרים, סגנון השפה והניתוחים העמוקים שלך ויעיל אותם לתוכנית התוכן.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">כתובת דף המאמרים לסריקה</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={scraperUrl}
                onChange={(e) => setScraperUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-800 rounded-xl text-xs text-slate-200 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
                placeholder="https://www.heartcompass.co.il/articles"
              />
              <button
                onClick={handleScrape}
                disabled={scraping || !scraperUrl}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition-all border border-slate-700/60 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {scraping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  'סרוק דף'
                )}
              </button>
            </div>
          </div>

          {scraperError && (
            <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-xs p-2.5 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{scraperError}</span>
            </div>
          )}

          {/* Scraped Articles List */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">מאמרים שנסרקו ({scrapedArticles.length})</span>
              {selectedArticle && (
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  מאמר פעיל כעת
                </span>
              )}
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {scrapedArticles.map((art, idx) => {
                const isSelected = selectedArticle?.title === art.title;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedArticle(art)}
                    className={`p-3 rounded-xl border text-right cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-indigo-500/50 bg-indigo-950/40 text-white'
                        : 'border-slate-850 bg-slate-950/40 hover:border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-semibold text-xs leading-snug line-clamp-2">{art.title}</span>
                      <FileText className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    </div>
                    
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{art.summary}</p>
                    
                    {art.terminology && art.terminology.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {art.terminology.map((term, tIdx) => (
                          <span key={tIdx} className="text-[8px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                            {term}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {selectedArticle && (
              <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-xl text-[11px] space-y-1">
                <p className="font-bold text-indigo-300">💡 ציטוט פותח תודעה מהמאמר:</p>
                <p className="text-slate-300 italic leading-relaxed">"{selectedArticle.insight}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Strategic Tips Panel */}
        <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 space-y-3.5" id="parent-teen-tips-panel">
          <h4 className="font-bold text-white text-xs flex items-center gap-1.5 justify-start text-right">
            <Compass className="w-4 h-4 text-emerald-400" />
            מכוונים לשמירות, שיתופים ושיחות ייעוץ
          </h4>
          <ul className="text-[11px] text-slate-400 space-y-2.5 leading-relaxed list-disc list-inside pr-1 text-right">
            <li>
              <strong className="text-emerald-400">ערך לשמירה ושיתוף</strong>: הסוד לוויראליות אצל הורים הוא "קליק" של הזדהות פוקחת עיניים. התוכן מעוצב כך שההורה ירצה לשמור את הסרטון, לראות אותו שוב בלילה עם בן הזוג, או להיזכר בתובנות רגע לפני שהוא משוחח עם המתבגר.
            </li>
            <li>
              <strong className="text-slate-300">היפוכים פסיכולוגיים (האוטוריטות)</strong>: נשענים על גישות מובילות (חיים עומר - נוכחות הורית מבוססת ביטחון, דן סיגל - המוח המתבגר וויסות רגשי משותף, אדלר - מאבקי כוח ושייכות) כדי לפרק מנגנונים בצורה מדויקת ומפתיעה.
            </li>
            <li>
              <strong className="text-amber-400">ההבנה לא פותרת את הבעיה</strong>: אנחנו יודעים שהבנה בלבד לא תפתור בעיה רגשית בקשר. לכן, התוכן מכוון ומניע בעקביות את ההורים לקחת את התובנות צעד קדימה ולתאם <strong className="text-white">שיחת ייעוץ</strong> ממוקדת עם צוות "לב המצפן".
            </li>
            <li>
              <strong className="text-slate-300">אפקט גרייניק (Zeigarnik Loop)</strong>: שימוש בלולאות פתוחות שגורמות לצופה לעקוב אחרי כל הסרטונים ברצף כדי לקבל את הפתרון.
            </li>
          </ul>
        </div>
      </div>

      {/* Main Panel: Monthly Strategy Campaign Generator */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Planner Settings */}
        <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/60 pb-3 text-right">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5.5 h-5.5 text-indigo-400" />
                מחולל קמפיינים וסדרות להורים ומתבגרים
              </h2>
              <p className="text-xs text-slate-400">תכנון אסטרטגי של סדרות תוכן המכוונות לשמירות, שיתופים זוגיים והנעה לשיחות ייעוץ</p>
            </div>
            
            {/* Active context badge */}
            <div className="flex flex-wrap gap-1.5">
              {selectedFile && (
                <span className="text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  דרייב מחובר
                </span>
              )}
              {selectedArticle && (
                <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  מאמר מחובר
                </span>
              )}
            </div>
          </div>

          {/* Sub-Tabs Switcher */}
          <div className="flex border-b border-slate-800/40 pb-1.5 gap-2 text-right justify-start">
            <button
              onClick={() => setPlannerSubTab('campaign')}
              className={`pb-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                plannerSubTab === 'campaign'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              קמפיין אסטרטגי חודשי
            </button>
            <button
              onClick={() => setPlannerSubTab('sequence')}
              className={`pb-2 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                plannerSubTab === 'sequence'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              יצירת רצף תסריטים (גרייניק)
            </button>
          </div>

          {/* Target Demography Selector */}
          <div className="space-y-2.5 text-right bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl" id="target-demography-selector">
            <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 justify-start">
              <Users className="w-4 h-4 text-indigo-400" />
              דמוגרפיית יעד להתאמת התוכן והטון הטיפולי:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'parents',
                  title: 'הורים למתבגרים',
                  desc: 'התמקדות בנוכחות הורית, סמכות מבוססת ביטחון והימנעות ממלכוד ההסברים ומאבקי כוח',
                },
                {
                  id: 'teens',
                  title: 'בני נוער ומתבגרים',
                  desc: 'שיח ישיר בגובה העיניים, התמודדות עם לחץ חברתי, ריצוי ומסכים כמפלט',
                },
                {
                  id: 'dialog',
                  title: 'שיח רגשי ודיאלוג משפחתי',
                  desc: 'דגש על שפה רגשית עמוקה, ויסות רגשי משותף (Co-regulation) וגישור הורה-מתבגר',
                },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setTargetDemography(d.id as any)}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between h-full ${
                    targetDemography === d.id
                      ? 'border-indigo-500 bg-indigo-950/25 text-white shadow-inner'
                      : 'border-slate-850 bg-slate-950/20 hover:border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-200 block mb-1">{d.title}</span>
                  <span className="text-[10px] text-slate-400 leading-normal">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {plannerSubTab === 'sequence' ? (
              <div className="space-y-4">
                {/* 1. Theme Input */}
                <div className="space-y-1.5 text-right">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 block">1. מהו נושא רצף התסריטים להורים ומתבגרים?</label>
                  </div>
                  <textarea
                    value={sequenceTheme}
                    onChange={(e) => setSequenceTheme(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-800 rounded-xl text-sm text-slate-200 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-right leading-relaxed"
                    placeholder="לדוגמה: חיים את החלום ועדיין לא נהנים - פסיכולוג בכיס, דייט וירטואלי ולמה המוח משאיר אותנו תקועים..."
                  />
                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1 justify-end">
                    <span className="text-[10px] text-slate-500 font-medium self-center ml-1">הצעות נושאים:</span>
                    <button
                      onClick={() => setSequenceTheme("חיים את החלום ועדיין לא נהנים: פסיכולוג בכיס, מתכנת בכיס, דייט וירטואלי - ולמה המוח משאיר אותנו מבודדים ולא מאושרים")}
                      className="text-[10px] bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 text-indigo-300 px-2.5 py-1 rounded-full transition-all cursor-pointer font-medium"
                    >
                      🔥 חיים את החלום ועדיין לא נהנים
                    </button>
                    <button
                      onClick={() => setSequenceTheme("התמודדות עם התפרצות זעם והסתגרות של מתבגר בלי להיגרר למאבקי כוח")}
                      className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                    >
                      התפרצויות זעם ומאבקי כוח
                    </button>
                    <button
                      onClick={() => setSequenceTheme("פירוק מנגנון הריצוי, חרדת הדחייה והבושה בגיל ההתבגרות")}
                      className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                    >
                      מנגנון הריצוי וחרדת הדחייה
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                  {/* 2. Script Count */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">2. מספר הסרטונים ברצף</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setSequenceCount(num)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            sequenceCount === num
                              ? 'border-indigo-500 bg-indigo-950/40 text-white font-medium shadow-inner'
                              : 'border-slate-850 bg-slate-950/40 hover:border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="text-xs font-semibold">{num} סרטונים</span>
                          <span className="text-[9px] text-slate-500 mt-0.5">ברצף מחובר</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Platform */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">3. פלטפורמה להפצה</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'tiktok', name: 'טיקטוק' },
                        { id: 'reels', name: 'רילס' },
                        { id: 'shorts', name: 'שורטס' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSequencePlatform(p.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                            sequencePlatform === p.id
                              ? 'border-indigo-500 bg-indigo-950/40 text-white font-medium shadow-inner'
                              : 'border-slate-850 bg-slate-950/40 hover:border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="text-xs font-semibold">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  onClick={handleGenerateScriptSequence}
                  disabled={sequenceGenerating || !sequenceTheme}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sequenceGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      כותב את סדרת התסריטים המחוברת בשיטת גרייניק...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      ייצר רצף תסריטים מחוברים (גרייניק)
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Theme Input */}
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-semibold text-slate-300 block">1. מהו הנושא או הקונספט החודשי להורים ומתבגרים שתרצה לפרק?</label>
                  <textarea
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-800 rounded-xl text-sm text-slate-200 bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-right leading-relaxed"
                    placeholder="לדוגמה: חיים את החלום ועדיין לא נהנים - פסיכולוג בכיס, דייט וירטואלי ולמה המוח משאיר אותנו תקועים..."
                  />
                  {/* Preset Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1 justify-end">
                    <span className="text-[10px] text-slate-500 font-medium self-center ml-1">הצעות קונספט:</span>
                    <button
                      onClick={() => setTheme("חיים את החלום ועדיין לא נהנים: פסיכולוג בכיס, מתכנת בכיס, דייט וירטואלי - ולמה המוח משאיר אותנו מבודדים ולא מאושרים")}
                      className="text-[10px] bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 text-indigo-300 px-2.5 py-1 rounded-full transition-all cursor-pointer font-medium"
                    >
                      🔥 חיים את החלום ועדיין לא נהנים
                    </button>
                    <button
                      onClick={() => setTheme("התמודדות עם התפרצות זעם והסתגרות של מתבגר בלי להיגרר למאבקי כוח")}
                      className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                    >
                      התפרצויות זעם ומאבקי כוח
                    </button>
                    <button
                      onClick={() => setTheme("ויסות רגשי משותף (Co-regulation) במקום ענישה ומאבקי כוח סוערים בבית")}
                      className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                    >
                      ויסות רגשי משותף (Co-regulation)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* 2. Series Type Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">2. היקף הסדרה / פריסה</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setSeriesType('short_series')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          seriesType === 'short_series'
                            ? 'border-indigo-500 bg-indigo-950/40 text-white font-medium shadow-inner'
                            : 'border-slate-850 bg-slate-950/40 hover:border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-semibold">סדרת מיקרו</span>
                        <span className="text-[9px] text-slate-500 mt-0.5">3 סרטוני פתיחה</span>
                      </button>
                      <button
                        onClick={() => setSeriesType('monthly_series')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          seriesType === 'monthly_series'
                            ? 'border-indigo-500 bg-indigo-950/40 text-white font-medium shadow-inner'
                            : 'border-slate-850 bg-slate-950/40 hover:border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-semibold">סדרה חודשית</span>
                        <span className="text-[9px] text-slate-500 mt-0.5">10 סרטוני רצף</span>
                      </button>
                      <button
                        onClick={() => setSeriesType('full_calendar')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                          seriesType === 'full_calendar'
                            ? 'border-indigo-500 bg-indigo-950/40 text-white font-medium shadow-inner'
                            : 'border-slate-850 bg-slate-950/40 hover:border-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="text-xs font-semibold">לוח מורחב</span>
                        <span className="text-[9px] text-slate-500 mt-0.5">12 סרטונים אסטרטגיים</span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Narrative Continuity Option */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">3. מנגנון רצף ומתח (Curiosity Continuity)</label>
                    <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-850 rounded-xl">
                      <input
                        type="checkbox"
                        id="zeigarnik-toggle"
                        checked={useZeigarnik}
                        onChange={(e) => setUseZeigarnik(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/40 border-slate-800 bg-slate-900 cursor-pointer"
                      />
                      <label htmlFor="zeigarnik-toggle" className="text-xs font-semibold text-slate-300 cursor-pointer flex-1">
                        הפעל לולאות פתוחות (אפקט גרייניק וגרין)
                        <span className="text-[10px] text-slate-500 block font-normal mt-0.5">כל סרטון ייסגר בקליף-האנגר שמחייב צפייה בסרטון הבא</span>
                      </label>
                    </div>
                  </div>

                </div>

                {/* Target Platforms Multi-select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">4. פלטפורמות להפצה</label>
                  <div className="flex flex-wrap gap-2">
                    {['tiktok', 'reels', 'shorts', 'youtube_long'].map((p) => {
                      const isSelected = selectedPlatforms.includes(p);
                      const platName = {
                        tiktok: 'טיקטוק',
                        reels: 'רילס אינסטגרם',
                        shorts: 'יוטיוב שורטס',
                        youtube_long: 'יוטיוב ארוך'
                      }[p];
                      return (
                        <button
                          key={p}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPlatforms(prev => prev.filter(x => x !== p));
                            } else {
                              setSelectedPlatforms(prev => [...prev, p]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-500/40 bg-indigo-950/40 text-white'
                              : 'border-slate-850 bg-slate-950/40 text-slate-400 hover:border-slate-800 hover:text-slate-300'
                          }`}
                        >
                          {platName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  onClick={handleGenerateCampaign}
                  disabled={generating || !theme}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      מנתח מנגנונים ומחשב אסטרטגיית רצף חודשית...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      בנה תוכנית קמפיין מנצחת לחודש הקרוב
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Campaign Calendar Result Output */}
        {campaign && (
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in" id="campaign-output-box">
            
            {/* Campaign Header */}
            <div className="border-b border-slate-800/80 pb-4 space-y-2 text-right">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                קמפיין אסטרטגי מוכן
              </span>
              <h3 className="text-xl font-extrabold text-white">{campaign.themeTitle}</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">{campaign.description}</p>
            </div>

            {/* Videos Sequential List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                רשימת הסרטונים המחוברים ברצף צפייה
              </h4>

              <div className="space-y-4">
                {campaign.videos.map((vid, idx) => {
                  const hasScript = !!generatedScripts[idx];
                  const isExpanded = selectedVideoIdx === idx;
                  
                  return (
                    <div 
                      key={idx}
                      className="bg-slate-950/60 border border-slate-850 rounded-xl overflow-hidden transition-all hover:border-slate-800"
                    >
                      {/* Video Bar Card Header */}
                      <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="space-y-1 text-right flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold bg-indigo-950 border border-indigo-900 text-indigo-300 px-2 py-0.5 rounded-md">
                              {vid.day}
                            </span>
                            <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/5 px-2 py-0.5 rounded-md">
                              {vid.mechanism}
                            </span>
                          </div>
                          <h5 className="font-bold text-white text-sm mt-1">{vid.title}</h5>
                        </div>

                        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between shrink-0">
                          <button
                            onClick={() => handleGenerateScriptForVideo(vid, idx)}
                            disabled={scriptGenerating === idx}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-indigo-600/10"
                          >
                            {scriptGenerating === idx ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                כותב...
                              </>
                            ) : hasScript ? (
                              'שכתב תסריט'
                            ) : (
                              'כתוב תסריט לסרטון זה'
                            )}
                          </button>

                          {hasScript && (
                            <button
                              onClick={() => setSelectedVideoIdx(isExpanded ? null : idx)}
                              className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Video Specifications Panel */}
                      <div className="px-4 pb-4 border-t border-slate-900/60 pt-3 bg-slate-950/30 grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                        <div className="md:col-span-4 space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold block">ההוק של ה-3 שניות הראשונות:</span>
                          <p className="text-slate-200 font-semibold italic">"{vid.hook}"</p>
                        </div>
                        
                        <div className="md:col-span-4 space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold block">הגשת סרטון ואווירה (Green Effect):</span>
                          <p className="text-slate-300 leading-relaxed">{vid.greenEffectVibe}</p>
                        </div>

                        <div className="md:col-span-4 space-y-1 border-r border-slate-900/80 pr-3">
                          <span className="text-[10px] text-indigo-400 font-bold block flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            לולאה פתוחה לפרק הבא (Zeigarnik Loop):
                          </span>
                          <p className="text-indigo-200 leading-relaxed font-medium">{vid.openLoop}</p>
                        </div>

                        <div className="col-span-12 pt-2 border-t border-slate-900/50">
                          <span className="text-[10px] text-slate-500 font-bold block">מהלך הסרטון בקצרה:</span>
                          <p className="text-slate-400 leading-relaxed mt-0.5">{vid.description}</p>
                        </div>
                      </div>

                      {/* Display Generated Script Block */}
                      {hasScript && isExpanded && (
                        <div className="bg-slate-950 border-t border-slate-850 p-4 space-y-3">
                          <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                            <span className="text-[10px] text-indigo-400 font-semibold">
                              תסריט מלא מוכן לשידור (מותאם אישית)
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => copyScriptText(generatedScripts[idx], idx)}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded transition-colors font-semibold cursor-pointer"
                              >
                                {copiedVideoIdx === idx ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    הועתק!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    העתק
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-900/20 border border-slate-900 rounded-lg p-4 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto text-right font-mono">
                            {generatedScripts[idx]}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {sequenceError && (
          <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{sequenceError}</span>
          </div>
        )}

        {/* Connected Script Sequence Output */}
        {plannerSubTab === 'sequence' && scriptSequence && (
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in" id="sequence-output-box">
            
            {/* Sequence Header */}
            <div className="border-b border-slate-800/80 pb-4 space-y-2 text-right">
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                סדרת תסריטים מחוברים מוכנה (אפקט גרייניק)
              </span>
              <h3 className="text-xl font-extrabold text-white">{scriptSequence.sequenceTitle}</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                רצף של {scriptSequence.scripts.length} סרטונים שמחוברים זה לזה באמצעות לולאות פתוחות (Cliffhangers) ומתח נרטיבי רציף.
              </p>
            </div>

            {/* Sequence Scripts list */}
            <div className="space-y-6">
              {scriptSequence.scripts.map((script, idx) => {
                const isCopied = copiedSeqIdx === idx;
                return (
                  <div 
                    key={idx}
                    className="bg-slate-950/60 border border-slate-850 rounded-2xl overflow-hidden transition-all hover:border-slate-800"
                  >
                    {/* Header */}
                    <div className="p-4 bg-slate-950/80 border-b border-slate-900 flex justify-between items-center gap-3">
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                          {script.episode || `סרטון ${idx + 1}`}
                        </span>
                        <h4 className="font-bold text-white text-sm mt-1">{script.title}</h4>
                      </div>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(script.scriptText);
                          setCopiedSeqIdx(idx);
                          setTimeout(() => setCopiedSeqIdx(null), 2000);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-all font-semibold cursor-pointer shrink-0"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            הועתק!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            העתק תסריט
                          </>
                        )}
                      </button>
                    </div>

                    {/* Meta info (Hook, Vibe) */}
                    <div className="p-4 bg-slate-950/20 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border-b border-slate-900/40">
                      <div className="space-y-1 text-right">
                        <span className="text-[10px] text-slate-500 font-bold block">הוק פותח של 3 שניות:</span>
                        <p className="text-slate-200 font-semibold italic">"{script.hook}"</p>
                      </div>
                      <div className="space-y-1 text-right">
                        <span className="text-[10px] text-slate-500 font-bold block">הגשה ואווירה (Green Effect):</span>
                        <p className="text-slate-300">{script.vibe}</p>
                      </div>
                    </div>

                    {/* Script Text */}
                    <div className="p-4 space-y-4">
                      <div className="bg-slate-900/40 border border-slate-950 rounded-xl p-4 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto text-right font-mono">
                        {script.scriptText}
                      </div>

                      {/* Cliffhanger display */}
                      <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-xl text-right space-y-1">
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5" />
                          קליפהאנגר לסרטון הבא ברצף (Zeigarnik Loop):
                        </span>
                        <p className="text-amber-200 font-semibold italic leading-relaxed text-xs">
                          "{script.cliffhanger}"
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Professional Language Accuracy Analyzer Panel */}
        {(campaign || scriptSequence) && (
          <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-6 shadow-2xl space-y-6 mt-6 relative overflow-hidden text-right" id="accuracy-analyzer-panel">
            <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4 text-right">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white flex items-center justify-start gap-2">
                  <span className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                    <Compass className="w-4 h-4" />
                  </span>
                  מדד דיוק ועקביות לשפה המקצועית
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  הערכת התאמת התסריטים לטרמינולוגיה הטיפולית של בית ספר "לב המצפן" ולמאמרים שנטענו.
                </p>
              </div>

              <button
                onClick={handleAnalyzeScriptsAccuracy}
                disabled={analyzing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    מנתח דיוק שפה...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    נתח דיוק ועקביות פסיכולוגית
                  </>
                )}
              </button>
            </div>

            {analysisError && (
              <div className="bg-red-500/5 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center gap-2 text-right justify-start">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Display Analysis Results */}
            {analysisResult ? (
              <div className="space-y-6 animate-fade-in text-right">
                {/* Scores grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold block">ציון דיוק לשפה המקצועית</span>
                    <div className="flex items-baseline gap-2 justify-start">
                      <span className="text-4xl font-extrabold text-emerald-400">{analysisResult.overallScore}%</span>
                      <span className="text-xs text-slate-400">התאמה מלאה למאגר</span>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-full transition-all duration-1000"
                        style={{ width: `${analysisResult.overallScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 font-bold block">עקביות הטון הטיפולי (Green Effect)</span>
                    <div className="flex items-baseline gap-2 justify-start">
                      <span className="text-4xl font-extrabold text-indigo-400">{analysisResult.vibeConsistencyScore}%</span>
                      <span className="text-xs text-slate-400">אינטימי, עמוק, לא רעשני</span>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-400 h-full transition-all duration-1000"
                        style={{ width: `${analysisResult.vibeConsistencyScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Terminology tags */}
                {analysisResult.matchedTerminology && analysisResult.matchedTerminology.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold block">מינוחים מקצועיים שזוהו בהצלחה:</span>
                    <div className="flex flex-wrap gap-1.5 justify-start">
                      {analysisResult.matchedTerminology.map((term, i) => (
                        <span 
                          key={i}
                          className="bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                        >
                          ✓ {term}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 justify-start">
                      <span>✓</span> נקודות חוזק בעקביות המקצועית:
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside pr-1">
                      {analysisResult.strengths?.map((str, idx) => (
                        <li key={idx} className="leading-relaxed">{str}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 justify-start">
                      <span>⚠</span> הצעות לשיפור הדיוק המקצועי:
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside pr-1">
                      {analysisResult.improvements?.map((imp, idx) => (
                        <li key={idx} className="leading-relaxed">{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Individual feedback list */}
                {analysisResult.individualFeedback && analysisResult.individualFeedback.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-slate-300 block">ניתוח פרטני לכל סרטון ברצף:</span>
                    <div className="grid grid-cols-1 gap-2.5">
                      {analysisResult.individualFeedback.map((fb, idx) => (
                        <div 
                          key={idx}
                          className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-start justify-between gap-4 text-right"
                        >
                          <div className="space-y-1 flex-1">
                            <h5 className="font-bold text-white text-xs">{fb.title}</h5>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{fb.feedback}</p>
                          </div>
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                            fb.score >= 90 ? 'bg-emerald-500/10 text-emerald-400' :
                            fb.score >= 80 ? 'bg-indigo-500/10 text-indigo-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {fb.score}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-dashed border-slate-800 p-8 rounded-xl text-center text-slate-500 text-xs">
                {analyzing ? 'מנתח את התסריטים...' : 'לחץ על "נתח דיוק ועקביות פסיכולוגית" כדי להתחיל בסריקת התכנים מול מאמרי המקור.'}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
