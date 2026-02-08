import React, { useState, useEffect } from 'react';
import { Card, SectionTitle, Button } from '../components/UI';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import { ScheduleItem, Trip } from '../types';

// 模擬不同日期的天氣狀況
const MOCK_WEATHER: Record<string, { icon: string; temp: string; color: string }> = {
  sunny: { icon: 'fa-sun', temp: '22°', color: 'text-orange-400' },
  cloudy: { icon: 'fa-cloud-sun', temp: '18°', color: 'text-blue-300' },
  rainy: { icon: 'fa-cloud-showers-heavy', temp: '15°', color: 'text-blue-500' },
};

const INITIAL_SCHEDULE: ScheduleItem[] = [
  { id: '1', tripId: 'trip-1', date: '2024-03-31', time: '09:00', title: '抵達東京成田機場', location: 'Narita Airport', category: 'transport' },
  { id: '2', tripId: 'trip-1', date: '2024-03-31', time: '12:30', title: '敘敘苑 燒肉午餐', location: '敘敘苑 新宿', category: 'food' },
  { id: '3', tripId: 'trip-2', date: '2024-05-01', time: '11:00', title: '京都車站和菓子', location: 'Kyoto Station', category: 'food' },
  { id: '4', tripId: 'trip-3', date: '2024-12-20', time: '10:00', title: '二世谷滑雪場', location: 'Niseko Ski Resort', category: 'sightseeing' },
  { id: '0-pre', tripId: 'trip-1', date: '2024-03-30', time: '20:00', title: '最後行李檢查', location: 'Home', category: 'transport' },
];

interface ScheduleProps {
  trip: Trip;
}

