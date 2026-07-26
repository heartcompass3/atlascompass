import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Dynamic loader for Gemini SDK to prevent ERR_REQUIRE_ESM on Vercel Serverless Functions
let geminiClientInstance: any = null;
async function getGeminiClient() {
  if (!geminiClientInstance) {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY || "DUMMY_KEY_FOR_INIT";
    geminiClientInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClientInstance;
}

app.use(express.json({ limit: '10mb' }));

// Helper to parse Gemini JSON responses safely (removing markdown code fences if present)
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
    console.error("Failed to parse Gemini JSON output:", cleaned);
    throw new Error("פלט ה-AI לא התקבל בפורמט JSON תקין. נסה שוב.");
  }
}

// Helper to optimize and truncate knowledge base text to prevent API token bloat
function prepareKnowledgeBaseContext(text?: string, maxChars = 10000): string {
  if (!text || !text.trim()) return "";
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= maxChars) return cleaned;
  return cleaned.substring(0, maxChars) + "\n...[קוטע אוטומטית לצורך חסכון בטוקנים]";
}

// API: Generate Content script using Content Matrix
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { mechanism, pillar, template, platform, knowledgeBaseText, targetDemography, readyText, includeSecondaryGain, model = "gemini-3.5-flash" } = req.body;

    if (!readyText && (!mechanism || !pillar)) {
      return res.status(400).json({ error: "Mechanism and Pillar are required, or a raw readyText draft must be provided" });
    }

    const platformInstruction: Record<string, string> = {
      tiktok: "סרטון טיקטוק מהיר, חד ואנליטי (כ-25 שניות). פתח ישר בפרדוקס התנהגותי, ללא הקדמות, ללא סיפורים, ממוקד בפירוק המנגנון הקוגניטיבי.",
      reels: "סרטון רילס אנליטי ומעמיק (כ-60 שניות). פתח בפרדוקס התנהגותי, פרק את המנגנון הפיזיולוגי/פסיכולוגי בצורה חדה ומדעית, וסיים בשאלת תפיסה עמוקה.",
      shorts: "סרטון שורטס מרוכז ומדויק. פתח בתופעה קוגניטיבית מנוגדת לאינטואיציה, הסבר בקצרה את המנגנון המוחי, וסיים בתובנה אנליטית.",
      youtube_long: "סרטון יוטיוב אנליטי ומקיף. ניתוח התנהגותי מעמיק של המנגנון, פירוק הדינמיקה הקוגניטיבית, תצפית קלינית ושאלות התבוננות מעוררות מחשבה."
    };

    const platformPrompt = platformInstruction[platform as string] || platformInstruction.reels;

    let coreTaskText = "";
    if (readyText) {
      coreTaskText = `ערוך ושפר את התסריט הבא כך שיהיה אנליטי, חד, נקי ומוכן לקריאה בפרומפטר:\n"${readyText}"`;
    } else {
      coreTaskText = `
1. המנגנון הנפשי להתמקדות: "${mechanism}"
2. העמוד/עמוד הבית (Pillar): "${pillar}"
`;
    }

    let demographyInstructions = "";
    if (targetDemography === "teens") {
      demographyInstructions = `
מיקוד דמוגרפיית יעד: בני נוער ומתבגרים באופן ישיר (Ages 12-18).
- טון הדיבור: אנליטי, בגובה העיניים, מכבד, ללא התנשאות וללא דרמות. התמקדות בפסיכולוגיה של המתבגר (הצפה רגשית, מנגנוני הישרדות, לחץ חברתי, אוטונומיה מול הצפה).
- שפה: חדה ומדויקת, המנרמלת את התגובה הפיזיולוגית של המוח ומסירה אשמה.
`;
    } else if (targetDemography === "dialog") {
      demographyInstructions = `
מיקוד דמוגרפיית יעד: דינמיקת תקשורת ודיאלוג הורה-מתבגר.
- טון הדיבור: אנליטי, חוקר ומאבחן. ניתוח דינמיקת יחסי הכוחות והוויסות הפיזיולוגי בבית (Co-regulation).
- דוגמאות: תגובתיות אוטומטית במאבקי כוח, מנגנוני הגנה של הסתגרות/התפרצות, והפער בין הניסיון הלוגי לתוצאה בשטח.
`;
    } else {
      demographyInstructions = `
מיקוד דמוגרפיית יעד: הורים למתבגרים (Ages 12-18).
- טון הדיבור: סמכותי, שקט, אנליטי ומעמיק (בסגנון חוקר התנהגות / ד"ר לירז מרגלית ורן בראון).
- דגש: ניתוח תגובות הוריות אוטומטיות, מנגנוני הגנה של הילד, והפער בין הניסיון לפתור 'בשכל' לבין התגובה הפיזיולוגית בבית.
`;
    }

    let prompt = `
אתה חוקר התנהגות אנושית ומערכת העצבים הרגשית, מומחה לפסיכולוגיה התנהגותית, נוירו-ביולוגיה ודינמיקת יחסים (בסגנון הניתוח האנליטי של ד"ר לירז מרגלית, רן בראון ונוירו-ביולוגיה יישומית).

תפקידך ליצור תסריט חד, מתוחכם, אנליטי ומעורר סקרנות עמוקה העומד בעקרונות הליבה הבאים:
1. **אפס סטוריטלינג ואפס סיפורים אישיים**: אל תשתמש בסיפורים אישיים ("פעם פגשתי בקליניקה..."), אל תציג את עצמך ("היי נעים מאוד אני..."), ללא גימיקים וללא מילות שיווק/מוטיבציה נדושות.
2. **שבירת המיתוס והפרדוקס הכיווני (The Directional Paradox & Myth - הליבה המרכזית!)**:
   - המרכז של כל תסריט! הצג את הפרדוקס שבו האדם רוצה להגיע לתוצאה א' (קרבה, שקט, ביטחון, חיבור), אבל הפעולה האוטומטית שלו מסיעה אותו בדיוק לכיוון ההפוך (כמו לנסות לנסוע לבאר שבע על כביש המוביל לחיפה).
3. **מנגנון 'דחיפות נקייה' (Clean Urgency)**:
   - אל תיפול ב'מלכודת הנחמה'! אל תרגיע את הצופה בצורה שתגרום לו לסגור את הסרטון נינוח.
   - צור דחיפות נקייה מתוך הבנה שחלון ההזדמנויות (במיוחד בהורות ובגיל ההתבגרות) חולף, וכל יום שבו ממשיכים לנסוע בכיוון השגוי – המרחק הופך להרגל קבוע.
4. **אבחנת מערכת ההפעלה הישנה (The Outdated OS Illusion)**:
   - הראה שהתגובה האוטומטית מריצה תוכנה ישנה (כמו תוכנה מיושנת שרצה על ווינדוס 98) שנבנתה בעבר, והיא לא תביא אותו ליעד היום.
   - שחרור אשמה: זה לא שהאדם 'מקולקל' – פשוט המפה שלו הייתה לא נכונה, ואין שום בעיה לקבל מפה חדשה ולחשב מסלול מחדש.
5. **סיום בשאלת תפיסה וסקרנות (The Mindset Upgrade Question)**:
   - סיים בשאלה אנליטית חדה שמשאירה לולאה פתוחה וגירוד בבטן (ללא מילות מכירה וללא נחמה סגורה).

${coreTaskText}
${template ? `תבנית כתיבה מנחה: "${template}"` : ""}
פלטפורמה: ${platformPrompt}

${demographyInstructions}

הנחיות טכניות קריטיות:
- **טקסט נקי 100% לפרומפטר**: ללא סוגריים, ללא הוראות בימוי, ללא [מבט למצלמה] או חלוקה לסצנות. טקסט רציף, קולח ומוכן לקריאה!
- **שפה**: עברית תקנית, חדה, עמוקה ואלגנטית.
`;

    const preparedKB = prepareKnowledgeBaseContext(knowledgeBaseText);
    if (preparedKB) {
      prompt += `
\n\n--- מידע נוסף ממאגר הידע של היוצר (מתוך קובץ הדרייב שהועלה) ---\n
השתמש בעקרונות, בסגנון, או בפרטים המופיעים כאן כדי לדייק את הסרטון ולהפוך אותו לאותנטי ומבוסס על מאגר הידע האמיתי של היוצר:
${preparedKB}
\n---------------------------------------------------------------\n
`;
    }

    const selectedModel = model === "gemini-3.1-pro" ? "gemini-3.1-pro" : "gemini-3.5-flash";

    const ai = await getGeminiClient();


    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    res.json({ script: response.text });
  } catch (error: any) {
    console.error("Gemini Generate Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate content" });
  }
});

