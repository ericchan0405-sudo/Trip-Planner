
// 模擬旅行建議服務 (無需 API Key)
export const getTravelSuggestions = async (destination: string, currentPlan: string) => {
  // 模擬網路延遲
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return `[模擬建議] 針對您的 ${destination} 之旅：
1. 推薦前往當地巷弄內的私房咖啡廳，避開觀光人潮。
2. 傍晚時分可以到河岸邊散步，景色非常優美。
3. 記得攜帶一雙舒適的走路鞋，這座城市非常適合漫遊。`;
};

// 模擬憑證辨識服務 (無需 API Key)
export const analyzeBookingVoucher = async (base64Data: string, mimeType: string): Promise<any> => {
  // 模擬辨識延遲
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 根據模擬邏輯回傳資料
  const isStay = Math.random() > 0.4; // 隨機模擬飯店或機票
  
  if (isStay) {
    return {
      type: "stay",
      title: "辨識成功的飯店名稱 (AI 模擬)",
      provider: "住宿預訂", // 不再預設 Agoda
      startDate: "2024-12-24",
      endDate: "2024-12-28",
      location: "東京都新宿區",
      cost: 12500, // 回傳辨識出的金額
      note: "這是 AI 模擬辨識出的金額，您可以點擊進入卡片進行修改。"
    };
  } else {
    return {
      type: "flight",
      title: "JL 802",
      provider: "日本航空",
      startDate: "2024-12-24 10:00",
      endDate: "2024-12-24 14:30",
      location: "NRT", // 機場代碼
      cost: 5000,
      note: "這是 AI 模擬辨識出的航班，點擊可編輯內容。"
    };
  }
};
