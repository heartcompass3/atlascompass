import React, { useState, useEffect } from 'react';
import DriveConnect from './components/DriveConnect';
import AtlasPage from './components/AtlasPage';
import ContentMatrix from './components/ContentMatrix';
import CampaignPlanner from './components/CampaignPlanner';
import { DriveFile } from './types';
import { initAuth } from './firebase';
import { loadActiveKbState, saveActiveKbState } from './driveCache';
import { Compass, Sparkles, Database, BookOpen, Layers, HelpCircle, Activity, ExternalLink, Calendar } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'atlas' | 'matrix' | 'planner'>('atlas');
  
  // Google Auth & Drive States (shared across panels)
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [knowledgeBaseText, setKnowledgeBaseText] = useState<string>('');

  // Load cached active knowledge base state on initial mount
  useEffect(() => {
    const cachedKb = loadActiveKbState();
    if (cachedKb && cachedKb.file && cachedKb.text) {
      setSelectedFile(cachedKb.file);
      setKnowledgeBaseText(cachedKb.text);
    }
  }, []);

  // Sync active KB state to persistent cache when updated
  useEffect(() => {
    saveActiveKbState(selectedFile, knowledgeBaseText);
  }, [selectedFile, knowledgeBaseText]);

  // Slogans cycle state
  const [activeSloganIdx, setActiveSloganIdx] = useState(0);
  const slogans = [
    "ההתנהגות היא לא הבעיה. היא הרמז.",
    "מאחורי כל תגובה יש מנגנון.",
    "אנשים מנסים לשנות התנהגות, כשמה שבאמת צריך להשתנות הוא הסיפור שהמוח מספר."
  ];

  useEffect(() => {
    // Slogan rotating interval
    const interval = setInterval(() => {
      setActiveSloganIdx((prev) => (prev + 1) % slogans.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initial Auth Listener setup
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        // Not logged in or token expired
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans" dir="rtl">
      
      {/* Editorial Navigation Header */}
      <header className="bg-slate-900/50 border-b border-slate-850 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 text-right">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-600/30">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">מפת מנגנוני הנפש</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">מערכת הפעלה פסיכולוגית ומנוע יצירת תוכן מבוסס מנגנונים</p>
            </div>
          </div>

          {/* Slogan Ticker (The Big Idea) */}
          <div className="hidden md:flex items-center gap-2 bg-indigo-950/40 border border-indigo-900/50 py-1.5 px-4 rounded-full max-w-lg overflow-hidden transition-all duration-500">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 animate-pulse" />
            <span className="text-xs text-indigo-200 font-medium transition-all duration-500 font-mono animate-fade-in">
              {slogans[activeSloganIdx]}
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('atlas')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'atlas'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              אטלס המנגנונים
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              מטריצת התוכן
            </button>
            <button
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'planner'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              תוכנית חודשית
            </button>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Slogan Banner for Mobile */}
        <div className="md:hidden bg-indigo-950 border border-indigo-900/50 text-indigo-100 p-4 rounded-2xl text-center shadow-md space-y-1">
          <p className="text-[10px] text-indigo-400 font-bold tracking-wider uppercase">הרעיון הגדול (The Big Idea)</p>
          <p className="text-sm font-medium leading-relaxed">"{slogans[activeSloganIdx]}"</p>
        </div>

        {/* Google Drive Integration Panel */}
        <DriveConnect
          user={user}
          setUser={setUser}
          token={token}
          setToken={setToken}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          setKnowledgeBaseText={setKnowledgeBaseText}
        />

        {/* Tab Content rendering */}
        <div className="transition-all duration-300">
          {activeTab === 'atlas' ? (
            <AtlasPage knowledgeBaseText={knowledgeBaseText} />
          ) : activeTab === 'matrix' ? (
            <ContentMatrix knowledgeBaseText={knowledgeBaseText} selectedFile={selectedFile} />
          ) : (
            <CampaignPlanner knowledgeBaseText={knowledgeBaseText} selectedFile={selectedFile} />
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 mt-12 py-8 text-center text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-right">
            <p className="font-semibold text-slate-400">מפת מנגנוני הנפש © 2026</p>
            <p className="text-[10px] text-slate-500 mt-1">מערכת ההפעלה הקלינית ומחולל התוכן האולטימטיבי המבוסס על מאגר ידע מתוך Google Drive</p>
          </div>
          <div className="flex gap-4">
            <a href="https://ai.studio/build" target="_blank" rel="noreferrer" className="hover:text-indigo-400 flex items-center gap-1 transition-colors">
              Google AI Studio Build
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
