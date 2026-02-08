import React, { useState, useEffect, useRef } from 'react';
import { Card, SectionTitle, Button } from '../components/UI';
import FlightCard from '../components/FlightCard';
import StayCard from '../components/StayCard';
import { analyzeBookingVoucher } from '../services/geminiService';
import { AIRPORTS } from '../constants';

interface DeleteModal {
  isOpen: boolean;
  targetId: string;
  targetType: 'flight' | 'stay' | 'other';
  title: string;
}

interface EditModal {
  isOpen: boolean;
  type: 'flight' | 'stay' | 'other';
  data: any;
  isNew?: boolean;
}

const TypingText: React.FC<{ text: string }> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        setTimeout(() => {
          index = 0;
          setDisplayedText('');
        }, 1000);
      }
    }, 180);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="flex items-center justify-center gap-1">
      <span className="tracking-[0.1em]">{displayedText}</span>
      <span className="w-1 h-8 bg-leaf-green animate-pulse rounded-full"></span>
    </div>
  );
};

const Bookings: React.FC = () => {
  const [usePin, setUsePin] = useState(() => {
    const stored = localStorage.getItem('komorebi_use_pin');
    return stored === null ? false : stored === 'true';
  });

  const [isUnlocked, setIsUnlocked] = useState(!usePin);
  const [inputPin, setInputPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [savedPin, setSavedPin] = useState(() => {
    return localStorage.getItem('komorebi_trip_pin') || '007';
  });

  const [flights, setFlights] = useState<any[]>([
    {
      id: 'default-flight',
      provider: 'EVA AIR 長榮航空',
      title: 'BR 198',
      origin: { code: 'TPE', city: '台北桃園', time: '08:50' },
      destination: { code: 'NRT', city: '東京成田', time: '13:15' },
      passenger: 'WANG XIAO MING, LIN MEI MEI',
      classType: 'Premium Economy',
      gate: 'C7',
      seat: '22K, 22J',
      date: '2024.10.10',
      duration: '3h 25m',
      type: 'flight'
    }
  ]);
  
  const [stays, setStays] = useState<any[]>([
    {
      id: 'default-stay',
      title: '新宿格拉斯麗飯店 (哥吉拉飯店)',
      provider: 'Agoda',
      startDate: '2024-10-10',
      endDate: '2024-10-15',
      location: '1-19-1 Kabukicho, Shinjuku, Tokyo',
      cost: 15800,
      type: 'stay',
      note: '哥吉拉頭像在 8 樓露台'
    }
  ]);

  const [otherBookings, setOtherBookings] = useState<any[]>([]);
  const [deleteModal, setDeleteModal] = useState<DeleteModal>({ isOpen: false, targetId: '', targetType: 'other', title: '' });
  const [editModal, setEditModal] = useState<EditModal>({ isOpen: false, type: 'flight', data: null });

  useEffect(() => {
    if ("geolocation" in navigator && isUnlocked) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      });
    }
  }, [isUnlocked]);

  const calculateDepartureSuggestion = (flightTime: string) => {
    if (!flightTime || !flightTime.includes(':')) return undefined;
    const [hours, minutes] = flightTime.split(':').map(Number);
    const flightDate = new Date();
    flightDate.setHours(hours, minutes, 0);
    const targetArrivalAtAirport = new Date(flightDate.getTime() - (150 * 60000));
    const travelMinutes = userLocation ? 45 + Math.floor((userLocation.lat + userLocation.lng) % 45) : 60;
    const departureTime = new Date(targetArrivalAtAirport.getTime() - (travelMinutes * 60000));
    return {
      time: departureTime.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }),
      transport: travelMinutes > 50 ? '大眾運輸' : '開車',
      estimate: `預估 ${travelMinutes} 分鐘`
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const resultBase64 = reader.result as string;
        const result = await analyzeBookingVoucher(resultBase64.split(',')[1], file.type);
        // Fix: Use 'any' type to allow dynamic property assignment for origin/destination
        const newEntry: any = { ...result, id: `book-${Date.now()}`, isPdf: file.type === 'application/pdf', fileUrl: resultBase64 };
        if (result.type === 'flight') {
          // Fix for line 138: Assign origin properties
          newEntry.origin = { 
            code: result.location?.length === 3 ? result.location : '---', 
            city: result.location?.length === 3 ? '' : (result.location || '待確認'), 
            time: result.startDate?.includes(' ') ? result.startDate.split(' ')[1] : (result.startDate?.includes(':') ? result.startDate : '00:00')
          };
          // Fix for line 143: Assign destination properties
          newEntry.destination = { code: '---', city: '待確認', time: result.endDate?.includes(' ') ? result.endDate.split(' ')[1] : '00:00' };
          setFlights(prev => [newEntry, ...prev]);
        } else if (result.type === 'stay') {
          setStays(prev => [newEntry, ...prev]);
        } else {
          setOtherBookings(prev => [newEntry, ...prev]);
        }
        setIsAnalyzing(false);
      };
    } catch (error) {
      alert("辨識失敗：" + (error as Error).message);
      setIsAnalyzing(false);
    }
  };

  const openManualAdd = (type: 'flight' | 'stay' | 'other') => {
    const initialData: any = { id: `manual-${Date.now()}`, type, provider: '', title: '' };
    if (type === 'flight') {
      initialData.origin = { code: '', city: '', time: '09:00' };
      initialData.destination = { code: '', city: '', time: '12:00' };
      initialData.passenger = '';
      initialData.seat = '';
      initialData.gate = '';
      initialData.date = new Date().toISOString().split('T')[0];
    } else if (type === 'stay') {
      initialData.startDate = new Date().toISOString().split('T')[0];
      initialData.endDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      initialData.location = '';
      initialData.cost = 0;
      initialData.note = '';
    }
    setEditModal({ isOpen: true, type, data: initialData, isNew: true });
  };

  const handleSaveEntry = () => {
    const { data, type, isNew } = editModal;
    if (isNew) {
      if (type === 'flight') setFlights(prev => [data, ...prev]);
      else if (type === 'stay') setStays(prev => [data, ...prev]);
      else setOtherBookings(prev => [data, ...prev]);
    } else {
      if (type === 'flight') setFlights(prev => prev.map(f => f.id === data.id ? data : f));
      if (type === 'stay') setStays(prev => prev.map(s => s.id === data.id ? data : s));
      if (type === 'other') setOtherBookings(prev => prev.map(b => b.id === data.id ? data : b));
    }
    setEditModal({ ...editModal, isOpen: false });
  };

  const confirmDelete = (id: string, type: 'flight' | 'stay' | 'other', title: string) => {
    setDeleteModal({ isOpen: true, targetId: id, targetType: type, title: title });
  };

  const openEdit = (id: string, type: 'flight' | 'stay' | 'other') => {
    let data;
    if (type === 'flight') data = flights.find(f => f.id === id);
    if (type === 'stay') data = stays.find(s => s.id === id);
    if (type === 'other') data = otherBookings.find(b => b.id === id);
    if (data) setEditModal({ isOpen: true, type, data: JSON.parse(JSON.stringify(data)), isNew: false });
  };

  const handleDelete = () => {
    const { targetId, targetType } = deleteModal;
    if (targetType === 'flight') setFlights(prev => prev.filter(f => f.id !== targetId));
    if (targetType === 'stay') setStays(prev => prev.filter(s => s.id !== targetId));
    if (targetType === 'other') setOtherBookings(prev => prev.filter(b => b.id !== targetId));
    setDeleteModal({ ...deleteModal, isOpen: false });
  };

  const handleUnlock = () => {
    if (inputPin === savedPin) setIsUnlocked(true);
    else alert(`PIN 碼錯誤！`);
  };

  const togglePinRequirement = () => {
    const newValue = !usePin;
    setUsePin(newValue);
    localStorage.setItem('komorebi_use_pin', String(newValue));
    if (!newValue) setIsUnlocked(true);
  };

  if (!isUnlocked && usePin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn text-center">
        <div className="w-20 h-20 rounded-full bg-white shadow-soft border-2 border-shadow-green flex items-center justify-center text-accent-orange mb-6 mx-auto">
          <i className="fas fa-lock text-3xl"></i>
        </div>
        <h3 className="text-xl font-bold mb-2 text-earth-brown">隱私保護區域</h3>
        <p className="text-xs opacity-50 mb-6 px-12">請輸入 PIN 碼以解鎖預訂資訊。</p>
        <input 
          type="password" maxLength={3} autoFocus
          className="bg-white border-2 border-shadow-green rounded-2xl px-4 py-3 text-center w-24 text-xl font-black outline-none focus:border-leaf-green shadow-inner mb-6 mx-auto block"
          onChange={(e) => setInputPin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
        />
        <Button onClick={handleUnlock}>確認解鎖</Button>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-fadeIn">
      {isAnalyzing && (
        <div className="fixed inset-0 z-[100] bg-warm-beige/90 backdrop-blur-lg flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-white rounded-full shadow-soft flex items-center justify-center border-2 border-shadow-green mb-8 animate-bounce-soft">
            <i className="fas fa-wand-magic-sparkles text-4xl text-leaf-green"></i>
          </div>
          <div className="text-center px-10">
            <div className="text-2xl font-black text-earth-brown mb-4 h-10 flex items-center justify-center">
              <TypingText text="正在辨識中，請稍後" />
            </div>
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-earth-brown/40 backdrop-blur-sm" onClick={() => setDeleteModal({...deleteModal, isOpen: false})}></div>
          <Card className="relative z-10 w-full animate-fadeIn border-red-200">
            <div className="text-center mb-6">
              <h3 className="text-lg font-black text-earth-brown mb-2">確定要刪除嗎？</h3>
              <p className="text-xs text-shadow-green font-bold">您即將刪除：{deleteModal.title}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteModal({...deleteModal, isOpen: false})}>取消</Button>
              <Button variant="danger" className="flex-1" onClick={handleDelete}>確定</Button>
            </div>
          </Card>
        </div>
      )}

      {editModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-16">
          <div className="fixed inset-0 bg-earth-brown/40 backdrop-blur-sm" onClick={() => setEditModal({...editModal, isOpen: false})}></div>
          <Card className="relative z-10 w-full max-h-[80vh] overflow-y-auto no-scrollbar animate-fadeIn">
            <h3 className="text-xl font-black text-earth-brown mb-6">{editModal.isNew ? '手動新增' : '修改資訊'}</h3>
            <div className="space-y-4">
              {editModal.type === 'flight' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center outline-none" placeholder="航空公司" value={editModal.data.provider || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, provider: e.target.value}})} />
                    <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center outline-none" placeholder="航班號碼" value={editModal.data.title || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, title: e.target.value}})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold" value={editModal.data.origin?.code || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, origin: {...(editModal.data.origin||{}), code: e.target.value, city: AIRPORTS.find(a=>a.code===e.target.value)?.city || ''}}})}>
                      <option value="">出發機場</option>
                      {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.name}</option>)}
                    </select>
                    <select className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold" value={editModal.data.destination?.code || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, destination: {...(editModal.data.destination||{}), code: e.target.value, city: AIRPORTS.find(a=>a.code===e.target.value)?.city || ''}}})}>
                      <option value="">到達機場</option>
                      {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="time" className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" value={editModal.data.origin?.time || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, origin: {...(editModal.data.origin||{}), time: e.target.value}}})} />
                    <input type="time" className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" value={editModal.data.destination?.time || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, destination: {...(editModal.data.destination||{}), time: e.target.value}}})} />
                  </div>
                  <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" placeholder="乘客姓名 (多人請用逗號分隔)" value={editModal.data.passenger || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, passenger: e.target.value}})} />
                  <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" placeholder="座位編號 (對應姓名，可用逗號/空格)" value={editModal.data.seat || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, seat: e.target.value}})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" placeholder="登機門" value={editModal.data.gate || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, gate: e.target.value}})} />
                    <input type="date" className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" value={editModal.data.date || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, date: e.target.value}})} />
                  </div>
                </>
              )}
              {editModal.type === 'stay' && (
                <>
                  <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold" placeholder="飯店名稱" value={editModal.data.title || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, title: e.target.value}})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold" value={editModal.data.startDate || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, startDate: e.target.value}})} />
                    <input type="date" className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold" value={editModal.data.endDate || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, endDate: e.target.value}})} />
                  </div>
                  <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold" placeholder="地址" value={editModal.data.location || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, location: e.target.value}})} />
                </>
              )}
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setEditModal({...editModal, isOpen: false})}>取消</Button>
                <Button className="flex-1" onClick={handleSaveEntry}>儲存</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-center">
        <SectionTitle title="航班資訊" icon={<i className="fas fa-plane-departure"></i>} />
        <button onClick={() => setIsChangingPin(!isChangingPin)} className="mt-6 w-10 h-10 rounded-xl bg-white border-2 border-shadow-green flex items-center justify-center text-earth-brown/40 active:scale-90 transition-all">
          <i className={`fas ${isChangingPin ? 'fa-xmark' : 'fa-gear'}`}></i>
        </button>
      </div>

      {isChangingPin && (
        <Card className="mb-6 bg-accent-orange/5 border-accent-orange/20 animate-fadeIn text-center">
          <div className="flex justify-between items-center mb-4 px-2">
            <h4 className="font-bold text-sm text-earth-brown">安全性設置</h4>
            <div onClick={togglePinRequirement} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${usePin ? 'bg-leaf-green' : 'bg-shadow-green'}`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${usePin ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
          </div>
          {usePin && (
            <div className="pt-4 border-t border-shadow-green/30">
              <input type="password" maxLength={3} placeholder="新 PIN" className="w-full bg-white border-2 border-shadow-green rounded-xl px-4 py-2 text-sm outline-none mb-3 font-black text-center tracking-widest"
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} />
              <Button className="w-full !py-2 !text-xs !bg-accent-orange" onClick={() => { localStorage.setItem('komorebi_trip_pin', newPin); alert('PIN 已更新'); setIsChangingPin(false); }}>儲存新 PIN</Button>
            </div>
          )}
        </Card>
      )}
      
      <div className="mb-10 space-y-6">
        {flights.map(f => (
          <FlightCard 
            key={f.id} id={f.id} airline={f.provider} flightNumber={f.title}
            origin={f.origin} destination={f.destination} passenger={f.passenger}
            classType={f.classType || "Economy"} gate={f.gate} seat={f.seat}
            date={f.date || f.startDate?.split(' ')[0]} duration={f.duration}
            suggestedDeparture={calculateDepartureSuggestion(f.origin?.time)}
            onDelete={() => confirmDelete(f.id, 'flight', f.title)} onEdit={() => openEdit(f.id, 'flight')}
          />
        ))}
      </div>

      <SectionTitle title="住宿資訊" icon={<i className="fas fa-hotel"></i>} />
      <div className="space-y-6 mb-10">
        {stays.map(s => (
          <StayCard 
            key={s.id} id={s.id} hotelName={s.title} provider={s.provider}
            checkIn={s.startDate} checkOut={s.endDate}
            location={s.location} cost={s.cost} note={s.note}
            onDelete={() => confirmDelete(s.id, 'stay', s.title)} onEdit={() => openEdit(s.id, 'stay')}
          />
        ))}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => fileInputRef.current?.click()}
          className="py-8 border-4 border-dashed border-shadow-green/50 rounded-[2.5rem] flex flex-col items-center justify-center text-shadow-green hover:text-leaf-green bg-white/50 active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-white shadow-soft border-2 border-shadow-green flex items-center justify-center mb-2">
            <i className="fas fa-camera-retro text-xl"></i>
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest">AI 上傳辨識</span>
        </button>

        <button onClick={() => openManualAdd('flight')}
          className="py-8 border-4 border-dashed border-shadow-green/50 rounded-[2.5rem] flex flex-col items-center justify-center text-shadow-green hover:text-leaf-green bg-white/50 active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-white shadow-soft border-2 border-shadow-green flex items-center justify-center mb-2">
            <i className="fas fa-pen-nib text-xl"></i>
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest">手動新增預訂</span>
        </button>
      </div>

      {usePin && isUnlocked && (
        <div className="mt-8 text-center">
          <button onClick={() => setIsUnlocked(false)} className="text-[10px] font-bold uppercase tracking-widest text-shadow-green">
            <i className="fas fa-lock mr-1"></i> 手動鎖定隱私區域
          </button>
        </div>
      )}
      <style>{`
        @keyframes bounce-soft { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .animate-bounce-soft { animation: bounce-soft 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default Bookings;