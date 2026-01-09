
import { GoogleGenAI, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Initialized GoogleGenAI using process.env.API_KEY directly as per guidelines
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async parseTaskInput(input: string, baseDate: string) {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze the following text describing a project or tasks and convert them into a structured JSON list of work items.
        The current date (base date) is ${baseDate}.
        If a task doesn't have a specific date, schedule it sequentially after the previous task.
        Text: "${input}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the task" },
              durationDays: { type: Type.NUMBER, description: "Duration in days" },
              offsetFromBase: { type: Type.NUMBER, description: "Days starting from base date" },
              color: { type: Type.STRING, description: "Hex color code (modern palette)" },
              progress: { type: Type.NUMBER, description: "0 to 100" }
            },
            required: ["name", "durationDays", "offsetFromBase", "color", "progress"]
          }
        }
      }
    });

    try {
      // Direct access to .text property as it is a getter
      return JSON.parse(response.text || '[]');
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      return [];
    }
  }
}
