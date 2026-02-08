
import React, { useState, useEffect } from 'react';
import { TabType, Trip, TripMember } from './types';
import Schedule from './tabs/Schedule';
import Bookings from './tabs/Bookings';
import Expense from './tabs/Expense';
import Planning from './tabs/Planning';
import Members from './tabs/Members';
import { Card, Button } from './components/UI';

// 模擬目前登入的使用者
const CURRENT_USER_ID = 'user-admin';

const INITIAL_TRIPS: Trip[] = [
  { 
    id: 'trip-1', 
    name: '東京賞櫻之旅', 
    startDate: '2024-03-31', 
    endDate: '2024-04-07', 
    destination: '東京',
    accessPin: '888',
    adminId: 'user-admin'
  },
  { 
    id: 'trip-2', 
    name: '京都五月散策', 
    startDate: '2024-05-01', 
    endDate: '2024-05-10', 
    destination: '京都',
    accessPin: '555',
    adminId: 'other-user'
  },
];

const INITIAL_MEMBERS: TripMember[] = [
  { id: 'user-admin', name: '我 (Admin)', avatar: 'https://picsum.photos/seed/user1/100/100', isMe: true },
  { id: '2', name: '小明', avatar: 'https://picsum.photos/seed/user2/100/100' },
  { id: '3', name: '小美', avatar: 'https://picsum.photos/seed/user3/100/100' },
  { id: '4', name: '阿強', avatar: 'https://picsum.photos/seed/user4/100/100' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.SCHEDULE); 
  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('komorebi_trips');
    return saved ? JSON.parse(saved) : INITIAL_TRIPS;
  });
  const [currentTripId, setCurrentTripId] = useState(() => {
    return localStorage.getItem('komorebi_current_trip_id') || trips[0].id;
  });
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTripData, setNewTripData] = useState({
    name: '',
    destination: '',
    startDate: '',
    endDate: ''
  });

  const [members, setMembers] = useState<TripMember[]>(() => {
    const saved = localStorage.getItem('komorebi_trip_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('komorebi_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('komorebi_current_trip_id', currentTripId);
  }, [currentTripId]);

  useEffect(() => {
    localStorage.setItem('komorebi_trip_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const activeTrip = trips.find(t => t.id === currentTripId) || trips[0];
  const isAdmin = activeTrip.adminId === CURRENT_USER_ID;

  const updateTripPin = (newPin: string) => {
    setTrips(prev => prev.map(t => t.id === currentTripId ? { ...t, accessPin: newPin } : t));
  };

  const updateMember = (id: string, updates: Partial<TripMember>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleCreateTrip = () => {
    if (!newTripData.name || !newTripData.destination || !newTripData.startDate || !newTripData.endDate) {
      return alert('請完整填寫旅程資訊唷！');
    }
    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      name: newTripData.name,
      destination: newTripData.destination,
      startDate: newTripData.startDate,
      endDate: newTripData.endDate,
      adminId: CURRENT_USER_ID,
      accessPin: '000'
    };
    setTrips(prev => [...prev, newTrip]);
    setCurrentTripId(newTrip.id);
    setShowCreateForm(false);
    setShowTripSelector(false);
    setNewTripData({ name: '', destination: '', startDate: '', endDate: '' });
  };

  const renderContent = () => {
    switch (activeTab) {
      case TabType.SCHEDULE: return <Schedule trip={activeTrip} />;
      case TabType.BOOKINGS: return <Bookings />;
      case TabType.EXPENSE: return <Expense trip={activeTrip} members={members} />;
      case TabType.PLANNING: return <Planning members={members} />;
      case TabType.MEMBERS: return (
        <Members 
          trip={activeTrip} 
          members={members}
          onUpdateMember={updateMember}
          isAdmin={isAdmin} 
          onUpdatePin={updateTripPin} 
          onInstall={handleInstallClick}
          showInstallButton={!!deferredPrompt || /iPhone|iPad|iPod/.test(navigator.userAgent)}
        />
      );
      default: return <Schedule trip={activeTrip} />;
    }
  };

  const navItems = [
    { type: TabType.SCHEDULE, label: '行程', icon: 'fa-calendar-days' },
    { type: TabType.BOOKINGS, label: '預訂', icon: 'fa-ticket' },
    { type: TabType.EXPENSE, label: '記帳', icon: 'fa-coins' },
    { type: TabType.PLANNING, label: '準備', icon: 'fa-clipboard-check' },
    { type: TabType.MEMBERS, label: '成員', icon: 'fa-user-group' },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen relative flex flex-col bg-warm-beige">
      {/* 統一頂部標題列 (固定) */}
      <header className="sticky top-0 z-[60] bg-warm-beige/95 backdrop-blur-md px-6 py-5 flex justify-between items-center border-b-2 border-shadow-green/30">
        <div 
          className="cursor-pointer group active:scale-95 transition-transform"
          onClick={() => setShowTripSelector(!showTripSelector)}
        >
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tighter text-earth-brown leading-none">
              {activeTrip.name}
            </h1>
            <i className={`fas fa-chevron-down text-[10px] text-leaf-green transition-transform duration-300 ${showTripSelector ? 'rotate-180' : ''}`}></i>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-leaf-green flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-leaf-green animate-pulse"></span>
            {activeTrip.startDate.replace(/-/g, '/')} - {activeTrip.endDate.replace(/-/g, '/')}
          </p>
        </div>
        <div className="w-11 h-11 rounded-[1.2rem] bg-white shadow-soft border-2 border-shadow-green flex items-center justify-center text-leaf-green hover:bg-leaf-green hover:text-white transition-all cursor-pointer active:scale-90">
          <i className="fas fa-bell text-lg"></i>
        </div>
      </header>

      {/* Trip Selector Overlay */}
      {showTripSelector && (
        <div className="fixed inset-0 z-[100] bg-earth-brown/50 backdrop-blur-md animate-fadeIn flex items-end">
          <div className="fixed inset-0" onClick={() => setShowTripSelector(false)}></div>
          <div className="bg-warm-beige w-full max-w-md mx-auto rounded-t-[3rem] p-8 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] relative z-10 max-h-[85vh] overflow-y-auto no-scrollbar border-t-4 border-shadow-green animate-tripSelectorIn">
            <div className="w-12 h-1.5 bg-shadow-green rounded-full mx-auto mb-8 opacity-50"></div>
            
            {!showCreateForm ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-earth-brown">切換旅程</h2>
                  <button 
                    onClick={() => setShowCreateForm(true)}
                    className="text-leaf-green font-black text-xs uppercase tracking-widest flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border-2 border-shadow-green shadow-soft active:scale-95"
                  >
                    <i className="fas fa-plus"></i> 新增旅程
                  </button>
                </div>
                
                <div className="space-y-4">
                  {trips.map(trip => (
                    <Card 
                      key={trip.id}
                      onClick={() => { setCurrentTripId(trip.id); setShowTripSelector(false); }}
                      className={`!p-6 border-2 transition-all ${currentTripId === trip.id ? 'border-leaf-green bg-leaf-green/5' : 'border-shadow-green'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-black text-earth-brown mb-1">{trip.name}</h3>
                          <p className="text-[10px] font-bold text-shadow-green uppercase tracking-widest">
                            <i className="fas fa-map-pin mr-1"></i> {trip.destination}
                          </p>
                          <p className="text-[10px] font-bold text-leaf-green mt-1">
                            {trip.startDate.replace(/-/g, '.')} - {trip.endDate.replace(/-/g, '.')}
                          </p>
                        </div>
                        {currentTripId === trip.id && (
                          <div className="w-8 h-8 rounded-full bg-leaf-green text-white flex items-center justify-center">
                            <i className="fas fa-check"></i>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                <button 
                  onClick={() => setShowTripSelector(false)}
                  className="w-full mt-8 py-4 text-[10px] font-black uppercase tracking-widest text-shadow-green"
                >
                  取消
                </button>
              </>
            ) : (
              <div className="animate-fadeIn">
                <h2 className="text-xl font-black text-earth-brown mb-6">建立新旅程</h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">旅程名稱 TRIP NAME</label>
                    <input 
                      type="text" 
                      placeholder="例如：北海道冬之祭典"
                      className="w-full bg-white border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-leaf-green shadow-inner"
                      value={newTripData.name}
                      onChange={e => setNewTripData({...newTripData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">目的地 DESTINATION</label>
                    <input 
                      type="text" 
                      placeholder="例如：札幌"
                      className="w-full bg-white border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-leaf-green shadow-inner"
                      value={newTripData.destination}
                      onChange={e => setNewTripData({...newTripData, destination: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">開始日期 START</label>
                      <input 
                        type="date" 
                        className="w-full bg-white border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-leaf-green shadow-inner"
                        value={newTripData.startDate}
                        onChange={e => setNewTripData({...newTripData, startDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">結束日期 END</label>
                      <input 
                        type="date" 
                        className="w-full bg-white border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-leaf-green shadow-inner"
                        value={newTripData.endDate}
                        onChange={e => setNewTripData({...newTripData, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowCreateForm(false)}>返回</Button>
                    <Button className="flex-2" onClick={handleCreateTrip}>建立旅程</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-5 pt-6 overflow-y-auto no-scrollbar">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t-2 border-shadow-green px-4 pt-3 pb-8 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(96,77,63,0.08)]">
        {navItems.map((item) => (
          <button
            key={item.type}
            onClick={() => setActiveTab(item.type)}
            className={`flex flex-col items-center gap-1 transition-all relative ${
              activeTab === item.type ? 'text-leaf-green scale-110' : 'text-earth-brown opacity-30'
            }`}
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
