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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { mechanismName, knowledgeBaseText, model = "gemini-3.5-flash" } = req.body;

    if (!mechanismName) {
      return res.status(400).json({ error: "Mechanism name is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "לא הוגדר GEMINI_API_KEY ב-Vercel Environment Variables." 
      });
    }

    const prompt = `
אתה מנהל קליני וחוקר התנהגות בבית הספר "לב המצפן".
תפקידך לבצע אנליזת עומק מקיפה בת 11 סעיפים עבור המנגנון הנפשי: "${mechanismName}".

11 סעיפי הניתוח הנדרשים:
1. המיתוס מול המציאות הפיזיולוגית/התנהגותית (פרדוקס כיווני: רצית קרבה, נסעת למאבקי כוח).
2. מערכת ההפעלה המיושנת (אנלוגיית Win98/DOS – תגובת הישרדות ישנה ללא אשמה).
3. איך הוא נראה אצל ילד (ביטויים התנהגותיים בילדות).
4. איך הוא נראה אצל מתבגר (ביטויים בגיל ההתבגרות).
5. איך הוא נראה ביחסי הורה-מתבגר (מאבקי כוח, ויסות רגשי משותף Co-regulation).
6. איך הוא נראה בלימודים ובחברת השווים (לחץ חברתי, חרדת בחינות).
7. באילו רגשות הוא משתמש (כעס, אשמה, בושה).
8. באילו פחדים הוא ניזון (חרדת נטישה, חרדת דחייה).
9. מה הרווח המשני שלו (הגנה ושליטה מדומה).
10. מה המחיר הכבד שלו (מה הוא הורס בקשר).
11. עוגן מחקרי וצעד ראשון לשדרוג (חיים עומר, דן סיגל, אלפרד אדלר, ושיחת ייעוץ בלב המצפן).

החזר פלט JSON במבנה:
{
  "analysis": "הניתוח המפורט והמעמיק מעוצב ב-Markdown קריא ומסודר לפי 11 הסעיפים"
}
`;

    const ai = await getGeminiClient();
    const selectedModel = model === "gemini-3.1-pro" ? "gemini-3.1-pro" : "gemini-3.5-flash";

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return res.status(200).json({ analysis: response.text });
  } catch (error: any) {
    console.error("Mechanism API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze mechanism" });
  }
}
