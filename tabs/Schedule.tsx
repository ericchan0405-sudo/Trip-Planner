
import React, { useState, useEffect } from 'react';
import { Card, SectionTitle, Button } from '../components/UI';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../constants';
import { ScheduleItem, Trip } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';

const MOCK_WEATHER: Record<string, { icon: string; temp: string; color: string }> = {
  sunny: { icon: 'fa-sun', temp: '22°', color: 'text-orange-400' },
  cloudy: { icon: 'fa-cloud-sun', temp: '18°', color: 'text-blue-300' },
  rainy: { icon: 'fa-cloud-showers-heavy', temp: '15°', color: 'text-blue-500' },
};

interface ScheduleProps {
  trip: Trip;
}

const Schedule: React.FC<ScheduleProps> = ({ trip }) => {
  const [selectedDate, setSelectedDate] = useState(trip.startDate);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  
  const [newItem, setNewItem] = useState({
    time: '10:00',
    title: '',
    location: '',
    category: 'sightseeing' as const
  });

  // Firestore Real-time Sync
  useEffect(() => {
    const q = query(
      collection(db, 'schedules'),
      where('tripId', '==', trip.id),
      orderBy('time', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem));
      setScheduleItems(items);
    });

    return () => unsub();
  }, [trip.id]);

  useEffect(() => {
    setSelectedDate(trip.startDate);
    setExpandedItemId(null);
  }, [trip.id]);

  const generateDateList = (start: string, end: string) => {
    const dates = [];
    let current = new Date(start);
    current.setDate(current.getDate() - 1); // DAY 0
    const stop = new Date(end);
    while (current <= stop) {
      dates.push(new Date(current).toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const dates = generateDateList(trip.startDate, trip.endDate);
  const filteredItems = scheduleItems.filter(item => item.date === selectedDate);

  const handleAddItem = async () => {
    if (!newItem.title) return alert('請輸入行程名稱唷！');
    const itemToAdd = {
      ...newItem,
      tripId: trip.id,
      date: selectedDate
    };
    
    await addDoc(collection(db, 'schedules'), itemToAdd);
    setIsAddingItem(false);
    setNewItem({ time: '10:00', title: '', location: '', category: 'sightseeing' });
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('確定要刪除這個行程嗎？')) {
      await deleteDoc(doc(db, 'schedules', id));
    }
  };

  const getDayWeather = (date: string) => {
    const keys = Object.keys(MOCK_WEATHER);
    const index = (new Date(date).getDate()) % keys.length;
    return MOCK_WEATHER[keys[index]];
  };

  return (
    <div className="pb-24 animate-fadeIn">
      {/* Date Picker */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-6 mb-2 px-1">
        {dates.map((date, idx) => {
          const isSelected = selectedDate === date;
          const dayLabel = idx === 0 ? "DAY 0" : `DAY ${idx}`;
          return (
            <div 
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`min-w-[75px] flex flex-col items-center p-3 rounded-[2rem] border-2 transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-leaf-green text-white border-leaf-green shadow-soft -translate-y-2' 
                  : 'bg-white text-earth-brown border-shadow-green'
              }`}
            >
              <span className={`text-[8px] font-black uppercase mb-1 ${isSelected ? 'opacity-80' : 'opacity-40'}`}>{dayLabel}</span>
              <span className="text-xl font-black leading-none">{date.split('-')[2]}</span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center mb-4">
        <SectionTitle title="行程計畫" icon={<i className="fas fa-map-location-dot"></i>} />
        <button onClick={() => setIsAddingItem(true)} className="bg-accent-orange text-white w-10 h-10 rounded-2xl shadow-soft flex items-center justify-center active:scale-90 transition-all"><i className="fas fa-plus"></i></button>
      </div>

      <div className="space-y-6 relative">
        {filteredItems.length > 0 ? (
          <>
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-shadow-green/50"></div>
            {filteredItems.map((item) => (
              <div key={item.id} className="relative pl-10 animate-fadeIn">
                <div className={`absolute left-0 top-3 w-6 h-6 rounded-full flex items-center justify-center z-10 border-4 border-warm-beige shadow-sm ${CATEGORY_COLORS[item.category]}`}>
                  <span className="text-[8px]">{CATEGORY_ICONS[item.category]}</span>
                </div>
                <Card 
                  onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                  className={`transition-all ${expandedItemId === item.id ? 'border-leaf-green' : ''} !p-4`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-black text-leaf-green bg-leaf-green/10 px-2 py-0.5 rounded-lg mr-2">{item.time}</span>
                      <h4 className="font-black text-base text-earth-brown inline-block">{item.title}</h4>
                    </div>
                    <button onClick={(e) => handleDeleteItem(e, item.id)} className="text-red-200 hover:text-red-400 p-1"><i className="fas fa-trash-can text-[10px]"></i></button>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-shadow-green mt-1">
                    <i className="fas fa-location-dot"></i>
                    <span>{item.location}</span>
                  </div>
                </Card>
              </div>
            ))}
          </>
        ) : (
          <div className="py-20 text-center opacity-20"><p className="text-xs font-bold italic">這天還沒有計畫唷，點擊「＋」開始吧！</p></div>
        )}
      </div>

      {isAddingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-earth-brown/40 backdrop-blur-sm" onClick={() => setIsAddingItem(false)}></div>
          <Card className="relative z-10 w-full animate-tripSelectorIn !p-8">
            <h3 className="text-lg font-black text-earth-brown mb-6">加入行程</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <input type="time" className="bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={newItem.time} onChange={e => setNewItem({...newItem, time: e.target.value})} />
                <select className="bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})}>
                  <option value="sightseeing">景點</option><option value="food">美食</option><option value="transport">交通</option><option value="stay">住宿</option>
                </select>
              </div>
              <input placeholder="行程名稱" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} />
              <input placeholder="地點" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
              <div className="flex gap-2 pt-4">
                <Button variant="secondary" className="flex-1" onClick={() => setIsAddingItem(false)}>取消</Button>
                <Button className="flex-1" onClick={handleAddItem}>儲存</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Schedule;
