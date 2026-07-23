import React, { useState } from 'react';
import { googleSignIn, searchDriveFiles, getDriveFileContent, logout } from '../firebase';
import { fetchDriveFileContentCached, getCachedFileContent, clearDriveCache } from '../driveCache';
import { DriveFile } from '../types';
import { 
  FileText, 
  FolderOpen, 
  Search, 
  LogOut, 
  CheckCircle, 
  Database, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  BookOpen, 
  Award, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Lightbulb, 
  Check, 
  ShieldAlert,
  Layers,
  HelpCircle,
  Zap
} from 'lucide-react';
import { AUTHORITIES_LIST, AUTHORITIES_RESEARCH_TXT, Authority } from '../authorities_research';

interface DriveConnectProps {
  user: any;
  setUser: (user: any) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  selectedFile: DriveFile | null;
  setSelectedFile: (file: DriveFile | null) => void;
  setKnowledgeBaseText: (text: string) => void;
}

export default function DriveConnect({
  user,
  setUser,
  token,
  setToken,
  selectedFile,
  setSelectedFile,
  setKnowledgeBaseText
}: DriveConnectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [fileContentPreview, setFileContentPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [wasLoadedFromCache, setWasLoadedFromCache] = useState(false);
  
  // Custom states for research integration
  const [kbSource, setKbSource] = useState<'research' | 'drive'>('research');
  const [expandedAuthority, setExpandedAuthority] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        // Automatically fetch files on login
        await loadFiles(result.accessToken);
        setKbSource('drive'); // Switch to drive tab on successful login
      }
    } catch (err: any) {
      console.error('Google Sign-In Error details:', err);
      const code = err?.code || '';
      const hostname = window.location.hostname;

      if (code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized domain')) {
        setError(
          `התחברות נכשלה: הדומיין (${hostname}) אינו מורשה בפרויקט ה-Firebase המוגדר.\n\n` +
          `פתרון מומלץ עבור Vercel / GitHub / דומיין פרטי:\n` +
          `מכיוון שפרויקט ברירת המחדל מנוהל על ידי המערכת, מומלץ ליצור פרויקט Firebase בחינם בבעלותך:\n` +
          `1. היכנס ל-https://console.firebase.google.com וצור פרויקט חדש.\n` +
          `2. תחת Authentication > Sign-in method, הפעל את התחברות Google.\n` +
          `3. תחת Authentication > Settings > Authorized domains, הוסף את הדומיין: ${hostname}\n` +
          `4. העתק את מפתח ה-API והפרטים מהגדרות הפרויקט והגדר ב-Vercel את המשתנים:\n` +
          `   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID`
        );
      } else if (code === 'auth/popup-blocked') {
        setError('חלון ההתחברות נחסם על ידי הדפדפן (Popup Blocker). אנא אפשר חלונות קופצים בדפדפן ונסה שוב.');
      } else if (code === 'auth/popup-closed-by-user') {
        setError('חלון ההתחברות נסגר לפני השלמת התהליך. נסה להתחבר שוב.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('התחברות באמצעות Google אינה מופעלת ב-Firebase Console. יש להפעיל את ספק Google בלשונית Authentication > Sign-in method.');
      } else {
        setError(err?.message || 'התחברות נכשלה. אנא ודא שאישרת את הגישה ל-Google Drive.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setFiles([]);
      if (selectedFile?.id !== 'preloaded_research') {
        setSelectedFile(null);
        setKnowledgeBaseText('');
      }
      setFileContentPreview(null);
      setShowPreview(false);
      setWasLoadedFromCache(false);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFiles = async (accessToken: string, query: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const driveFiles = await searchDriveFiles(accessToken, query);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error(err);
      setError('שגיאה בטעינת קבצים מ-Drive. ייתכן שהרשאת הגישה פגה.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      loadFiles(token, searchQuery);
    }
  };

  const handleSelectFile = async (file: DriveFile, forceRefresh = false) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { content, isFromCache } = await fetchDriveFileContentCached(token, file, forceRefresh);
      setSelectedFile(file);
      setKnowledgeBaseText(content);
      setFileContentPreview(content);
      setWasLoadedFromCache(isFromCache);
      setShowPreview(false);
    } catch (err: any) {
      console.error(err);
      setError(`שגיאה בטעינת תוכן הקובץ: ${err.message || 'שגיאה לא ידועה'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadResearch = () => {
    if (selectedFile?.id === 'preloaded_research') {
      setSelectedFile(null);
      setKnowledgeBaseText('');
    } else {
      setSelectedFile({
        id: 'preloaded_research',
        name: 'מחקר אסטרטגי: אוטוריטות טיפוליות (לב המצפן)',
        mimeType: 'text/plain'
      });
      setKnowledgeBaseText(AUTHORITIES_RESEARCH_TXT);
    }
  };

  const isResearchActive = selectedFile?.id === 'preloaded_research';

  return (
    <div id="drive-connector" className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl mb-6 transition-all relative overflow-hidden">
      
      {/* Decorative gradient blur in background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4 mb-5 relative z-10">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            מנוע ניהול ידע ובסיס מחקר טיפולי
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            הזן את מחולל התוכן במאמרים אישיים, סיכומי קליניקה או במחקר האסטרטגי המובנה של "לב המצפן".
          </p>
        </div>

        {/* User Identity Indicator (Only if logged into Google Drive) */}
        {user ? (
          <div className="flex items-center gap-3 bg-slate-950/80 p-2 rounded-xl border border-slate-800 shrink-0">
            {user.photoURL && (
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-indigo-500/30" referrerPolicy="no-referrer" />
            )}
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-200">{user.displayName}</p>
              <p className="text-[10px] text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-slate-500 rounded-lg transition-colors cursor-pointer"
              title="התנתק"
              id="btn-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Global Connection Alert Badge */}
      {selectedFile && (
        <div className={`mb-5 p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10 transition-all ${
          isResearchActive 
            ? 'bg-indigo-500/5 border-indigo-500/30 text-indigo-300' 
            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${isResearchActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <CheckCircle className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-85">בסיס הידע הפעיל כעת במערכת:</p>
              <p className="text-xs font-semibold text-slate-100 mt-0.5">{selectedFile.name}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedFile(null);
              setKnowledgeBaseText('');
              setFileContentPreview(null);
              setShowPreview(false);
            }}
            className="text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer font-bold shrink-0"
          >
            נתק מאגר ידע
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 mb-5 relative z-10 w-full sm:w-auto inline-flex">
        <button
          onClick={() => setKbSource('research')}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex-1 sm:flex-initial ${
            kbSource === 'research'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          מחקר אסטרטגי מובנה
        </button>
        <button
          onClick={() => setKbSource('drive')}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex-1 sm:flex-initial ${
            kbSource === 'drive'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          סנכרון Google Drive
        </button>
      </div>

      {/* Tab 1: Structured Strategic Research */}
      {kbSource === 'research' && (
        <div className="space-y-5 relative z-10">
          
          {/* Action Header Card */}
          <div className="bg-slate-950/60 border border-slate-850/80 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-right flex-1 space-y-1.5">
              <span className="inline-flex items-center gap-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                מחקר קליני ואסטרטגי
              </span>
              <h3 className="text-md font-bold text-slate-100">
                שילוב אוטוריטות טיפוליות מובילות בתוכן שלך
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                מחקר זה מאגד את שיטותיהם של פרופ' חיים עומר, ד"ר דן סיגל, אדלר, ויניקוט ותקשורת מקרבת (NVC). טעינתו תנחה את ה-AI להשתמש בשפתם המקצועית, בעקרונות הטיפול ומשפטי ההשראה שלהם ליצירת תסריטים ממגנטים המביאים למעורבות (Engagement) מקסימלית.
              </p>
            </div>
            
            <button
              onClick={handleLoadResearch}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
                isResearchActive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-950/20'
              }`}
            >
              {isResearchActive ? (
                <>
                  <Check className="w-4 h-4" />
                  מחקר אסטרטגי פעיל כעת!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  טען מחקר אסטרטגי לבסיס הידע
                </>
              )}
            </button>
          </div>

          {/* Authorities Accordion Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 text-right pr-1">
              אנציקלופדיית אוטוריטות ועקרונות ליבה:
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              {AUTHORITIES_LIST.map((auth) => {
                const isExpanded = expandedAuthority === auth.id;
                return (
                  <div 
                    key={auth.id}
                    className={`border rounded-xl transition-all ${
                      isExpanded 
                        ? 'bg-slate-950/50 border-slate-750' 
                        : 'bg-slate-950/20 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    {/* Collapsible Header */}
                    <button
                      onClick={() => setExpandedAuthority(isExpanded ? null : auth.id)}
                      className="w-full flex items-center justify-between p-4 text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-100 block">{auth.name}</span>
                          <span className="text-[10px] text-slate-400">{auth.role}</span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-850 p-5 space-y-4 text-right text-xs leading-relaxed">
                        
                        {/* Principles */}
                        <div className="space-y-1.5">
                          <h5 className="font-bold text-indigo-300">عקרונות הליבה (Core Principles):</h5>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 pr-1">
                            {auth.corePrinciples.map((principle, index) => (
                              <li key={index} className="leading-relaxed">{principle}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Terminology */}
                        <div className="space-y-2">
                          <h5 className="font-bold text-emerald-400">שפה מקצועית מומלצת להטמעה בתוכן:</h5>
                          <div className="flex flex-wrap gap-2 justify-start">
                            {auth.recommendedTerminology.map((term, index) => (
                              <span 
                                key={index}
                                className="bg-slate-900 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-[10px] font-mono"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Engagement Strategies */}
                        <div className="space-y-2.5 pt-1.5 border-t border-slate-850/60">
                          <h5 className="font-bold text-amber-400 flex items-center gap-1 justify-start">
                            <Lightbulb className="w-3.5 h-3.5" />
                            אסטרטגיית משיכה והפצה (Saves & Shares):
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {auth.engagementStrategies.map((strat, index) => (
                              <div key={index} className="bg-slate-900/40 border border-slate-850 p-3 rounded-lg space-y-1">
                                <p className="font-bold text-slate-200">{strat.title}</p>
                                <p className="text-slate-400 text-[11px] leading-relaxed">{strat.description}</p>
                                <div className="bg-amber-500/5 border border-amber-500/10 p-2 rounded mt-2 text-amber-300 text-[10px] font-mono leading-relaxed">
                                  <strong>טיפ מעשי:</strong> {strat.actionableTip}
                                </div>
                              </div>
                            ))}
                          </div>
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

      {/* Tab 2: Personal Google Drive Connection */}
      {kbSource === 'drive' && (
        <div className="space-y-4 relative z-10">
          {error && (
            <div id="drive-error" className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-300 text-sm mb-4">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 whitespace-pre-line text-right leading-relaxed font-medium">
                {error}
                {error.includes(window.location.hostname) && (
                  <div className="mt-3 pt-3 border-t border-red-500/20 flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-2.5 rounded-lg text-xs font-mono">
                    <span className="text-amber-300 select-all font-bold">{window.location.hostname}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(window.location.hostname)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-sans cursor-pointer text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      העתק דומיין להגדרות
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {user && token ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <form onSubmit={handleSearch} className="relative flex-1">
                  <input
                    type="text"
                    placeholder="חפש קבצים, מסמכים או תיאורי מקרה בדרייב..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm text-right"
                  />
                  <Search className="absolute right-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
                </form>
                <button
                  onClick={() => loadFiles(token, searchQuery)}
                  disabled={loading}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-800 bg-slate-950 rounded-xl hover:bg-slate-900 text-slate-300 hover:text-white text-sm transition-colors font-medium cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  רענן
                </button>
              </div>

              {selectedFile && selectedFile.id !== 'preloaded_research' && (
                <div id="active-file-badge" className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-emerald-400 font-semibold">קובץ מסונכרן כמאגר ידע פעיל</p>
                        {(wasLoadedFromCache || getCachedFileContent(selectedFile.id)) && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            מטמון מהיר פעיל
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-200 flex items-center gap-1 mt-0.5">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        {selectedFile.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectFile(selectedFile, true)}
                      disabled={loading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/60 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="רענן וסנכרן מחדש מ מ-Google Drive"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      רענן מ-Drive
                    </button>
                    {fileContentPreview && (
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {showPreview ? 'הסתר תצוגה מקדימה' : 'הצג תצוגה מקדימה'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setKnowledgeBaseText('');
                        setFileContentPreview(null);
                        setShowPreview(false);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    >
                      נתק קובץ
                    </button>
                  </div>
                </div>
              )}

              {showPreview && fileContentPreview && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-48 overflow-y-auto text-right text-xs text-slate-400 leading-relaxed font-mono">
                  <p className="font-semibold text-slate-300 mb-2 border-b border-slate-800 pb-1">תוכן שנטען:</p>
                  {fileContentPreview.length > 800 ? `${fileContentPreview.substring(0, 800)}... (קוצר לצורך תצוגה)` : fileContentPreview}
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-sm gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>טוען מסמכים מתוך Google Drive...</span>
                </div>
              ) : files.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2 text-right">בחר מסמך לשילוב במחולל:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                    {files.map((file) => {
                      const isSelected = selectedFile?.id === file.id;
                      const isCached = !!getCachedFileContent(file.id);
                      return (
                        <button
                          key={file.id}
                          onClick={() => handleSelectFile(file)}
                          className={`flex items-center justify-between text-right p-3 rounded-xl border text-sm transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-semibold shadow-inner'
                              : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate ml-2">
                            <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span className="truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isCached && !isSelected && (
                              <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5 text-amber-400" />
                                במטמון
                              </span>
                            )}
                            {isSelected ? (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">מחובר</span>
                            ) : (
                              <span className="text-[10px] text-slate-500">לחץ לחיבור</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                  <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-400">לא נמצאו מסמכים מתאימים ב-Drive שלך</p>
                  <p className="text-xs text-slate-500 mt-1">רק קבצי Google Docs או קבצי טקסט נתמכים כרגע לקריאה ישירה.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900/30 p-5 rounded-2xl border border-slate-800">
              <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-400 shrink-0">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div className="text-right flex-1">
                <p className="text-sm font-semibold text-slate-200">הדרייב שלך אינו מחובר</p>
                <p className="text-xs text-slate-400 mt-1 mb-3">
                  כדי לאפשר סנכרון ישיר של מאמרים, דפי עמדה או תיאורי מקרה מקצועיים שכתבת - אנא התחבר לחשבון הגוגל שלך.
                </p>
                
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="gsi-material-button w-full sm:w-auto cursor-pointer flex justify-center items-center"
                  id="btn-google-signin"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper">
                    <div className="gsi-material-button-icon">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        <path fill="none" d="M0 0h48v48H0z"></path>
                      </svg>
                    </div>
                    <span className="gsi-material-button-contents font-sans">התחבר עם Google</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
