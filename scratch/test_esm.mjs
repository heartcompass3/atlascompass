import { GoogleGenAI } from '@google/genai';

console.log("Imported GoogleGenAI:", GoogleGenAI);
try {
  const ai = new GoogleGenAI({ apiKey: "test" });
  console.log("Instantiated ai:", !!ai);
} catch (e) {
  console.error("Error:", e);
}
