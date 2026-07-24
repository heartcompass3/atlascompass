import React, { useState, useEffect } from 'react';
import { Mechanism } from '../types';
import { PREPOPULATED_MECHANISMS } from '../data';
import { BookOpen, Sparkles, Plus, Search, ChevronDown, ChevronUp, User, Users, Briefcase, Heart, HelpCircle, Compass, ShieldAlert, Coins, RefreshCw, Zap } from 'lucide-react';
import MythBuster from './MythBuster';

interface AtlasPageProps {
  knowledgeBaseText: string;
}

export default function AtlasPage({ knowledgeBaseText }: AtlasPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<'mechanisms' | 'mythbuster'>('mechanisms');
  const [mythbusterConcept, setMythbusterConcept] = useState<string>('');
  const [mechanisms, setMechanisms] = useState<Mechanism[]>([]);
  const [selectedMechanism, setSelectedMechanism] = useState<Mechanism | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Mechanism Creation
  const [newMechanismName, setNewMechanismName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Load mechanisms from localStorage or prepopulate
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
      localStorage.setItem('mind_atlas_mechanisms', JSON.stringify(PREPOPULATED_MECHANISMS));
    }
  }, []);

  const saveMechanisms = (updated: Mechanism[]) => {
    setMechanisms(updated);
    localStorage.setItem('mind_atlas_mechanisms', JSON.stringify(updated));
  };

  const handleAnalyseNewMechanism = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMechanismName.trim()) return;

    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const response = await fetch('/api/gemini/analyse-mechanism', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mechanismName: newMechanismName,
          knowledgeBaseText: knowledgeBaseText
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
        throw new Error(data.error || 'נכשלה יצירת הניתוח המעמיק');
      }

      const analysisText = data.analysis;

      // Let's create a newly analyzed Mechanism object
      // We will parse the text dynamically to extract section points if possible, or save it as custom fields
      const newMechanism: Mechanism = {
        id: `mech_${Date.now()}`,
        name: newMechanismName,
        quote: "הגדרה עצמית שנוצרה על ידי בינה מלאכותית",
        shortDescription: `ניתוח מעמיק למנגנון '${newMechanismName}' המבוסס על אטלס הנפש.`,
        creation: extractSection(analysisText, ["1", "איך הוא נוצר"]),
        selfTalk: extractSelfTalk(analysisText),
        childExpression: extractSection(analysisText, ["3", "איך הוא נראה אצל ילד"]),
        teenExpression: extractSection(analysisText, ["4", "איך הוא נראה אצל מתבגר"]),
        parentTeenExpression: extractSection(analysisText, ["5", "איך הוא נראה ביחסי הורה-מתבגר", "הורה-מתבגר", "הורים"]),
        schoolExpression: extractSection(analysisText, ["6", "איך הוא נראה בלימודים ובחברת השווים", "לימודים", "בית הספר", "בית ספר"]),
        emotionsUsed: extractBulletPoints(analysisText, ["7", "באילו רגשות הוא משתמש"]),
        fearsFedBy: extractBulletPoints(analysisText, ["8", "מאילו פחדים הוא ניזון"]),
        price: extractSection(analysisText, ["9", "מה המחיר"]),
        wrongSolutions: extractSection(analysisText, ["10", "מה האדם בדרך כלל מנסה"]),
        changePrinciple: extractSection(analysisText, ["11", "מהו העיקרון"])
      };

      // Fallback quote / description if not parsed properly
      if (newMechanism.selfTalk && newMechanism.selfTalk.length > 0) {
        newMechanism.quote = `"${newMechanism.selfTalk[0]}"`;
      }
      
      const updatedList = [newMechanism, ...mechanisms];
      saveMechanisms(updatedList);
      setSelectedMechanism(newMechanism);
      setNewMechanismName('');
    } catch (err: any) {
      console.error(err);
      setAnalyzeError(err.message || 'אירעה שגיאה בחיבור לשרת לצורך ניתוח המנגנון.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Helper functions to parse Gemini's beautiful formatted Hebrew text
  const extractSection = (text: string, keys: string[]): string => {
    const lines = text.split('\n');
    let found = false;
    let content: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isHeader = keys.some(key => line.includes(key) && (line.startsWith('###') || line.startsWith('##') || line.startsWith('**') || /^\d+\./.test(line)));
      
      if (isHeader) {
        if (found) break; // Finished reading current section
        found = true;
        continue;
      }

      if (found) {
        // If we hit another numbered header, stop
        if (/^\d+\.\s+\*\*/.test(line) || /^\d+\./.test(line) || line.startsWith('##')) {
          break;
        }
        if (line) {
          content.push(line);
        }
      }
    }

    return content.join('\n') || 'המידע מנותח בפירוט הטקסט המלא.';
  };

  const extractSelfTalk = (text: string): string[] => {
    const section = extractSection(text, ["2", "באילו משפטים הוא מדבר"]);
    const bullets = section.split('\n').map(l => l.replace(/^[-*•\d.]\s*/, '').trim()).filter(Boolean);
    return bullets.length > 0 ? bullets : ["אין משפטים מוגדרים"];
  };

  const extractBulletPoints = (text: string, keys: string[]): string[] => {
    const section = extractSection(text, keys);
    const bullets = section.split('\n').map(l => l.replace(/^[-*•\d.]\s*/, '').trim()).filter(Boolean);
    return bullets.length > 0 ? bullets : ["לא צוינו"];
  };

  const filteredMechanisms = mechanisms.filter(mech => 
    mech.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    mech.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteMechanism = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('האם אתה בטוח שברצונך למחוק מנגנון זה מתוך האטלס?')) {
      const updated = mechanisms.filter(m => m.id !== id);
      saveMechanisms(updated);
      if (selectedMechanism?.id === id) {
        setSelectedMechanism(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SubTab Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('mechanisms')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'mechanisms'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          ספריית מנגנוני הנפש
        </button>

        <button
          onClick={() => setActiveSubTab('mythbuster')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            activeSubTab === 'mythbuster'
              ? 'bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-600/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          MythBuster • מנפץ המיתוסים
        </button>
      </div>

      {activeSubTab === 'mythbuster' ? (
        <MythBuster knowledgeBaseText={knowledgeBaseText} initialConcept={mythbusterConcept} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-right">
      
      {/* Sidebar - List of Mechanisms & Search */}
      <div className="lg:col-span-5 space-y-4 order-last lg:order-first">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              ספריית מנגנוני הנפש ({filteredMechanisms.length})
            </h3>
          </div>

          <div className="relative mb-4">
            <input
              type="text"
              placeholder="חפש מנגנון באטלס..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-800 bg-slate-950 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 text-sm"
            />
            <Search className="absolute right-3 top-2.5 w-4.5 h-4.5 text-slate-500" />
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredMechanisms.length > 0 ? (
              filteredMechanisms.map((mech) => {
                const isSelected = selectedMechanism?.id === mech.id;
                return (
                  <div
                    key={mech.id}
                    onClick={() => setSelectedMechanism(mech)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-start gap-2 ${
                      isSelected
                        ? 'border-indigo-500/50 bg-indigo-950/40 shadow-lg text-white'
                        : 'border-slate-850 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0 text-right">
                      <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                        {mech.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {mech.shortDescription}
                      </p>
                      {mech.quote && (
                        <p className="text-[11px] text-indigo-300/80 italic mt-1.5 font-mono">
                          {mech.quote}
                        </p>
                      )}
                    </div>
                    {mech.id.startsWith('mech_') && (
                      <button
                        onClick={(e) => handleDeleteMechanism(mech.id, e)}
                        className="text-slate-500 hover:text-red-400 p-1 text-xs transition-colors cursor-pointer"
                        title="מחק מנגנון"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                לא נמצאו מנגנונים העונים לחיפוש הנוכחי.
              </div>
            )}
          </div>
        </div>

        {/* Dynamic AI Addition Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-white relative overflow-hidden">
          <h3 className="font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            מפתוח מנגנון חדש באמצעות AI
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            הזן שם של דפוס רגשי או מנגנון הישרדותי שהגדרת (לדוגמה: "פחד מהצלחה", "צורך להיות צודק").
            בינת העל תנתח עבורך את המנגנון לרוחבו בדיוק על פי מפת הדרכים הקלינית (11 סעיפים קבועים) ותוסיף אותו לאטלס שלך.
          </p>

          <form onSubmit={handleAnalyseNewMechanism} className="mt-4 space-y-3">
            <div>
              <input
                type="text"
                placeholder="לדוגמה: תסמונת המתחזה, קנאה קיצונית..."
                value={newMechanismName}
                onChange={(e) => setNewMechanismName(e.target.value)}
                disabled={analyzing}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            
            {analyzeError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                {analyzeError}
              </p>
            )}

            <button
              type="submit"
              disabled={analyzing || !newMechanismName.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50 cursor-pointer"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  בונה אטלס מנגנון (כ-30 שניות)...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  נתח ומפה מנגנון עכשיו
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Main Details View */}
      <div className="lg:col-span-7">
        {selectedMechanism ? (
          <div id="mechanism-dossier" className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
            
            {/* Header */}
            <div className="border-b border-slate-800 pb-5">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
                    אטלס מנגנוני הנפש • תיק מנגנון קבוע
                  </span>
                  <h2 className="text-2xl font-bold text-white mt-2 flex items-center gap-2">
                    {selectedMechanism.name}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setMythbusterConcept(`${selectedMechanism.name}: ${selectedMechanism.shortDescription || selectedMechanism.quote || ''}`);
                    setActiveSubTab('mythbuster');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  נפץ מיתוס מנגנון זה
                </button>
              </div>
              {selectedMechanism.quote && (
                <div className="bg-slate-950/60 border-r-4 border-indigo-500 p-3 rounded-l-xl mt-3">
                  <p className="text-sm font-mono italic text-slate-300 leading-relaxed">
                    {selectedMechanism.quote}
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-400 mt-3 leading-relaxed">
                {selectedMechanism.shortDescription}
              </p>
            </div>

            {/* Grid of dossier points */}
            <div className="space-y-5">
              
              {/* 1. Origin & Creation */}
              {selectedMechanism.creation && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-slate-300 text-sm flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    1. איך הוא נוצר (ההקשר ההתפתחותי/היסטורי)
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed pl-2">
                    {selectedMechanism.creation}
                  </p>
                </div>
              )}

              {/* 2. Self Talk */}
              {selectedMechanism.selfTalk && selectedMechanism.selfTalk.length > 0 && (
                <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                  <h4 className="font-semibold text-slate-300 text-sm flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-400" />
                    2. באילו משפטים הוא מדבר (הדיאלוג הפנימי)
                  </h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {selectedMechanism.selfTalk.map((talk, idx) => (
                      <li key={idx} className="text-xs text-indigo-200 font-mono italic flex items-start gap-1">
                        <span className="text-indigo-400 font-bold shrink-0 ml-1">•</span>
                        <span>"{talk}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3 & 4. Child and Teen Expression */}
              {(selectedMechanism.childExpression || selectedMechanism.teenExpression) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedMechanism.childExpression && (
                    <div className="space-y-1.5 border border-slate-850 bg-slate-950/20 p-3 rounded-xl">
                      <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        3. איך הוא נראה אצל ילד
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {selectedMechanism.childExpression}
                      </p>
                    </div>
                  )}
                  {selectedMechanism.teenExpression && (
                    <div className="space-y-1.5 border border-slate-850 bg-slate-950/20 p-3 rounded-xl">
                      <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        4. איך הוא נראה אצל מתבגר
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {selectedMechanism.teenExpression}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 5 & 6. Parent-Teen and School Expression */}
              {(selectedMechanism.parentTeenExpression || selectedMechanism.schoolExpression) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedMechanism.parentTeenExpression && (
                    <div className="space-y-1.5 border border-slate-850 bg-slate-950/20 p-3 rounded-xl">
                      <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        5. איך הוא נראה ביחסי הורה-מתבגר
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {selectedMechanism.parentTeenExpression}
                      </p>
                    </div>
                  )}
                  {selectedMechanism.schoolExpression && (
                    <div className="space-y-1.5 border border-slate-850 bg-slate-950/20 p-3 rounded-xl">
                      <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                        6. איך הוא נראה בלימודים ובחברת השווים
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {selectedMechanism.schoolExpression}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 7 & 8. Emotions and Fears */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedMechanism.emotionsUsed && selectedMechanism.emotionsUsed.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      7. באילו רגשות הוא משתמש
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedMechanism.emotionsUsed.map((emotion, idx) => (
                        <span key={idx} className="text-[10px] bg-amber-500/5 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-md font-medium">
                          {emotion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedMechanism.fearsFedBy && selectedMechanism.fearsFedBy.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                      8. מאילו פחדים הוא ניזון
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedMechanism.fearsFedBy.map((fear, idx) => (
                        <span key={idx} className="text-[10px] bg-red-500/5 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-md font-medium">
                          {fear}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 9. Cost / Price */}
              {selectedMechanism.price && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-slate-300 text-sm flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-indigo-400" />
                    9. מה המחיר שלו
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed pl-2">
                    {selectedMechanism.price}
                  </p>
                </div>
              )}

              {/* 10. Wrong Solutions */}
              {selectedMechanism.wrongSolutions && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-slate-300 text-sm flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-indigo-400" />
                    10. הפתרונות המהירים שלא עובדים
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed pl-2">
                    {selectedMechanism.wrongSolutions}
                  </p>
                </div>
              )}

              {/* 11. Change Principle */}
              {selectedMechanism.changePrinciple && (
                <div className="space-y-1.5 bg-gradient-to-br from-indigo-950 to-indigo-900 text-white p-5 rounded-xl shadow-2xl border border-indigo-900/50">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
                    11. עיקרון השינוי (נקודת המפנה והשינוי הסיפורי)
                  </h4>
                  <p className="text-xs text-indigo-250 leading-relaxed">
                    {selectedMechanism.changePrinciple}
                  </p>
                </div>
              )}

            </div>

          </div>
        ) : (
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 shadow-2xl text-center flex flex-col items-center justify-center min-h-[500px]">
            <Compass className="w-16 h-16 text-indigo-500/30 animate-pulse mb-4" />
            <h3 className="text-xl font-bold text-white">ברוך הבא לאטלס מנגנוני הנפש</h3>
            <p className="text-sm text-slate-450 max-w-md mt-2 leading-relaxed">
              האטלס הוא מערכת ההפעלה של הקליניקה ומאגר הידע שלך.
              בחר מנגנון מתוך הרשימה מימין כדי לצפות בתיק הניתוח השלם שלו (11 סעיפי שורש), או צור מנגנון חדש באמצעות מנוע ה-AI למטה.
            </p>
          </div>
        )}
      </div>

    </div>
  )}
</div>
  );
}
