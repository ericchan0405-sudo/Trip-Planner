import { GoogleGenAI, Type } from "@google/genai";

// 使用 Google Gemini API 獲取旅行建議
export const getTravelSuggestions = async (destination: string, currentPlan: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位專業的旅遊規劃師。請根據目的地「${destination}」以及目前的行程規劃「${currentPlan}」，提供 3 個實用且獨特的在地建議（例如必吃隱藏版美食、避開人群的私房景點或實用的購物提示）。請用繁體中文回答。`,
    });
    
    return response.text || "目前無法取得建議。";
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return "獲取建議時發生錯誤，請稍後再試。";
  }
};

// 使用 Google Gemini API 辨識預訂憑證（機票或飯店確認單）
export const analyzeBookingVoucher = async (base64Data: string, mimeType: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          {
            text: '請分析這張旅遊憑證（如機票或飯店確認單），並提取相關資訊。如果是機票，請將 type 設為 "flight"，location 設為出發地機場代碼。如果是飯店，請將 type 設為 "stay"。請回傳 JSON 格式。',
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: 'flight 或 stay' },
            title: { type: Type.STRING, description: '飯店名稱或航班號碼' },
            provider: { type: Type.STRING, description: '供應商（如航空公司或訂房平台）' },
            startDate: { type: Type.STRING, description: '開始日期或時間（格式 YYYY-MM-DD 或 YYYY-MM-DD HH:mm）' },
            endDate: { type: Type.STRING, description: '結束日期或時間（格式 YYYY-MM-DD 或 YYYY-MM-DD HH:mm）' },
            location: { type: Type.STRING, description: '地點（飯店地址或機場代碼）' },
            cost: { type: Type.NUMBER, description: '總金額' },
            note: { type: Type.STRING, description: '額外備註' },
          },
          required: ['type', 'title'],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // 回傳預設結構以利前端處理
    return {
      type: "stay",
      title: "辨識失敗 (請點擊修改)",
      provider: "自動辨識",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      location: "無法自動提取資訊",
      cost: 0,
      note: "辨識過程發生錯誤，請手動確認資訊。"
    };
  }
};