// API: Dynamically analyze a mechanism for the "Atlas"
app.post("/api/gemini/analyse-mechanism", async (req, res) => {
  try {
    const { mechanismName, knowledgeBaseText, model = "gemini-3.5-flash" } = req.body;

    if (!mechanismName) {
      return res.status(400).json({ error: "Mechanism name is required" });
    }

    let prompt = `
אתה פסיכולוג בכיר ומאמן מנטלי מומחה.
נתח בצורה מעמיקה ומפורטת את המנגנון הנפשי הבא: "${mechanismName}".

בנה עבור המנגנון הזה דף "אטלס מנגנוני הנפש" מקיף, מקצועי ומרתק שישמש כמערכת ההפעלה של הקליניקה ויצירת התוכן.
הטקסט חייב להיכתב בעברית מקצועית, נוגעת ללב, ועליו לכלול בדיוק את 11 הסעיפים הבאים (השתמש בכותרות ברורות עבור כל סעיף):

1. איך הוא נוצר (ההקשר ההתפתחותי/היסטורי בילדות או בעבר).
2. באילו משפטים הוא מדבר (הדיאלוג הפנימי או משפטים שהאדם אומר בקול רם - תן 4-5 דוגמאות מוחשיות).
3. איך הוא נראה אצל ילד (ביטויים התנהגותיים בילדות).
4. איך הוא נראה אצל מתבגר (ביטויים בגיל ההתבגרות).
5. איך הוא נראה ביחסי הורה-מתבגר (מאבקי כוח, ויסות רגשי משותף, דפוסי תקשורת, מנגנוני הגנה במערכת היחסים בבית).
6. איך הוא נראה בלימודים ובחברת השווים (התמודדות עם לחץ לימודי, חרדת בחינות, מורים, קבוצת השווים בבית הספר).
7. באילו רגשות הוא משתמש (הרגשות שהמנגנון מפעיל כדי לשרוד - כגון כעס, אשמה, בושה וכו').
8. באילו פחדים הוא ניזון (החרדות הבסיסיות שמניעות את המנגנון).
9. מה הרווח המשני שלו (הצורך ההישרדותי שהוא ממלא).
10. מה המחיר שלו (מה הוא הורס ומחריב בדרך).
11. מה הצעד הראשון לריפוי ולשחרור (איך מתחילים לעבוד איתו בקליניקה).
`;

    const preparedKB = prepareKnowledgeBaseContext(knowledgeBaseText);
    if (preparedKB) {
      prompt += `\n\nהשתמש במידע התומך הבא ממאגר הידע של היוצר להתאמת השפה והניתוח:\n${preparedKB}\n`;
    }

    const selectedModel = model === "gemini-3.1-pro" ? "gemini-3.1-pro" : "gemini-3.5-flash";

    const ai = await getGeminiClient();


    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Gemini Analyse Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze mechanism" });
  }
});

