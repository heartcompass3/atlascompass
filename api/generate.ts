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
    return { script: text };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mechanism, pillar, template, platform, knowledgeBaseText, readyText, anchorResearch, includeSecondaryGain, targetDemography, model = "gemini-3.5-flash" } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "לא הוגדר GEMINI_API_KEY ב-Vercel Environment Variables. יש להיכנס ל-Project Settings ב-Vercel ולהגדיר את GEMINI_API_KEY." 
      });
    }

    let demographyInstructions = "";
    if (targetDemography === "teens") {
      demographyInstructions = `
מיקוד דמוגרפיית יעד: בני נוער ומתבגרים באופן ישיר (Ages 12-18).
- טון הדיבור: שיח בגובה העיניים, כנה, מבין, ללא התנשאות. דוגמאות מעולם המתבגרים (מסכים, גיימינג, חרדת דחייה חברתית, לחץ לימודי, הסתגרות כהגנה).
- שפה רגשית: תחושת 'כולם ככה חוץ ממני', הצורך שיבינו אותם באמת מבלי לשפוט.
`;
    } else if (targetDemography === "dialog") {
      demographyInstructions = `
מיקוד דמוגרפיית יעד: שיח רגשי ודיאלוג הורה-מתבגר (Co-regulation וגישור).
- טון הדיבור: חומל, מגשר, מעצים. מדריך לעבר ויסות רגשי משותף (Co-regulation) ושיחות אינטימיות בבית.
`;
    } else {
      demographyInstructions = `
מיקוד דמוגרפיית יעד: הורים למתבגרים (Ages 12-18).
- טון הדיבור: מבין, מחבק ותומך בהורה. דגש חזק על 'נוכחות הורית' (Parental Presence) וסמכות מבוססת ביטחון.
`;
    }

    const prompt = `
אתה חוקר התנהגות אנושית, מומחה נוירו-פסיכולוגיה ומנהל קליני בבית הספר "לב המצפן".
תפקידך לנסח תסריט עוצמתי לרשתות החברתיות (פלטפורמה: ${platform || 'רילס/טיקטוק'}) על פי **דוקטרינת התוכן של לב המצפן**.

הקונספט והמנגנון המבוקש:
- מנגנון/תגובה: "${mechanism || 'מנגנון הגנה הישרדותי'}"
- עמוד תווך: "${pillar || 'יחסים וויסות רגשי'}"
- תבנית: "${template || 'פרדוקס כיווני'}"

${demographyInstructions}

חוקי ברזל לבניית התסריט (חובה ליישם!):
1. **אפס סטוריטלינג אישי / ללא סיפורים קליניים**: ללא "אתמול בקליניקה", ללא "היי אני יוסי", ללא קלישאות מוטיבציה.
2. **הפרדוקס הכיווני (The Directional Paradox)**: תאר מיד את הפרדוקס – הצופה פועל אוטומטית בצורה שמשיגה בדיוק את התוצאה ההפוכה ממה שרצה (רצה קרבה ונסע למאבקי כוח, "רצית להגיע לבאר שבע אבל נסעת לחיפה").
3. **מערכת ההפעלה המיושנת (Win98 / DOS)**: נקה אשמה מוחלטת! הסבר שהתגובה האוטומטית אינה פגם אופי, אלא מערכת הפעלה ישנה שנבנתה בעבר כדי להגן עליו, והגיע הזמן לשדרג אותה.
4. **עוגן מחקרי וסמכות**: שלב במפורש עוגן מחקרי/נוירוביולוגי (כגון מחקרי מוח, אמיגדלה, קורטקס קדם-מצחי, תיאוריית הפולי-ווגאל, פרופ' חיים עומר, ד"ר דן סיגל או אלפרד אדלר).
5. **דחיפות נקייה ולולאה פתוחה**: אל תסגור את הסרטון בחיבוק מרגיע או בנחמה שמכבה את הדחיפות! סיים בשאלה פותחת תודעה ובהנעה נקייה לשיחת ייעוץ אישית ב"לב המצפן".

החזר את התוצאה ב-JSON במבנה:
{
  "script": "התסריט המלא והמוכן לקריאה בפרומפטר, כולל הוראות בימוי בסוגריים מרובעים [הפסקה, טון שקט וסודי]"
}
`;

    const ai = await getGeminiClient();
    const selectedModel = model === "gemini-3.1-pro" ? "gemini-3.1-pro" : "gemini-3.5-flash";

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.6,
      }
    });

    const parsed = parseGeminiJson(response.text || "{}");
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error("Generate API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate script" });
  }
}