const Schedule: React.FC<ScheduleProps> = ({ trip }) => {
  const [selectedDate, setSelectedDate] = useState(trip.startDate);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(INITIAL_SCHEDULE);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  
  // New Item Form State
  const [newItem, setNewItem] = useState({
    time: '10:00',
    title: '',
    location: '',
    category: 'sightseeing' as const
  });

  useEffect(() => {
    setSelectedDate(trip.startDate);
    setExpandedItemId(null);
  }, [trip.id]);

  const generateDateList = (start: string, end: string) => {
    const dates = [];
    let current = new Date(start);
    current.setDate(current.getDate() - 1);
    const stop = new Date(end);
    while (current <= stop) {
      dates.push(new Date(current).toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const dates = generateDateList(trip.startDate, trip.endDate);
  const filteredItems = scheduleItems
    .filter(item => item.tripId === trip.id && item.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleAddItem = () => {
    if (!newItem.title) return alert('請輸入行程名稱唷！');
    const itemToAdd: ScheduleItem = {
      ...newItem,
      id: `item-${Date.now()}`,
      tripId: trip.id,
      date: selectedDate
    };
    setScheduleItems([...scheduleItems, itemToAdd]);
    setIsAddingItem(false);
    setNewItem({ time: '10:00', title: '', location: '', category: 'sightseeing' });
  };

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysToStart = getDaysUntil(trip.startDate);

  const getDayWeather = (date: string) => {
    const keys = Object.keys(MOCK_WEATHER);
    const index = (new Date(date).getDate()) % keys.length;
    return MOCK_WEATHER[keys[index]];
  };

  const toggleExpand = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  return (
    <div className="pb-24 animate-fadeIn">
      {/* Weather Header */}
      <Card className="mb-6 bg-gradient-to-br from-blue-50/80 to-white border-blue-100 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">
            當日預報：{trip.destination} ({selectedDate.replace(/-/g, '/')})
          </p>
          <h3 className="text-2xl font-black text-earth-brown">
            {getDayWeather(selectedDate).temp} {getDayWeather(selectedDate).icon === 'fa-sun' ? '晴朗' : '多雲轉晴'}
          </h3>
        </div>
        <div className={`w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-soft border border-blue-50 ${getDayWeather(selectedDate).color}`}>
          <i className={`fas ${getDayWeather(selectedDate).icon} text-3xl`}></i>
        </div>
      </Card>

      {/* Date Picker */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6 mb-2 px-1">
        {dates.map((date, idx) => {
          const weather = getDayWeather(date);
          const isSelected = selectedDate === date;
          const dayLabel = idx === 0 ? "DAY 0" : `DAY ${idx}`;
          
          return (
            <div 
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`min-w-[75px] flex flex-col items-center p-3 rounded-[2rem] border-2 transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-leaf-green text-white border-leaf-green shadow-soft -translate-y-2' 
                  : 'bg-white text-earth-brown border-shadow-green hover:border-leaf-green/50'
              }`}
            >
              <span className={`text-[8px] font-black uppercase mb-1 ${isSelected ? 'opacity-80' : 'opacity-40'}`}>
                {dayLabel}
              </span>
              <span className="text-xl font-black leading-none mb-1">{date.split('-')[2]}</span>
              <div className={`flex flex-col items-center mt-1 ${isSelected ? 'text-white' : weather.color}`}>
                <i className={`fas ${weather.icon} text-[10px] mb-0.5`}></i>
                <span className="text-[9px] font-bold">{weather.temp}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center mb-4">
        <SectionTitle title="行程計畫" icon={<i className="fas fa-map-location-dot"></i>} />
        <button 
          onClick={() => setIsAddingItem(true)}
          className="bg-accent-orange text-white w-10 h-10 rounded-2xl shadow-soft flex items-center justify-center active:scale-90 transition-all hover:brightness-110"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* Timeline Section */}
      <div className="space-y-6 relative">
        {filteredItems.length > 0 ? (
          <>
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-shadow-green/50"></div>
            {filteredItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              return (
                <div key={item.id} className="relative pl-10 group animate-fadeIn">
                  <div className={`absolute left-0 top-3 w-6 h-6 rounded-full flex items-center justify-center z-10 border-4 border-warm-beige shadow-sm ${CATEGORY_COLORS[item.category]}`}>
                    <span className="text-[8px]">{CATEGORY_ICONS[item.category]}</span>
                  </div>
                  
                  <Card 
                    onClick={() => toggleExpand(item.id)}
                    className={`transition-all duration-300 ${isExpanded ? 'border-leaf-green shadow-lg ring-2 ring-leaf-green/10' : 'hover:border-leaf-green/50'} !p-0 overflow-hidden`}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-black text-leaf-green bg-leaf-green/10 px-2 py-0.5 rounded-lg">{item.time}</span>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${CATEGORY_COLORS[item.category]}`}>
                          {item.category}
                        </span>
                      </div>
                      <h4 className="font-black text-base mb-1 text-earth-brown">{item.title}</h4>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-shadow-green">
                        <i className="fas fa-location-dot"></i>
                        <span>{item.location}</span>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="bg-warm-beige/30 border-t-2 border-dashed border-shadow-green/50 animate-fadeIn overflow-hidden">
                        {/* Map View */}
                        <div className="p-3">
                          <div className="w-full h-44 bg-white rounded-2xl border-2 border-shadow-green overflow-hidden relative shadow-inner">
                            <iframe
                              title="Map"
                              width="100%"
                              height="100%"
                              style={{ border: 0 }}
                              loading="lazy"
                              allowFullScreen
                              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.API_KEY || 'REPLACE_WITH_YOUR_API_KEY'}&q=${encodeURIComponent(item.location)}`}
                              className="grayscale-[20%] contrast-[1.1] sepia-[0.1]"
                            ></iframe>
                            {/* Overlay if No API Key or just for style */}
                            <div className="absolute bottom-2 right-2 flex gap-1">
                              <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black text-earth-brown shadow-sm flex items-center gap-1 border border-shadow-green"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <i className="fas fa-external-link-alt text-leaf-green"></i> 打開 Google Maps
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Transport Suggestions */}
                        <div className="px-4 pb-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-shadow-green mb-2">建議交通方式</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-shadow-green shadow-sm">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500">
                                  <i className="fas fa-train"></i>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-earth-brown">大眾運輸</p>
                                  <p className="text-[9px] text-shadow-green font-bold">預估 15 - 25 分鐘</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-black text-leaf-green">最推薦</span>
                            </div>
                            
                            <div className="flex items-center justify-between p-2 bg-white/50 rounded-xl border border-shadow-green/50">
                              <div className="flex items-center gap-3 opacity-60">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-400">
                                  <i className="fas fa-walking"></i>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-earth-brown">步行</p>
                                  <p className="text-[9px] text-shadow-green font-bold">預估 45 分鐘</p>
                                </div>
                              </div>
                              <i className="fas fa-chevron-right text-shadow-green text-xs"></i>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </>
        ) : (
          <div className="flex flex-col items-center py-16 opacity-30 text-center">
            <div className="w-20 h-20 rounded-full bg-shadow-green flex items-center justify-center mb-4">
              <i className="fas fa-mug-hot text-3xl"></i>
            </div>
            <p className="text-xs font-bold italic px-10 leading-relaxed">
              {selectedDate === dates[0] ? "準備出發囉！在這天記錄行李清單或注意事項吧。" : "這天還空空如也呢，點擊右上角的「＋」來排入新行程吧！"}
            </p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {isAddingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-earth-brown/40 backdrop-blur-sm" onClick={() => setIsAddingItem(false)}></div>
          <Card className="relative z-10 w-full animate-tripSelectorIn shadow-2xl">
            <h3 className="text-xl font-black text-earth-brown mb-6 flex items-center gap-2">
              <i className="fas fa-paper-plane text-accent-orange"></i>
              計畫新行程
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">出發時間</label>
                  <input 
                    type="time" 
                    className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-2xl px-4 py-3 outline-none focus:border-leaf-green transition-all font-bold text-earth-brown"
                    value={newItem.time}
                    onChange={(e) => setNewItem({...newItem, time: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">活動類型</label>
                  <select 
                    className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-2xl px-4 py-3 outline-none focus:border-leaf-green transition-all font-bold text-earth-brown appearance-none"
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value as any})}
                  >
                    <option value="sightseeing">景點</option>
                    <option value="food">美食</option>
                    <option value="transport">交通</option>
                    <option value="stay">住宿</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">行程名稱</label>
                <input 
                  type="text" 
                  placeholder="例如：東京鐵塔拍照、六本木午餐"
                  className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-2xl px-4 py-3 outline-none focus:border-leaf-green transition-all font-bold text-earth-brown"
                  value={newItem.title}
                  onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">地點</label>
                <input 
                  type="text" 
                  placeholder="輸入詳細地點或地址"
                  className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-2xl px-4 py-3 outline-none focus:border-leaf-green transition-all font-bold text-earth-brown"
                  value={newItem.location}
                  onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" className="flex-1 !shadow-none" onClick={() => setIsAddingItem(false)}>取消</Button>
                <Button className="flex-1" onClick={handleAddItem}>加入行程</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Trip Progress Badge */}
      <div className="mt-12 text-center">
        <div className="inline-block px-8 py-4 rounded-full bg-white border-2 border-shadow-green shadow-soft">
          <p className="text-[10px] font-black uppercase tracking-widest text-shadow-green mb-1">
            {daysToStart > 0 ? '距離出發' : '旅程進度'}
          </p>
          <p className="text-xl font-black text-leaf-green">
            {daysToStart > 0 
              ? `T-minus ${daysToStart} Days` 
              : daysToStart === 0 
                ? 'Adventure Starts Today!' 
                : 'Enjoying the Trip!'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Schedule;