// API: Generate Campaign / Monthly Content Series
app.post("/api/gemini/generate-campaign", async (req, res) => {
  try {
    const { theme, seriesType, useZeigarnik, platforms, knowledgeBaseText, targetDemography, model = "gemini-3.5-flash" } = req.body;
    
    const numVideos = seriesType === "short_series" ? 3 : seriesType === "monthly_series" ? 10 : 12;
    const formatDescription = useZeigarnik 
      ? "אפקט גרייניק (Zeigarnik Effect) וגרין עם דיאנגלו - שימוש בלולאות פתוחות (Open Loops) וקליפהאנגרים (Cliffhangers) מעוררי סקרנות שגורמים לצופה לרצות לצפות בסרטון הבא ברצף. כל סרטון מעלה שאלה או פותח דילמה שנפתרת רק בסרטון הבא."
      : "רצף הגיוני ונרטיבי קבוע שבו נושא אחד מוביל למשנהו בצורה חלקה.";

    let demographyInstructions = "";
    if (targetDemography === "teens") {
      demographyInstructions = "מיקוד דמוגרפיית יעד: בני נוער ומתבגרים באופן ישיר (Ages 12-18).\n- טון הדיבור בסרטונים: שיח בגובה העיניים, כנה, לא מתנשא, שמבין את עולמם הפנימי והתרבותי. שימוש בדוגמאות מעולם המתבגרים (מסכים, גיימינג, חרדת דחייה חברתית בקבוצת השווים, לחץ לימודי, צורך באוטונומיה, הסתגרות כהגנה).\n- שפה רגשית: ממוקדת בתחושות של בדידות, לחץ של 'כולם ככה חוץ ממני', והצורך שיבינו אותם באמת מבלי לשפוט או להעניש.\n- התאמת הכותרות וההוקים: צריכים לפנות לבני נוער ולעסוק באתגרים החברתיים והרגשיים שלהם.";
    } else if (targetDemography === "dialog") {
      demographyInstructions = "מיקוד דמוגרפיית יעד: שיח רגשי ודיאלוג הורה-מתבגר (Co-regulation וגישור).\n- טון הדיבור בסרטונים: חומל, מגשר, מעצים ומעורר מחשבה, המדריך את ההורה ו/או הילד כיצד לעבור למצב של ויסות רגשי משותף (Co-regulation). שפה רגשית המתאימה לשיחות עומק אינטימיות ומשמעותיות בבית.\n- דוגמאות: רגעים משותפים ליד שולחן האוכל, פריצת מחסום ההסתגרות של חדר המתבגר בעזרת הקשבה אמפתית, יצירת מרחב בטוח ללא 'מלכוד ההסברים'.\n- התאמת הכותרות וההוקים: עוסקים בגשר התקשורתי, בפרשנויות ההדדיות המוטעות ובדרך לשיח מקרב.";
    } else {
      demographyInstructions = "מיקוד דמוגרפיית יעד: הורים למתבגרים (Ages 12-18).\n- טון הדיבור בסרטונים: מבין, מחבק ותומך בהורה, ומעניק לו כלים ליציבות ומניעת תסכול. דגש חזק על 'נוכחות הורית' (Parental Presence) וסמכות מבוססת ביטחון.\n- דוגמאות: התפרצויות זעם בבית, 'מלכוד ההסברים' המתיש שבו הורה מוצא עצמו מתווכח שעות, מאבקי כוח סביב חוקים ומסכים, וכיצד לשמור על שלווה פנימית של המבוגר.\n- התאמת הכותרות וההוקים: מיועדים לעורר 'שמירות' (Saves) ושיתופים אצל הורים המתמודדים עם האתגר בבית.";
    }

    let prompt = `
אנחנו בונים תוכנית תוכן אסטרטגית מקיפה עבור בית הספר "לב המצפן", בהובלת מטפלים מומחים בעבודה עם מתבגרים והדרכת הורים.
הנושא/הקונספט המרכזי של הקמפיין: "${theme}"
כמות סרטונים מתוכננת: ${numVideos} סרטונים לחודש הקרוב.
הפלטפורמות הממוקדות: ${platforms ? platforms.join(", ") : "טיקטוק, רילס"}
אסטרטגיית חיבור ורצף: ${formatDescription}

${demographyInstructions}

מיקוד קהל היעד והקול הטיפולי (חובה לכלול בכל סרטון):
1. קהל היעד הראשי: הורים למתבגרים, ובני נוער המתמודדים עם אתגרים רגשיים וחברתיים, מותאם לפי דמוגרפיית היעד שנבחרה לעיל.
2. מטרת העל של התוכן: ייצור מעורבות גבוהה במיוחד דרך תכנים שמייצרים "שמירות" (Saves) ו"שיתופים" (Shares). תכנים שההורה או המתבגר יראו ויגידו "זה בדיוק מה שקורה אצלנו", ירצו לראות שוב או לשתף, או ייקחו מהם תובנה פנימית עמוקה רגע לפני שיח.
3. אוטוריטות פסיכולוגיות להישען עליהן (שלב את השפה הזו בפירוק המנגנונים):
   - פרופ' חיים עומר (הסמכות החדשה והתנגדות לא אלימה): מושגים של 'נוכחות הורית' (Parental Presence), 'סמכות מבוססת ביטחון', 'שליטה עצמית של ההורה' (במקום הניסיון הכושל לשלוט במתבגר), והימנעות מ'מלכוד ההסברים' (ויכוחים והסברים אינסופיים שלא משיגים דבר).
   - ד"ר דן סיגל (המוח המתבגר): 'המוח הדו-קומתי' (ויסות של האמיגדלה לעומת הקורטקס הקדם-מצחי), 'היפוך המוח' (Flipping the lid), וצורך ב'ויסות רגשי משותף' (Co-regulation) לפני שיח הגיוני.
   - אלפרד אדלר (מכון אדלר): 'מאבקי כוח' כצורך נואש בשייכות ומשמעות, עידוד לעומת שבח, חרדת דחייה וריצוי חברתי (קבוצת השווים).
4. אסטרטגיית המרה וסמכות מדעית:
   - **עוגנים מחקריים**: כל סרטון או פוסט שמפריך מיתוס חייב לכלול עוגן מחקרי סמכותי ומשכנע (כמו "מחקרים מוכיחים ש...", "ממצאי המוח מגלים...", "מחקרים בפסיכולוגיה התפתחותית מראים...").
   - **רווח משני מול מחיר**: שלב בפירוט הסרטונים את התובנה לגבי 'הרווח המשני' של המנגנון (כמו השגת שליטה מדומה או הגנה) לעומת 'המחיר הכבד' שמשלמים עליו בקשר.
   - **הנעה לפעולה**: הדגש שהבנה לבדה אינה פותרת בעיה רגשית עמוקה, ועל כן הפתרון המעשי הוא תיאום 'שיחת ייעוץ' מקצועית עם צוות 'לב המצפן'.

אנא בנה תוכנית תוכן חודשית שלמה של ${numVideos} סרטונים המבוססים על נושא זה המותאמים בדיוק לדמוגרפיית היעד והאתגרים הספציפיים שלהם.
עליך להחזיר את התוכנית במבנה JSON תקין הכולל:
1. themeTitle: כותרת הקמפיין החודשי המדוייק לפי המיקוד הדמוגרפי שנבחר
2. description: תיאור אסטרטגי של הקמפיין (כיצד הוא גורם לשמירות, שיתופים, ומהן התובנות הפרקטיות בהתאם לדמוגרפיה)
3. videos: מערך של ${numVideos} סרטונים בסדר כרונולוגי. לכל סרטון:
   - day: מספר הסרטון (למשל: "סרטון 1", "סרטון 2" ...)
   - title: כותרת מעוררת הזדהות עמוקה ושיתופים (בהתאם למיקוד הדמוגרפי שנבחר)
   - mechanism: המנגנון הנפשי העומד בבסיס הסרטון (למשל: 'מלכוד ההסברים' או 'הרווח המשני של מאבקי הכוח מול המחיר הכבד')
   - hook: ההוק (Hook) הרגשי של 3 השניות הראשונות שמיועד לעורר שמירה אצל קהל היעד
   - description: פירוק מהיר של מה שיקרה בסרטון (התוכן המרכזי המבוסס על עוגן מחקרי כמו "מחקרים מוכיחים ש...", חשיפת הרווח המשני, והפניה לשיחת ייעוץ)
   - greenEffectVibe: האווירה, קצב ההגשה והמוזיקה (Green Effect & D'Angelo) - למשל "קצב שקט, דיבור אינטימי חודר לב, פסקול פסנתר מרחף"
   - openLoop: לולאת גרייניק לפתיחה לסרטון הבא (איך הסרטון הזה נגמר בשאלה מסקרנת או מתח שמקשר ישירות לסרטון הבא)
   
החזר את התשובה אך ורק בפורמט JSON תקין כדלקמן:
{
  "themeTitle": "כותרת קמפיין",
  "description": "תיאור האסטרטגיה...",
  "videos": [
    {
      "day": "סרטון 1",
      "title": "כותרת הסרטון",
      "mechanism": "נוכחות הורית מול מאבקי כוח",
      "hook": "מה המתבגר שלכם באמת שומע כשאתם מנסים 'להסביר' לו?",
      "description": "פירוק מנגנון מלכוד ההסברים של חיים עומר...",
      "greenEffectVibe": "טון דיבור קרוב ואינטימי, ללא שואו רעשני...",
      "openLoop": "בסוף הסרטון נשאל: 'אבל מה קורה כשהשקט שלהם הופך למסך שחור והם מסתגרים בחדר? על מנגנון ההסתגרות והאשמה נדבר בסרטון הבא.'"
    }
  ]
}
`;

    const preparedKB = prepareKnowledgeBaseContext(knowledgeBaseText);
    if (preparedKB) {
      prompt += "\n\n--- מידע נוסף ממאגר הידע של היוצר (מתוך קובץ הדרייב שהועלה) ---\n" +
                "השתמש בעקרונות, בסגנון, או בפרטים המופיעים כאן כדי לדייק את הסרטון ולהפוך אותו לאותנטי ומבוסס על מאגר הידע האמיתי של היוצר:\n" +
                preparedKB +
                "\n---------------------------------------------------------------\n";
    }

    const selectedModel = model === "gemini-3.1-pro" ? "gemini-3.1-pro" : "gemini-3.5-flash";

    const ai = await getGeminiClient();


    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    const jsonOutput = parseGeminiJson(response.text || "{}");
    res.json(jsonOutput);
  } catch (error: any) {
    console.error("Generate Campaign Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate campaign" });
  }
});

