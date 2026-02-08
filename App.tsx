
import React, { useState, useEffect } from 'react';
import { TabType, Trip, TripMember } from './types';
import Schedule from './tabs/Schedule';
import Bookings from './tabs/Bookings';
import Expense from './tabs/Expense';
import Planning from './tabs/Planning';
import Members from './tabs/Members';
import { Card, Button } from './components/UI';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc, collection, setDoc, query, where, deleteDoc } from 'firebase/firestore';

const CURRENT_USER_ID = 'user-admin';

const INITIAL_MEMBERS: TripMember[] = [
  { id: 'user-admin', name: '我 (Admin)', avatar: 'https://picsum.photos/seed/user1/100/100', isMe: true },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.SCHEDULE); 
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripId] = useState(() => localStorage.getItem('komorebi_current_trip_id') || '');
  const [members, setMembers] = useState<TripMember[]>(INITIAL_MEMBERS);
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTripData, setNewTripData] = useState({ name: '', destination: '', startDate: '', endDate: '' });

  // Join Link Logic
  const [joinModal, setJoinModal] = useState<{ isOpen: boolean; tripId: string; tripName: string }>({ isOpen: false, tripId: '', tripName: '' });
  const [joinPinInput, setJoinPinInput] = useState('');

  // 1. 偵測 URL 是否為邀請連結
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/join/')) {
      const targetTripId = path.split('/join/')[1];
      if (targetTripId) {
        const fetchInviteInfo = async () => {
          try {
            const tripRef = doc(db, 'trips', targetTripId);
            const tripSnap = await getDoc(tripRef);
            if (tripSnap.exists()) {
              setJoinModal({ isOpen: true, tripId: targetTripId, tripName: tripSnap.data().name });
            }
          } catch (e) {
            console.error("無法取得邀請資訊", e);
          }
        };
        fetchInviteInfo();
      }
    }
  }, []);

  // 2. 監聽「所有」相關旅程
  useEffect(() => {
    const q = query(collection(db, 'trips'));
    const unsub = onSnapshot(q, (snapshot) => {
      const tripsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
      setTrips(tripsData);
      
      // 如果目前沒有選定旅程且有可用旅程，自動選擇第一個
      if (!currentTripId && tripsData.length > 0) {
        const firstId = tripsData[0].id;
        setCurrentTripId(firstId);
        localStorage.setItem('komorebi_current_trip_id', firstId);
      }
    });

    return () => unsub();
  }, [currentTripId]);

  // 3. 監聽「目前選定」旅程的成員與詳細變化
  useEffect(() => {
    if (!currentTripId) return;

    const unsub = onSnapshot(doc(db, 'trips', currentTripId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        if (data.members) {
          setMembers(data.members.map((m: any) => ({ ...m, isMe: m.id === CURRENT_USER_ID })));
        }
      } else {
        // 如果當前旅程被刪除且沒有剩餘旅程，重置 ID
        if (trips.length <= 1) {
          setCurrentTripId('');
          localStorage.removeItem('komorebi_current_trip_id');
        }
      }
    });

    return () => unsub();
  }, [currentTripId, trips.length]);

  const activeTrip = trips.find(t => t.id === currentTripId);
  const isAdmin = activeTrip?.adminId === CURRENT_USER_ID;

  const handleJoinConfirm = async () => {
    if (!joinModal.tripId) return;
    
    try {
      const tripRef = doc(db, 'trips', joinModal.tripId);
      const tripSnap = await getDoc(tripRef);
      
      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        if (tripData.accessPin === joinPinInput) {
          const newUser: TripMember = {
            id: `guest-${Date.now()}`, 
            name: '新夥伴',
            avatar: `https://picsum.photos/seed/${Date.now()}/100/100`
          };
          
          await updateDoc(tripRef, {
            members: arrayUnion(newUser)
          });

          setCurrentTripId(joinModal.tripId);
          localStorage.setItem('komorebi_current_trip_id', joinModal.tripId);
          setJoinModal({ ...joinModal, isOpen: false });
          window.history.replaceState({}, '', '/'); 
          alert(`歡迎加入 ${joinModal.tripName}！`);
        } else {
          alert('密碼錯誤唷，請再試一次！');
        }
      }
    } catch (e) {
      alert("加入失敗，請檢查網路連線");
    }
  };

  const updateTripPin = async (newPin: string) => {
    if (!currentTripId) return;
    const tripRef = doc(db, 'trips', currentTripId);
    await updateDoc(tripRef, { accessPin: newPin });
  };

  const updateMember = async (id: string, updates: Partial<TripMember>) => {
    if (!currentTripId) return;
    const newMembers = members.map(m => m.id === id ? { ...m, ...updates } : m);
    const tripRef = doc(db, 'trips', currentTripId);
    await updateDoc(tripRef, { members: newMembers });
  };

  const handleCreateTrip = async () => {
    if (!newTripData.name || !newTripData.destination || !newTripData.startDate || !newTripData.endDate) {
      return alert('請完整填寫旅程資訊唷！');
    }
    
    setIsCreating(true);
    const id = `trip-${Date.now()}`;
    const newTripObj: any = {
      id: id,
      name: newTripData.name,
      destination: newTripData.destination,
      startDate: newTripData.startDate,
      endDate: newTripData.endDate,
      adminId: CURRENT_USER_ID,
      accessPin: '0000',
      members: INITIAL_MEMBERS
    };
    
    try {
      await setDoc(doc(db, 'trips', id), newTripObj);
      setCurrentTripId(id);
      localStorage.setItem('komorebi_current_trip_id', id);
      setShowCreateForm(false);
      setShowTripSelector(false);
      setActiveTab(TabType.SCHEDULE);
      setNewTripData({ name: '', destination: '', startDate: '', endDate: '' });
    } catch (e) {
      alert("建立失敗：" + e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTrip = async (e: React.MouseEvent, tripToDeleteId: string, tripName: string, adminId?: string) => {
    e.stopPropagation(); // 阻止觸發選擇旅程
    
    if (adminId && adminId !== CURRENT_USER_ID) {
      return alert('只有管理員可以刪除此旅程唷！');
    }

    if (confirm(`確定要刪除「${tripName}」嗎？此動作將刪除雲端所有相關資料且無法復原。`)) {
      try {
        await deleteDoc(doc(db, 'trips', tripToDeleteId));
        
        // 如果刪除的是當前正在查看的旅程，嘗試切換到下一個
        if (currentTripId === tripToDeleteId) {
          const remainingTrips = trips.filter(t => t.id !== tripToDeleteId);
          if (remainingTrips.length > 0) {
            const nextId = remainingTrips[0].id;
            setCurrentTripId(nextId);
            localStorage.setItem('komorebi_current_trip_id', nextId);
          } else {
            setCurrentTripId('');
            localStorage.removeItem('komorebi_current_trip_id');
          }
        }
        alert('旅程已成功移除。');
      } catch (err) {
        console.error("Delete Error:", err);
        alert('刪除失敗，請檢查權權或網路連線。');
      }
    }
  };

  const selectTrip = (id: string) => {
    setCurrentTripId(id);
    localStorage.setItem('komorebi_current_trip_id', id);
    setShowTripSelector(false);
    setActiveTab(TabType.SCHEDULE);
  };

  if (!currentTripId && trips.length === 0 && !joinModal.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-warm-beige">
        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-soft border-2 border-shadow-green flex items-center justify-center text-leaf-green mb-8 animate-bounce-soft">
          <i className="fas fa-map-location-dot text-4xl"></i>
        </div>
        <h1 className="text-2xl font-black text-earth-brown mb-8">開始你的第一趟旅程</h1>
        <Button onClick={() => setShowCreateForm(true)}>建立新旅程</Button>
        
        {showCreateForm && (
           <div className="fixed inset-0 z-[200] bg-earth-brown/50 backdrop-blur-md flex items-center justify-center p-6">
              <Card className="w-full max-w-sm animate-tripSelectorIn !p-8">
                <h2 className="text-xl font-black text-earth-brown mb-6">填寫旅程資訊</h2>
                <div className="space-y-4 text-left">
                  <div>
                    <label className="text-[10px] font-black uppercase text-leaf-green ml-1 mb-1 block">旅程名稱</label>
                    <input placeholder="例如：東京跨年之旅" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={newTripData.name} onChange={e => setNewTripData({...newTripData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-leaf-green ml-1 mb-1 block">目的地</label>
                    <input placeholder="例如：日本 東京" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={newTripData.destination} onChange={e => setNewTripData({...newTripData, destination: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black uppercase text-leaf-green ml-1 mb-1 block">開始日期</label>
                      <input type="date" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-3 py-3 text-xs font-bold" value={newTripData.startDate} onChange={e => setNewTripData({...newTripData, startDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-leaf-green ml-1 mb-1 block">結束日期</label>
                      <input type="date" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-3 py-3 text-xs font-bold" value={newTripData.endDate} onChange={e => setNewTripData({...newTripData, endDate: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowCreateForm(false)} disabled={isCreating}>取消</Button>
                    <Button className="flex-1" onClick={handleCreateTrip} disabled={isCreating}>
                      {isCreating ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}建立
                    </Button>
                  </div>
                </div>
              </Card>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen relative flex flex-col bg-warm-beige">
      {showTripSelector && (
        <div className="fixed inset-0 z-[150] bg-earth-brown/40 backdrop-blur-md flex items-end justify-center">
          <div className="fixed inset-0" onClick={() => setShowTripSelector(false)}></div>
          <Card className="relative z-10 w-full max-w-md animate-tripSelectorIn !p-8 !rounded-t-[3rem] !rounded-b-none border-b-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-earth-brown">切換旅程</h3>
              <button onClick={() => setShowCreateForm(true)} className="w-10 h-10 bg-leaf-green text-white rounded-xl shadow-soft flex items-center justify-center active:scale-90 transition-all"><i className="fas fa-plus"></i></button>
            </div>
            <div className="space-y-3 max-h-[50vh] overflow-y-auto no-scrollbar pb-4">
              {trips.length > 0 ? trips.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => selectTrip(t.id)}
                  className={`p-4 rounded-2xl border-2 flex justify-between items-center cursor-pointer group transition-all ${t.id === currentTripId ? 'bg-leaf-green border-leaf-green text-white shadow-soft' : 'bg-white border-shadow-green text-earth-brown hover:border-leaf-green/50'}`}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm truncate">{t.name}</h4>
                    <p className={`text-[9px] uppercase font-bold truncate ${t.id === currentTripId ? 'text-white/70' : 'text-shadow-green'}`}>{t.destination} | {t.startDate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {t.id === currentTripId ? (
                      <i className="fas fa-check-circle"></i>
                    ) : (
                      // 只有管理員可以刪除旅程
                      t.adminId === CURRENT_USER_ID && (
                        <button 
                          onClick={(e) => handleDeleteTrip(e, t.id, t.name, t.adminId)}
                          className="w-8 h-8 rounded-lg bg-red-100 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400 hover:text-white"
                        >
                          <i className="fas fa-trash-can text-xs"></i>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-center py-10 text-xs opacity-30 italic">目前沒有旅程</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {showCreateForm && (
        <div className="fixed inset-0 z-[200] bg-earth-brown/50 backdrop-blur-md flex items-center justify-center p-6">
           <Card className="w-full max-w-sm animate-fadeIn !p-8">
             <h2 className="text-xl font-black text-earth-brown mb-6">建立新旅程</h2>
             <div className="space-y-4 text-left">
                <div>
                    <label className="text-[10px] font-black uppercase text-leaf-green ml-1 mb-1 block">旅程名稱</label>
                    <input placeholder="例如：日本滑雪之旅" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={newTripData.name} onChange={e => setNewTripData({...newTripData, name: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-leaf-green ml-1 mb-1 block">目的地</label>
                    <input placeholder="例如：北海道" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={newTripData.destination} onChange={e => setNewTripData({...newTripData, destination: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] font-black uppercase text-leaf-green ml-1 mb-1 block">開始日期</label>
                        <input type="date" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-3 py-3 text-xs font-bold" value={newTripData.startDate} onChange={e => setNewTripData({...newTripData, startDate: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-leaf-green ml-1 mb-1 block">結束日期</label>
                        <input type="date" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-3 py-3 text-xs font-bold" value={newTripData.endDate} onChange={e => setNewTripData({...newTripData, endDate: e.target.value})} />
                    </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="secondary" className="flex-1" onClick={() => setShowCreateForm(false)}>取消</Button>
                  <Button className="flex-1" onClick={handleCreateTrip}>建立</Button>
                </div>
             </div>
           </Card>
        </div>
      )}

      {joinModal.isOpen && (
        <div className="fixed inset-0 z-[300] bg-earth-brown/60 backdrop-blur-lg flex items-center justify-center p-8">
          <Card className="w-full max-w-[300px] text-center !p-8 animate-tripSelectorIn">
            <div className="w-16 h-16 bg-accent-orange/10 text-accent-orange rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-accent-orange/20">
              <i className="fas fa-envelope-open-text text-2xl"></i>
            </div>
            <h3 className="text-lg font-black text-earth-brown mb-2">夥伴邀請！</h3>
            <p className="text-xs text-shadow-green font-bold mb-6">你受邀加入「{joinModal.tripName}」</p>
            <div className="mb-6">
              <label className="text-[9px] font-black text-leaf-green uppercase block mb-1">輸入 4 位數入團密碼</label>
              <input type="password" maxLength={4} placeholder="••••" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 text-center text-xl font-black outline-none focus:border-leaf-green shadow-inner" value={joinPinInput} onChange={e => setJoinPinInput(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={handleJoinConfirm}>確認加入</Button>
              <button onClick={() => setJoinModal({ ...joinModal, isOpen: false })} className="text-[10px] font-bold text-shadow-green uppercase mt-2">暫時不用</button>
            </div>
          </Card>
        </div>
      )}

      <header className="sticky top-0 z-[60] bg-warm-beige/95 backdrop-blur-md px-6 py-5 flex justify-between items-center border-b-2 border-shadow-green/30">
        <div className="cursor-pointer group active:scale-95 transition-transform" onClick={() => setShowTripSelector(!showTripSelector)}>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tighter text-earth-brown leading-none">{activeTrip?.name || '加載中...'}</h1>
            <i className={`fas fa-chevron-down text-[10px] text-leaf-green transition-transform duration-300 ${showTripSelector ? 'rotate-180' : ''}`}></i>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-leaf-green flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-leaf-green animate-pulse"></span>
            {activeTrip?.startDate?.replace(/-/g, '/') || '----/--/--'} - {activeTrip?.endDate?.replace(/-/g, '/') || '----/--/--'}
          </p>
        </div>
      </header>

      <main className="flex-1 px-5 pt-6 overflow-y-auto no-scrollbar">
        {activeTrip ? (
           <>
            {activeTab === TabType.SCHEDULE && <Schedule trip={activeTrip} />}
            {activeTab === TabType.BOOKINGS && <Bookings trip={activeTrip} />}
            {activeTab === TabType.EXPENSE && <Expense trip={activeTrip} members={members} />}
            {activeTab === TabType.PLANNING && <Planning trip={activeTrip} members={members} />}
            {activeTab === TabType.MEMBERS && <Members trip={activeTrip} members={members} onUpdateMember={updateMember} isAdmin={isAdmin} onUpdatePin={updateTripPin} />}
           </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-earth-brown/30">
            <i className="fas fa-spinner fa-spin text-3xl mb-4"></i>
            <p className="text-xs font-bold">正在同步雲端資料...</p>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t-2 border-shadow-green px-4 pt-3 pb-8 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(96,77,63,0.08)]">
        {[
          { type: TabType.SCHEDULE, label: '行程', icon: 'fa-calendar-days' },
          { type: TabType.BOOKINGS, label: '預訂', icon: 'fa-ticket' },
          { type: TabType.EXPENSE, label: '記帳', icon: 'fa-coins' },
          { type: TabType.PLANNING, label: '準備', icon: 'fa-clipboard-check' },
          { type: TabType.MEMBERS, label: '成員', icon: 'fa-user-group' },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => setActiveTab(item.type)}
            className={`flex flex-col items-center gap-1 transition-all relative ${activeTab === item.type ? 'text-leaf-green scale-110' : 'text-earth-brown opacity-30'}`}
          >
            <div className={`p-2 rounded-2xl transition-all ${activeTab === item.type ? 'bg-leaf-green/10' : ''}`}>
              <i className={`fas ${item.icon} text-lg`}></i>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
          </button>
        ))}
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tripSelectorIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-tripSelectorIn { animation: tripSelectorIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes bounce-soft { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-bounce-soft { animation: bounce-soft 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default App;
