export interface Mechanism {
  id: string;
  name: string;
  quote: string; // E.g., "אני חייב שכולם יהיו מרוצים"
  shortDescription: string;
  // Deep Analysis points:
  creation?: string;           // 1. איך הוא נוצר
  selfTalk?: string[];          // 2. באילו משפטים הוא מדבר
  childExpression?: string;     // 3. איך הוא נראה אצל ילד
  teenExpression?: string;      // 4. איך הוא נראה אצל מתבגר
  parentTeenExpression?: string; // 5. איך הוא נראה ביחסי הורה-מתבגר
  schoolExpression?: string;     // 6. איך הוא נראה בלימודים ובחברת השווים
  emotionsUsed?: string[];      // 7. באילו רגשות הוא משתמש
  fearsFedBy?: string[];        // 8. מאילו פחדים הוא ניזון
  price?: string;               // 9. מה המחיר שלו
  wrongSolutions?: string;      // 10. הפתרונות שלא עובדים
  changePrinciple?: string;     // 11. העיקרון שמאפשר להתחיל לשנות
}

export interface ContentPillar {
  id: string;
  name: string;
  description: string;
  exampleHook: string;
}

export interface ContentTemplate {
  id: string;
  title: string;
  structure: string; // E.g., "כולם חושבים ש... אבל האמת היא..."
}

export type Platform = 'tiktok' | 'reels' | 'shorts' | 'youtube_long';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

export interface ScrapedArticle {
  title: string;
  url: string;
  summary: string;
  terminology?: string[];
  insight?: string;
}

export interface CampaignVideo {
  day: string;
  title: string;
  mechanism: string;
  hook: string;
  description: string;
  greenEffectVibe: string;
  openLoop: string;
}

export interface Campaign {
  themeTitle: string;
  description: string;
  videos: CampaignVideo[];
}

export interface ZeigarnikScript {
  episode: string;
  title: string;
  hook: string;
  vibe: string;
  scriptText: string;
  cliffhanger: string;
}

export interface ScriptSequence {
  sequenceTitle: string;
  scripts: ZeigarnikScript[];
}

export interface IndividualFeedback {
  title: string;
  score: number;
  feedback: string;
}

export interface ScriptAnalysisResult {
  overallScore: number;
  vibeConsistencyScore: number;
  matchedTerminology: string[];
  strengths: string[];
  improvements: string[];
  individualFeedback: IndividualFeedback[];
}

export interface MythBusterResult {
  concept: string;
  myth: string;
  reality: string;
  friendExplanation: string;
  tryNextTime: string;
  scientificAnchor: string;
  takeaway: string;
}

export interface ArticleSeriesEpisode {
  episodeNumber: number;
  title: string;
  hook: string;
  coreConcept: string;
  scriptOutline: string;
  takeaway: string;
}

export interface ArticleShortGuide {
  guideTitle: string;
  targetAudience: string;
  coreInsights: string[];
  practicalChecklist: string[];
  summaryCallToAction: string;
}

export interface ArticleSeriesResponse {
  topic: string;
  sourceSummary: string;
  seriesTitle?: string;
  seriesDescription?: string;
  episodes?: ArticleSeriesEpisode[];
  shortGuide?: ArticleShortGuide;
}