// API: Article scraping and text parsing endpoint
app.post("/api/articles/scrape", async (req, res) => {
  try {
    const { url = "https://www.heartcompass.co.il/articles" } = req.body;
    
    // Fetch HTML from target URL if provided
    let html = "";
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      if (response.ok) {
        html = await response.text();
      }
    } catch (e) {
      console.warn("Direct fetch failed for URL, using AI extraction fallback:", e);
    }

    if (html && process.env.GEMINI_API_KEY) {
      const prompt = `
אתה מנוע חילוץ תוכן פסיכולוגי מקצועי.
להלן קוד HTML שנשלף מתוך אתר המאמרים: "${url}".
תפקידך לחלץ מתוכו את המאמרים הטיפוליים/פסיכולוגיים הקיימים.

החזר פלט JSON במבנה המדויק הבא בלבד:
{
  "articles": [
    {
      "id": "מזהה_ייחודי",
      "title": "כותרת המאמר",
      "summary": "תקציר מקיף ומעמיק של התובנה הרגשית מהמאמר",
      "terminology": ["מנגנון שורש", "ויסות רגשי", "דפוס הישרדותי"],
      "insight": "ציטוט פותח תודעה מרכזי מתוך המאמר"
    }
  ]
}

--- קוד HTML ---
${html.slice(0, 15000)}
----------------
`;

      const ai = await getGeminiClient();


      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const parsed = parseGeminiJson(aiResponse.text || "{}");
      if (parsed.articles && Array.isArray(parsed.articles) && parsed.articles.length > 0) {
        return res.json(parsed);
      }
    }

    // Default curated HeartCompass articles fallback
    return res.json({
      articles: [
        {
          id: "behavior-hint",
          title: "ההתנהגות היא לא הבעיה - היא הרמז",
          summary: "הניתוח הפסיכולוגי העמוק של מנגנוני הגנה רגשיים. המאמר מסביר כיצד הניסיונות של אנשים לשנות ישירות הרגלים נכשלים שוב ושוב מכיוון שההתנהגות הגלויה היא רק רמז למנגנון ההישרדותי הסמוי שמתחתיה.",
          terminology: ["מנגנון שורש", "התנהגות כרמז", "שיח סיפור"],
          insight: "אנחנו נלחמים בסמפטום במקום להקשיב למה שהוא מנסה להגיד לנו על חוסר האונים שלנו."
        },
        {
          id: "pleasing-erasing",
          title: "מדוע אנחנו מרצים את כולם ומבטלים את עצמנו?",
          summary: "פירוק מנגנון הריצוי (Pleasing) כתוצר הישרדותי של פחד עמוק מדחייה או נטישה בילדות, ואיך להפוך הצפת חרדה למעשה של קרבה.",
          terminology: ["ריצוי הישרדותי", "אשמה זמנית", "הצבת גבולות כקרבה"],
          insight: "ריצוי איננו תכונת אופי נחמדה – הוא מנגנון הישרדותי לא מודע שנועד למנוע דחייה."
        }
      ]
    });
  } catch (error: any) {
    console.error("Scrape Error:", error);
    res.status(500).json({ error: error.message || "שגיאה בשליפת המאמרים מהאתר" });
  }
});

