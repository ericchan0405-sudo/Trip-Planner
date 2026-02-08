
import React from 'react';

export const CATEGORY_COLORS = {
  sightseeing: 'bg-leaf-green text-white',
  food: 'bg-accent-orange text-white',
  transport: 'bg-blue-400 text-white',
  stay: 'bg-purple-400 text-white',
};

export const CATEGORY_ICONS = {
  sightseeing: <i className="fas fa-camera"></i>,
  food: <i className="fas fa-utensils"></i>,
  transport: <i className="fas fa-bus"></i>,
  stay: <i className="fas fa-bed"></i>,
};

export const CURRENCIES = [
  { code: 'HKD', symbol: 'HK$', rate: 1 },
  { code: 'JPY', symbol: '¥', rate: 0.052 }, // 1 JPY ≈ 0.052 HKD
  { code: 'TWD', symbol: 'NT$', rate: 0.24 }, // 1 TWD ≈ 0.24 HKD
  { code: 'USD', symbol: '$', rate: 7.8 },    // 1 USD ≈ 7.8 HKD
];

// 全球主要機場清單 - 已將香港 (HKG) 移至首位
export const AIRPORTS = [
  { code: 'HKG', name: '香港 (HKG)', city: '香港' },
  { code: 'TPE', name: '台北桃園 (TPE)', city: '台北' },
  { code: 'TSA', name: '台北松山 (TSA)', city: '台北' },
  { code: 'KHH', name: '高雄小港 (KHH)', city: '高雄' },
  { code: 'NRT', name: '東京成田 (NRT)', city: '東京' },
  { code: 'HND', name: '東京羽田 (HND)', city: '東京' },
  { code: 'KIX', name: '大阪關西 (KIX)', city: '大阪' },
  { code: 'CTS', name: '札幌新千歲 (CTS)', city: '札幌' },
  { code: 'FUK', name: '福岡 (FUK)', city: '福岡' },
  { code: 'ICN', name: '首爾仁川 (ICN)', city: '首爾' },
  { code: 'SIN', name: '新加坡樟宜 (SIN)', city: '新加坡' },
  { code: 'BKK', name: '曼谷蘇凡納布 (BKK)', city: '曼谷' },
  { code: 'SFO', name: '舊金山 (SFO)', city: '舊金山' },
  { code: 'LAX', name: '洛杉磯 (LAX)', city: '洛杉磯' },
  { code: 'JFK', name: '紐約甘迺迪 (JFK)', city: '紐約' },
  { code: 'LHR', name: '倫敦希斯洛 (LHR)', city: '倫敦' },
  { code: 'CDG', name: '巴黎戴高樂 (CDG)', city: '巴黎' },
  { code: 'SYD', name: '雪梨 (SYD)', city: '雪梨' },
];
