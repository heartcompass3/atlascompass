import type { VercelRequest, VercelResponse } from '@vercel/node';

let geminiClientInstance: any = null;
async function getGeminiClient() {
  if (!geminiClientInstance) {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY || "DUMMY_KEY_FOR_INIT";
    geminiClientInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });
  }
  return geminiClientInstance;
}

function parseGeminiJson(text: string): any {
  if (!text) return {};
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { theme, seriesType, useZeigarnik, platforms, knowledgeBaseText, targetDemography, model = "gemini-2.5-flash" } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "לא הוגדר GEMINI_API_KEY ב-Vercel Environment Variables." 
      });
    }

    const numVideos = seriesType === "short_series" ? 3 : seriesType === "monthly_series" ? 10 : 12;
    const formatDescription = useZeigarnik 
      ? "אפקט גרייניק (Zeigarnik Effect) - שימוש בלולאות פתוחות (Open Loops) וקליפהאנגרים (Cliffhangers) מעוררי סקרנות שגורמים לצופה לצפות בכל הסרטונים ברצף. כל סרטון מעלה שאלה שנפתרת רק בסרטון הבא."
      : "רצף הגיוני ונרטיבי קבוע שבו נושא אחד מוביל למשנהו בצורה חלקה.";

    const prompt = `
אתה אסטרטג תוכן ומנהל קליני בבית הספר "לב המצפן".
בנה תוכנית קמפיין מבוססת סדרת סרטונים מחוברים (${numVideos} סרטונים) בנושא: "${theme}".
פלטפורמה: ${platforms ? platforms.join(", ") : "טיקטוק, רילס"}
אסטרטגיה: ${formatDescription}

דוקטרינת התוכן של לב המצפן:
- אפס סטוריטלינג אישי / ללא סיפורים קליניים.
- הפרדוקס הכיווני (רצית קרבה, נסעת למאבקי כוח).
- אנלוגיית מערכת ההפעלה המיושנת (Win98 / DOS).
- עוגנים מחקריים ברורים (ד"ר דן סיגל, פרופ' חיים עומר, אלפרד אדלר).
- דחיפות נקייה ולולאות פתוחות המניעות ל"שמירות ושיתופים" (Saves & Shares).

החזר פלט JSON במבנה הבא בלבד:
{
  "themeTitle": "כותרת מנצחת לקמפיין",
  "description": "תיאור אסטרטגי קצר",
  "videos": [
    {
      "day": "סרטון 1",
      "title": "כותרת הסרטון",
      "mechanism": "המנגנון הנפשי",
      "hook": "הוק 3 השניות הראשונות",
      "greenEffectVibe": "הנחיית אווירה וטון",
      "openLoop": "לולאה פתוחה / קליפהאנגר לסרטון הבא"
    }
  ]
}
`;

    const ai = await getGeminiClient();
    const selectedModel = model === "gemini-2.5-pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    const parsed = parseGeminiJson(response.text || "{}");
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error("Campaign API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate campaign" });
  }
}