// API: Generate Connected Script Sequence (Zeigarnik Cliffhanger Series)
app.post("/api/gemini/generate-script-sequence", async (req, res) => {
  try {
    const { theme, count, platform, knowledgeBaseText, targetDemography, model = "gemini-3.5-flash" } = req.body;
    const numScripts = count || 3;
    const platformText = platform || "tiktok/reels";

    let demographyInstructions = "";
    if (targetDemography === "teens") {
      demographyInstructions = "מיקוד דמוגרפיית יעד: בני נוער ומתבגרים באופן ישיר (Ages 12-18).\n- טון הדיבור בתסריטים: שיח בגובה העיניים, כנה, לא מתנשא, שמבין את עולמם הפנימי והתרבותי. שימוש בדוגמאות מעולם המתבגרים (מסכים, גיימינג, חרדת דחייה חברתית בקבוצת השווים, לחץ לימודי, צורך באוטונומיה, הסתגרות כהגנה).\n- שפה רגשית: ממוקדת בתחושות של בדידות, לחץ של 'כולם ככה חוץ ממני', והצורך שיבינו אותם באמת מבלי לשפוט או להעניש.\n- התאמת התסריטים: כל התסריטים והכותרות פונים ישירות לבני הנוער (למשל: 'אם אתה מרגיש שכל מה שאתה עושה בבית זה לא מספיק...').";
    } else if (targetDemography === "dialog") {
      demographyInstructions = "מיקוד דמוגרפיית יעד: שיח רגשי ודיאלוג הורה-מתבגר (Co-regulation וגישור).\n- טון הדיבור בתסריטים: חומל, מגשר, מעצים ומעורר מחשבה, המדריך את ההורה ו/או הילד כיצד לעבור למצב של ויסות רגשי משותף (Co-regulation). שפה רגשית המתאימה לשיחות עומק אינטימיות ומשמעותיות בבית.\n- דוגמאות: רגעים משותפים ליד שולחן האוכל, פריצת מחסום ההסתגרות של חדר המתבגר בעזרת הקשבה אמפתית, יצירת מרחב בטוח ללא 'מלכוד ההסברים'.\n- התאמת התסריטים: עוסקים בגשר התקשורתי, בפרשנויות ההדדיות המוטעות ובדרך לשיח מקרב.";
    } else {
      demographyInstructions = "מיקוד דמוגרפיית יעד: הורים למתבגרים (Ages 12-18).\n- טון הדיבור בתסריטים: מבין, מחבק ותומך בהורה, ומעניק לו כלים ליציבות ומניעת תסכול. דגש חזק על 'נוכחות הורית' (Parental Presence) וסמכות מבוססת ביטחון.\n- דוגמאות: התפרצויות זעם בבית, 'מלכוד ההסברים' המתיש שבו הורה מוצא עצמו מתווכח שעות, מאבקי כוח סביב חוקים ומסכים, וכיצד לשמור על שלווה פנימית של המבוגר.\n- התאמת התסריטים: מיועדים לעורר 'שמירות' (Saves) ושיתופים אצל הורים המתמודדים עם האתגר בבית.";
    }

    let prompt = `
אתה אסטרטג תוכן ומטפל מוסמך מומחה המתמחה בהדרכת הורים למתבגרים ובטיפול רגשי בנוער עבור בית הספר "לב המצפן".
אנו צריכים ליצור סדרת תסריטים מחוברים (רצף של ${numScripts} סרטונים) לפרסום ברשתות החברתיות (הפלטפורמה: ${platformText}).
הנושא של הרצף: "${theme}"

${demographyInstructions}

קהל היעד והסגנון:
1. קהל יעד: הורים למתבגרים, המנסים למצוא דרך לתקשר עם הילד שלהם, ובני נוער החווים אתגרים רגשיים וחברתיים, מותאם לפי דמוגרפיית היעד שנבחרה לעיל.
2. אסטרטגיית מעורבות: יצירת תסריטים בעלי פוטנציאל "שמירות" (Saves) ו"שיתופים" (Shares) גבוה במיוחד. התוכן חייב להיות כזה שקהל היעד ישלח אחד לשני בלילה, או שייקחו ממנו תובנות עמוקות ורלוונטיות רגע לפני שהם נכנסים לדבר עם המתבגר בחדרו.
3. ביסוס על אוטוריטות פסיכולוגיות:
   - פרופ' חיים עומר (נוכחות הורית וסמכות מבוססת ביטחון): מושגים כמו 'השגחה חד-צדדית', 'נוכחות הורית' חזקה ושקטה, עצירת מאבקי כוח, הימנעות מ'מלכוד ההסברים' המתיש.
   - ד"ר דן סיגל (המוח המתבגר): 'היפוך המוח' (Flipping the lid), תיאור הפיזיולוגיה והנוירולוגיה של גיל ההתבגרות באופן נגיש ופוקח עיניים, והצורך ב'ויסות רגשי משותף' (Co-regulation) במקום ענישה או הטפת מוסר.
   - אלפרד אדלר: מאבקי כוח כחיפוש אחר תחושת שייכות, לחץ חברתי, ועידוד.
4. עוגנים מחקריים והורדת אשמה:
   - **רפרנסים מדעים במפורש**: כל תסריט חייב לשלב רפרנסים מחקריים ונוירוביולוגיים ברורים (למשל: מחקרים בפסיכולוגיה התפתחותית, התיאוריה הפולי-ווגאלית, הסתגלות הדונית, פרדוקס הבחירה, ויסות רגשי משותף).
   - **למה המוח משאיר אותנו תקועים**: הסבר נוירולוגי קצר שמראה מדוע המוח ההישרדותי ננעל על דפוסי הגנה, שליטה מדומה או הסתגרות דיגיטלית.
   - **אתם לא אשמים**: ניקוי אשמה מוחלט מההורה והמתבגר — הדגשה שזו לא פגם אישי אלא תגובה הישרדותית אוטומטית של המוח.
5. אסטרטגיית המרה, ולידציה וסיום:
   - כל תסריט (ובמיוחד התסריט המסכם) חייב להכיל את משפט הוולידציה המעצים: "אתם לא אשמים. המוח שלכם עבד בדיוק לפי מנגנון ההגנה וההישרדות שלו — פשוט עדיין לא למדתם שאפשר אחרת."
   - הנעה לפעולה רגישה: תיאום "שיחת ייעוץ" מקצועית בצוות "לב המצפן" להורדת העומס ויישום הדרך האחרת.

אסטרטגיית החיבור היא "אפקט גרייניק" (Zeigarnik Effect) וגרין עם דיאנגלו:
כל סרטון חייב להסתיים בקליפהאנגר (Cliffhanger) / לולאה פתוחה (Open Loop) - טיזר פנימי מותח ומרתק שמתייחס ישירות לפתרון או לנושא שיפורק רק בסרטון הבא. זה גורם לצופה לא לעצור ולצפות בכל הסרטונים ברצף.

השפה היא אינטימית, מדויקת פסיכולוגית (מנגנוני הגנה, חסמים רגשיים, שיוך ערך, הגנת מניעה, אשמה הישרדותית), חודרת לב ואינה רעשנית (Green Effect Vibe: טון קרוב, דיבור שקט, הפסקות קריטיות).

אנא כתוב סדרה של ${numScripts} תסריטים מלאים המותאמים בדיוק לדמוגרפיית היעד שנבחרה.
החזר את התוצאה אך ורק במבנה JSON תקין כדלקמן:
{
  "sequenceTitle": "שם הסדרה המקשרת",
  "scripts": [
    {
      "episode": "פרק 1 / סרטון 1",
      "title": "כותרת מנצחת",
      "hook": "הוק 3 השניות הראשונות",
      "vibe": "הנחיות הגשה ואווירה",
      "scriptText": "התסריט המלא והכתוב בעברית קולחת, כולל הוראות בימוי בסוגריים מרובעים [כמו הפסקה, מבט רציני] ודיבור ישיר ועמוק לצופה. בתסריט האחרון חובה להטמיע את ההפניה המניעה לפעולה לקביעת 'שיחת ייעוץ' מקצועית עם צוות 'לב המצפן' מאחר שהבנה בלבד לא פותרת את הבעיה.",
      "cliffhanger": "משפט הסיום המדויק המהווה לולאה פתוחה לסרטון הבא"
    }
  ]
}
`;

    const preparedKB = prepareKnowledgeBaseContext(knowledgeBaseText);
    if (preparedKB) {
      prompt += "\n\nהשתמש במידע תומך זה ממאגר הידע של היוצר להעשרת השפה והפרטים:\n" + preparedKB + "\n";
    }

    const selectedModel = model === "gemini-3.1-pro" ? "gemini-3.1-pro" : "gemini-3.5-flash";

    const ai = await getGeminiClient();


    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    const jsonOutput = parseGeminiJson(response.text || "{}");
    res.json(jsonOutput);
  } catch (error: any) {
    console.error("Generate Script Sequence Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate script sequence" });
  }
});

