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

  const { concept, model = "gemini-2.5-flash" } = req.body || {};

  if (!concept) {
    return res.status(400).json({ error: "Concept is required" });
  }

  // Fallback curated biological mythbuster if GEMINI_API_KEY is not configured or fails
  const fallbackResult = {
    myth: `האמונה המוטעית לגבי '${concept}': אנשים חושבים בטעות שמדובר בפגם אופי, זלזול, או ניסיון להרגיז.`,
    reality: `התרחשות המוח והמציאות הביולוגית: האמיגדלה ומערכת העצבים מזהות איום קיומי ומפעילות תגובת הישרדות אוטומטית (Fight/Flight/Freeze) כדי למנוע הצפה רגשית.`,
    directionalParadox: `הפרדוקס הכיווני: הפעולה האוטומטית שנעשתה כדי להשיג קרבה או ביטחון השיגה בדיוק את התוצאה ההפוכה – הרחקה ומתח (רצית להגיע לבאר שבע, נסעת לחיפה).`,
    outdatedOsAnalogy: `אנלוגיית מערכת ההפעלה המיושנת: זוהי תוכנת DOS / Windows 98 שנבנתה בעבר כדי להגן עלייך. אין פה אשמה – יש פה צורך בשדרוג מערכת ההפעלה הרגשית.`,
    researchAnchor: `עוגן מחקרי וסמכות: מחקרי ד"ר דן סיגל על היפוך המוח (Flipping the lid) ומודל הסמכות החדשה של פרופ' חיים עומר (ויסות רגשי משותף Co-regulation).`,
    cleanUrgencyQuestion: `שאלה פותחת תודעה: איך היחסים בבית היו נראים אם היית מפסיק להגיב למנגנון ההישרדותי ומתחיל לדבר עם הצורך האמיתי שמסתתר מתחתיו?`
  };

  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "DUMMY_KEY_FOR_INIT") {
      return res.status(200).json(fallbackResult);
    }

    const prompt = `
אתה מומחה נוירו-פסיכולוגיה ומנהל קליני ב"לב המצפן".
קח את המושג/התגובה הרגשית הבאה: "${concept}"
והפק ניתוח מנפץ מיתוסים ("מיתוס מול מציאות ביולוגית") בצורה חדה, אנליטית, פותחת עיניים ומעוגנת מחקרית.

החזר פלט JSON במבנה הבא בלבד:
{
  "myth": "המיתוס / האמונה המוטעית הרווחת (מה אנשים חושבים בטעות)",
  "reality": "התרחשות המוח והמציאות הביולוגית (מה באמת קורה באמיגדלה ובמערכת העצבים)",
  "directionalParadox": "הפרדוקס הכיווני: הפעולה האוטומטית שהביאה בדיוק לתוצאה ההפוכה ממה שרצו",
  "outdatedOsAnalogy": "אנלוגיית מערכת ההפעלה המיושנת (DOS/Win98) לניקוי אשמה",
  "researchAnchor": "עוגן מחקרי וסמכות (דן סיגל, חיים עומר, אלפרד אדלר)",
  "cleanUrgencyQuestion": "שאלה פותחת תודעה השומרת על דחיפות נקייה לשינוי"
}
`;

    const ai = await getGeminiClient();
    const selectedModel = model === "gemini-2.5-pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      }
    });

    const parsed = parseGeminiJson(response.text || "{}");
    if (parsed && parsed.myth) {
      return res.status(200).json(parsed);
    }
    return res.status(200).json(fallbackResult);
  } catch (error: any) {
    console.error("MythBuster API Error:", error);
    return res.status(200).json(fallbackResult);
  }
}
