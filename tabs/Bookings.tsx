
import React, { useState, useEffect } from 'react';
import { Card, SectionTitle, Button } from '../components/UI';
import FlightCard from '../components/FlightCard';
import StayCard from '../components/StayCard';
import { AIRPORTS } from '../constants';
import { Trip } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';

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

interface BookingsProps {
  trip: Trip;
}

const Bookings: React.FC<BookingsProps> = ({ trip }) => {
  const [usePin, setUsePin] = useState(() => {
    const stored = localStorage.getItem('komorebi_use_pin');
    return stored === null ? false : stored === 'true';
  });

  const [isUnlocked, setIsUnlocked] = useState(!usePin);
  const [inputPin, setInputPin] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const [savedPin, setSavedPin] = useState(() => {
    return localStorage.getItem('komorebi_trip_pin') || '007';
  });

  const [bookings, setBookings] = useState<any[]>([]);

  // Firestore Real-time Sync
  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('tripId', '==', trip.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [trip.id]);

  const flights = bookings.filter(b => b.type === 'flight');
  const stays = bookings.filter(b => b.type === 'stay');
  const otherBookings = bookings.filter(b => b.type === 'other');

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

  const openManualAdd = (type: 'flight' | 'stay' | 'other') => {
    const initialData: any = { type, provider: '', title: '', tripId: trip.id };
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

  const handleSaveEntry = async () => {
    const { data, isNew } = editModal;
    try {
      if (isNew) {
        await addDoc(collection(db, 'bookings'), data);
      } else {
        const { id, ...updateData } = data;
        await updateDoc(doc(db, 'bookings', id), updateData);
      }
      setEditModal({ ...editModal, isOpen: false });
    } catch (e) {
      alert("儲存失敗");
    }
  };

  const confirmDelete = (id: string, type: 'flight' | 'stay' | 'other', title: string) => {
    setDeleteModal({ isOpen: true, targetId: id, targetType: type, title: title });
  };

  const openEdit = (id: string, type: 'flight' | 'stay' | 'other') => {
    const data = bookings.find(b => b.id === id);
    if (data) setEditModal({ isOpen: true, type, data: JSON.parse(JSON.stringify(data)), isNew: false });
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'bookings', deleteModal.targetId));
      setDeleteModal({ ...deleteModal, isOpen: false });
    } catch (e) {
      alert("刪除失敗");
    }
  };

  const handleUnlock = () => {
    if (inputPin === savedPin) setIsUnlocked(true);
    else alert(`PIN 碼錯誤！`);
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
          <Card className="relative z-10 w-full max-h-[80vh] overflow-y-auto no-scrollbar animate-fadeIn !p-8 shadow-2xl">
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
                  <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" placeholder="乘客姓名" value={editModal.data.passenger || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, passenger: e.target.value}})} />
                  <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" placeholder="座位編號" value={editModal.data.seat || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, seat: e.target.value}})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" placeholder="登機門" value={editModal.data.gate || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, gate: e.target.value}})} />
                    <input type="date" className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-sm font-bold text-center" value={editModal.data.date || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, date: e.target.value}})} />
                  </div>
                </>
              )}
              {editModal.type === 'stay' && (
                <>
                  <label className="text-[10px] font-black uppercase text-leaf-green block mb-1">飯店名稱</label>
                  <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-4 py-3 text-sm font-bold" value={editModal.data.title || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, title: e.target.value}})} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-xs font-bold" value={editModal.data.startDate || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, startDate: e.target.value}})} />
                    <input type="date" className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-3 py-2 text-xs font-bold" value={editModal.data.endDate || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, endDate: e.target.value}})} />
                  </div>
                  <input className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-4 py-3 text-sm font-bold" placeholder="地址" value={editModal.data.location || ''} onChange={e => setEditModal({...editModal, data: {...editModal.data, location: e.target.value}})} />
                  <input type="number" className="w-full bg-warm-beige/50 border-2 border-shadow-green rounded-xl px-4 py-3 text-lg font-black" value={editModal.data.cost || 0} onChange={e => setEditModal({...editModal, data: {...editModal.data, cost: Number(e.target.value)}})} />
                </>
              )}
              <div className="flex gap-3 pt-4">
                <Button variant="secondary" className="flex-1" onClick={() => setEditModal({...editModal, isOpen: false})}>取消</Button>
                <Button className="flex-1" onClick={handleSaveEntry}>儲存</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <SectionTitle title="航班資訊" icon={<i className="fas fa-plane-departure"></i>} />
      <div className="mb-10 space-y-6">
        {flights.length > 0 ? flights.map(f => (
          <FlightCard 
            key={f.id} id={f.id} airline={f.provider} flightNumber={f.title}
            origin={f.origin} destination={f.destination} passenger={f.passenger}
            classType={f.classType || "Economy"} gate={f.gate} seat={f.seat}
            date={f.date} duration={f.duration}
            suggestedDeparture={calculateDepartureSuggestion(f.origin?.time)}
            onDelete={() => confirmDelete(f.id, 'flight', f.title)} onEdit={() => openEdit(f.id, 'flight')}
          />
        )) : <p className="text-center text-xs opacity-30 italic py-10">尚無航班資訊</p>}
      </div>

      <SectionTitle title="住宿資訊" icon={<i className="fas fa-hotel"></i>} />
      <div className="space-y-6 mb-10">
        {stays.length > 0 ? stays.map(s => (
          <StayCard 
            key={s.id} id={s.id} hotelName={s.title} provider={s.provider}
            checkIn={s.startDate} checkOut={s.endDate}
            location={s.location} cost={s.cost} note={s.note}
            onDelete={() => confirmDelete(s.id, 'stay', s.title)} onEdit={() => openEdit(s.id, 'stay')}
          />
        )) : <p className="text-center text-xs opacity-30 italic py-10">尚無住宿資訊</p>}
      </div>

      <div className="w-full">
        <button onClick={() => openManualAdd('flight')} className="w-full py-8 border-4 border-dashed border-shadow-green/50 rounded-[2.5rem] flex flex-col items-center justify-center text-shadow-green hover:text-leaf-green bg-white/50 active:scale-95 transition-all">
          <div className="w-12 h-12 rounded-full bg-white shadow-soft border-2 border-shadow-green flex items-center justify-center mb-2">
            <i className="fas fa-pen-nib text-xl"></i>
          </div>
          <span className="font-black text-[10px] uppercase tracking-widest">手動新增預訂</span>
        </button>
      </div>
    </div>
  );
};

export default Bookings;