// API: Analyze Professional Language Accuracy and Consistency
app.post("/api/gemini/analyze-scripts-accuracy", async (req, res) => {
  try {
    const { scripts, knowledgeBaseText, model = "gemini-3.5-flash" } = req.body;

    const prompt = `
אתה מעריך תוכן ומטפל מוסמך מומחה המתמחה בהדרכת הורים למתבגרים וטיפול רגשי בנוער. תפקידך לבחון סדרה של תסריטים או תכנים שנוצרו עבור קמפיין, ולתת ציון "דיוק לשפה המקצועית" וניתוח מעמיק המבוסס על מאגר הידע של בית הספר "לב המצפן".

המדדים המרכזיים להערכה:
1. התאמה רגשית למתבגרים והורים: האם הנושא נוגע באתגרים האמיתיים של הורים למתבגרים (מלכוד ההסברים, מאבקי כוח, הסתגרות, מסכים, ריצוי חברתי, אשמה הישרדותית)?
2. פוטנציאל ויראליות, שמירות ושיתופים (Saves & Shares): האם התוכן מנוסח בצורה פוקחת עיניים, עמוקה ומעוררת הזדהות שתגרום להורה לשמור את הסרטון, לשתף אותו עם בן/בת הזוג בלילה או לחזור אליו לפני שיחה עם הילד?
3. שילוב אוטוריטות פסיכולוגיות:
   - פרופ' חיים עומר (נוכחות הורית מבוססת ביטחון, השגחה חד צדדית, הימנעות ממלכוד ההסברים).
   - ד"ר דן סיגל (המוח המתבגר, היפוך המוח - Flipping the lid, ויסות רגשי משותף - Co-regulation).
   - אלפרד אדלר (מאבקי כוח, צורך נואש בשייכות, עידוד).
4. הנעה לפעולה טיפולית (CTA): האם הסרטונים (במיוחד האחרון ברצף) מדגישים כי "הבנה בלבד אינה פותרת בעיה רגשית" ומכווינים נכון לתיאום "שיחת ייעוץ" אישית ומקצועית?
5. עקביות האווירה והטון (Green Effect Vibe): האם הטון רגוע, אינטימי, מעמיק, מבוסס אמפתיה אמיתית וללא צעקנות מוגזמת?

אנא נתח את התסריטים הבאים:
${JSON.stringify(scripts, null, 2)}

ביחס למאגר הידע הבא:
${prepareKnowledgeBaseContext(knowledgeBaseText) || "מאגר ידע כללי של קליניקה טיפולית בעולמות היחסים, מנגנוני הגנה, אשמה וריצוי."}

עליך להחזיר אובייקט JSON תקין ומדויק בלבד במבנה הבא (בעברית):
{
  "overallScore": 85, // ציון כללי מתוך 100
  "vibeConsistencyScore": 90, // ציון עקביות האווירה והטון (Green Effect) מתוך 100
  "matchedTerminology": ["מלכוד ההסברים", "ויסות רגשי משותף", "נוכחות הורית", "היפוך המוח"], // מינוחים פסיכולוגיים ואוטוריטות שזוהו בהצלחה
  "strengths": [
    "חוזקה 1 (לדוגמה: שימוש מעולה במושג 'נוכחות הורית' לפי חיים עומר שמייצר תובנה מעוררת שמירות)",
    "חוזקה 2..."
  ],
  "improvements": [
    "הצעה לשיפור 1 (לדוגמה: 'בפרק האחרון מומלץ לחדד את ההכוונה לשיחת ייעוץ מאחר שהבנה אינה פותרת את הבעיה הרגשית של המתבגר')",
    "הצעה לשיפור 2..."
  ],
  "individualFeedback": [
    {
      "title": "שם/פרק התסריט",
      "score": 88, // ציון דיוק לתסריט הספציפי
      "feedback": "הסבר קצר על רמת התאמתו להורים/מתבגרים ורמת הפוטנציאל לשמירה ושיתוף"
    }
  ]
}
`;

    const selectedModel = model === "gemini-3.1-pro" ? "gemini-3.1-pro" : "gemini-3.5-flash";

    const ai = await getGeminiClient();


    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2, // Low temperature for consistent and analytical evaluations
      }
    });

    const jsonOutput = parseGeminiJson(response.text || "{}");
    res.json(jsonOutput);
  } catch (error: any) {
    console.error("Analyze Scripts Accuracy Error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze script accuracy" });
  }
});

