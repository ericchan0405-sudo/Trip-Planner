
import { GoogleGenAI, Type } from "@google/genai";

// Use process.env.API_KEY directly as required by guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTravelSuggestions = async (destination: string, currentPlan: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a Japanese travel planner expert. Based on the current itinerary: "${currentPlan}", suggest 3 hidden gems or food spots in "${destination}". Format as simple bullet points.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });
    // Use .text property directly
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "暫時無法獲取 AI 建議，請稍後再試。";
  }
};

export const analyzeBookingVoucher = async (base64Data: string, mimeType: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: "Please extract booking information from this image. Identify the type (flight, stay, car, or ticket). Return a JSON object with: type, title, provider, startDate, endDate, location, cost (number only), and a short note about check-in/boarding info. Language should be Traditional Chinese.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "One of: flight, stay, car, ticket" },
            title: { type: Type.STRING },
            provider: { type: Type.STRING },
            startDate: { type: Type.STRING, description: "YYYY-MM-DD HH:mm format if available" },
            endDate: { type: Type.STRING, description: "YYYY-MM-DD HH:mm format if available" },
            location: { type: Type.STRING },
            cost: { type: Type.NUMBER },
            note: { type: Type.STRING }
          },
          required: ["type", "title"]
        }
      },
    });

    // Use .text property directly and parse JSON safely
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("無法辨識憑證，請確認圖片清晰度。");
  }
};