// API: MythBuster Engine (Myth vs. Biological/Psychological Reality)
app.post("/api/gemini/mythbuster", async (req, res) => {
  try {
    const { concept, knowledgeBaseText, model = "gemini-3.5-flash" } = req.body;

    if (!concept) {
      return res.status(400).json({ error: "Concept is required" });
    }

    let prompt = `
אתה מומחה לפסיכולוגיה התפתחותית, חקר המוח (נוירוביולוגיה) ויחסי הורים-מתבגרים מטעם בית הספר "לב המצפן".
תפקידך לקחת מושג, תגובה הורית/רגשית שכיחה, או תופעה של העידן המודרני (כמו "חיים את החלום ועדיין לא נהנים" - פסיכולוג בכיס, מתכנת בכיס, דייט וירטואלי - ולמה אנשים עדיין מבודדים ולא מאושרים), ולהפיק ניתוח מנפץ מיתוסים ("מיתוס מול מציאות") בצורה קלילה, עניינית, חברית ומעגנת מדעית.

המושג/התגובה שנבחרה: "${concept}"

הנחיות קריטיות לניתוח ולניפוץ המיתוס:
1. **המיתוס (myth)**: תאר את המיתוס או האמונה השגויה הרווחת שאנשים חושבים בטעות (למשל: "אם יש לי את כל הפתרונות בכיס ואני עצמאי לחלוטין, אני אמור להיות מאושר").
2. **האישוש המדעי/הביולוגי (reality)**: הסבר מה המדע, חקר המוח (Polyvagal Theory, Hedonic Adaptation, Paradox of Choice, Co-regulation, דופמין) באמת מראים. חובה לציין רפרנס מדעי/פסיכולוגי ספציפי וברור שמציג מדוע המוח משאיר אותנו תקועים (מנגנוני הישרדות אבולוציוניים המעדיפים שליטה וחיזוי על פני פגיעות וחיבור).
3. **למה אתם לא אשמים (הסרת אשמה ותסכול)**: הסבר רגיש שמבהיר למה האדם/ההורה לא אשם בכלל — המוח שלו פעל בדיוק לפי מערכת ההגנה וההישרדות הטבעית שנבנתה בו.
4. **הסבר חברי (friendExplanation)**: הסבר קליל וכנה כאילו אתה מסביר לחברה טובה בשיחת קפה בגובה העיניים.
5. **מה כדאי לנסות בפעם הבאה (tryNextTime)**: צעד קטן, פרקטי ונגיש לניסוי בפעם הבאה.
6. **עוגן מדעי/ביולוגי (scientificAnchor)**: שמות המנגנון הביולוגי/פסיכולוגי שעליו הניתוח נשען (למשל: "ויסות רגשי משותף (Co-regulation)", "הסתגלות הדונית (Hedonic Adaptation)", "פרדוקס הבחירה והאמיגדלה").
7. **הבנה אלגנטית ווילדיציה מסיימת (takeaway)**: סיכום אלגנטי החותם תמיד במסר הוולידציה המעצים:
"אתם לא אשמים. המוח שלכם עבד בדיוק לפי מנגנון ההגנה וההישרדות שלו — פשוט עדיין לא למדתם שאפשר אחרת." (וחיבור לתהליך הליווי המקצועי של לב המצפן).

החזר תשובה במבנה JSON תקין עם השדות הבאים בדיוק:
{
  "concept": "${concept}",
  "myth": "...",
  "reality": "...",
  "friendExplanation": "...",
  "tryNextTime": "...",
  "scientificAnchor": "...",
  "takeaway": "..."
}
`;

    const preparedKB = prepareKnowledgeBaseContext(knowledgeBaseText);
    if (preparedKB) {
      prompt += `
\n--- מידע מתוך מאגר הידע של "לב המצפן" ---\n
היעזר בעקרונות ובשפה מתוך מאגר הידע:
${preparedKB}
\n--------------------------------------------\n
`;
    }

    const selectedModel = model === "gemini-3.1-pro" ? "gemini-3.1-pro" : "gemini-3.5-flash";

    const ai = await getGeminiClient();


    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("MythBuster Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate MythBuster comparison" });
  }
});

// API: Article Intelligence & Series / Guide Generator
app.post("/api/gemini/article-series", async (req, res) => {
  try {
    const { topic, outputType = "both", knowledgeBaseText, model = "gemini-3.5-flash" } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    let prompt = `
אתה העורך הראשי והמנהל הקליני של בית הספר "לב המצפן".
תפקידך להשתמש במאמרים ובחומרי הידע של "לב המצפן" כמקור האמת הבלעדי (Single Source of Truth), לסרוק ולשלוף את כל התובנות הפסיכולוגיות והנוירוביולוגיות בנושא: "${topic}", ולפרק אותם לסדרת סרטונים מובנית ו/או למדריך קצר ופרקטי.

הנושא שנבחר לסריקת המאמרים: "${topic}"

דגשים מיוחדים בהתאם לנושא:
- אם הנושא קשור ל**המוח, מערכת העצבים ומערכת ההישרדות**: דגש חזק על פירוק מנגנון האמיגדלה, תגובת הישרדות (Fight/Flight/Freeze/Fawn), הירגעות פיזיולוגית ואיך המוח לומד ומעבד דפוסים.
- אם הנושא קשור ל**שחרור דפוסים**: דגש על איך דפוס נוצר בילדות/התבגרות, מהו הרווח המשני שלו (הגנה ושליטה), ואיך משחררים אותו ללא מאבק.
- if הנושא קשור ל**חרדות ופחדים**: פירוק סוגי החרדה (חרדת ביצוע, חרדה חברתית, חרדת נטישה), תגובת הגוף והסתרת הפחד.
- אם הנושא קשור ל**הורים ונוער**: דגש חזק על הוויסות הרגשי המשותף (Co-regulation), יצירת מרחב בטוח ללא מלכוד ההסברים, ומעבר ממאבקי כוח לחיבור עמוק.

מבנה התשובה הנדרש ב-JSON:
{
  "topic": "${topic}",
  "sourceSummary": "סיכום קצר של התובנות המרכזיות שנשלפו מתוך המאמרים/מאגר הידע על נושא זה",
  "seriesTitle": "שם מושך ואטרקטיבי לסדרת הסרטונים (לדוגמה: 'המוח המתבגר: 3 סרטונים שכל הורה חייב לראות')",
  "seriesDescription": "תיאור קצר של הסדרה והמטרה הרגשית שלה",
  "episodes": [
    {
      "episodeNumber": 1,
      "title": "שם הפרק (למשל: פרק 1 - איך דפוס נוצר במוח ולמה אנחנו נתקעים בזה)",
      "hook": "משפט הוק עוצמתי ל-3 השניות הראשונות (בלי סוגריים, מוכן לקריאה בפרומפטר)",
      "coreConcept": "המנגנון הפסיכולוגי/ביולוגי מהמאמר (למשל: תגובת האמיגדלה ודחיית סיפוקים)",
      "scriptOutline": "תסריט מלא וקולח לקריאה בפרומפטר או ראשי פרקים מפורטים מאוד לסרטון (כ-45-60 שניות)",
      "takeaway": "מסר המסכם את הפרק ומחבר אל הסרטון הבא/אל ייעוץ בלב המצפן"
    },
    {
      "episodeNumber": 2,
      "title": "...",
      "hook": "...",
      "coreConcept": "...",
      "scriptOutline": "...",
      "takeaway": "..."
    },
    {
      "episodeNumber": 3,
      "title": "...",
      "hook": "...",
      "coreConcept": "...",
      "scriptOutline": "...",
      "takeaway": "..."
    }
  ],
  "shortGuide": {
    "guideTitle": "שם המדריך הקצר (למשל: 'מדריך זהב קצר: 5 צעדים להרגעת מערכת העצבים בזמן התפרצות')",
    "targetAudience": "הורים למתבגרים / בני נוער / הורים וילדים יחד",
    "coreInsights": [
      "תובנה מרכזית 1 מתוך המאמרים",
      "תובנה מרכזית 2 מתוך המאמרים",
      "תובנה מרכזית 3 מתוך המאמרים"
    ],
    "practicalChecklist": [
      "צעד מעשי 1 לניסוי בבית",
      "צעד מעשי 2 לניסוי בבית",
      "צעד מעשי 3 לניסוי בבית",
      "צעד מעשי 4 לניסוי בבית"
    ],
    "summaryCallToAction": "משפט סיכום מעצים המזמין להעמיק בייעוץ ב'לב המצפן'"
  }
}
`;

    const preparedKB = prepareKnowledgeBaseContext(knowledgeBaseText);
    if (preparedKB) {
      prompt += `
\n--- המאמרים ומאגר הידע של "לב המצפן" שנכנסו כמקור האמת ---\n
${preparedKB}
\n-----------------------------------------------------------\n
`;
    }

    const selectedModel = model === "gemini-3.1-pro" ? "gemini-3.1-pro" : "gemini-3.5-flash";

    const ai = await getGeminiClient();


    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.5,
      }
    });

    const jsonOutput = parseGeminiJson(response.text || "{}");
    res.json(jsonOutput);
  } catch (error: any) {
    console.error("Article Series Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate article series breakdown" });
  }
});

// Serve static assets or mount Vite dev server (only when running locally, not in Vercel Serverless)
if (!process.env.VERCEL) {
  async function startServer() {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  startServer();
}

export default app;
