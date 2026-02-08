
import React, { useState, useRef } from 'react';
import { Card, SectionTitle, Button } from '../components/UI';
import { TripMember, Trip } from '../types';

interface MembersProps {
  trip: Trip;
  members: TripMember[];
  onUpdateMember: (id: string, updates: Partial<TripMember>) => void;
  isAdmin: boolean;
  onUpdatePin: (newPin: string) => void;
  onInstall?: () => void;
  showInstallButton?: boolean;
}

const Members: React.FC<MembersProps> = ({ 
  trip, 
  members, 
  onUpdateMember, 
  isAdmin, 
  onUpdatePin, 
  onInstall, 
  showInstallButton 
}) => {
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [tempPin, setTempPin] = useState(trip.accessPin || '');
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Profile Editing State
  const [editingMember, setEditingMember] = useState<TripMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);

  const handleSavePin = () => {
    if (tempPin.length < 1) return alert('密碼不能為空唷！');
    onUpdatePin(tempPin);
    setIsEditingPin(false);
    alert('入團密碼已更新！');
  };

  const handleInstallProcess = () => {
    if (isIos) {
      setShowIosGuide(true);
    } else {
      onInstall?.();
    }
  };

  const handleCopyLink = () => {
    // 動態生成邀請網址
    const inviteUrl = `${window.location.origin}/join/${trip.id}`;
    
    // 使用 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('複製失敗: ', err);
        fallbackCopyTextToClipboard(inviteUrl);
      });
    } else {
      fallbackCopyTextToClipboard(inviteUrl);
    }
  };

  // 備援複製方案 (針對舊款瀏覽器或特殊環境)
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('自動複製失敗，請手動複製連結唷。');
    }
    document.body.removeChild(textArea);
  };

  const openEditProfile = (member: TripMember) => {
    if (!member.isMe) return;
    setEditingMember(member);
    setEditName(member.name);
    setEditAvatar(member.avatar);
  };

  const handleSaveProfile = () => {
    if (editingMember) {
      onUpdateMember(editingMember.id, {
        name: editName,
        avatar: editAvatar
      });
      setEditingMember(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="pb-24 animate-fadeIn">
      <SectionTitle title="旅行夥伴" icon={<i className="fas fa-users"></i>} />
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        {members.map(member => (
          <Card 
            key={member.id} 
            className={`text-center relative cursor-pointer group ${member.isMe ? 'hover:border-leaf-green/50' : ''}`}
            onClick={() => member.isMe && openEditProfile(member)}
          >
            {member.id === trip.adminId && (
              <div className="absolute top-2 right-2">
                <i className="fas fa-crown text-accent-orange text-[10px]"></i>
              </div>
            )}
            
            {member.isMe && (
              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="fas fa-pen text-[8px] text-leaf-green"></i>
              </div>
            )}

            <div className="relative inline-block mb-3">
              <img 
                src={member.avatar} 
                alt={member.name} 
                className={`w-16 h-16 rounded-full border-4 shadow-soft mx-auto object-cover ${member.isMe ? 'border-leaf-green' : 'border-shadow-green'}`} 
              />
              {member.isMe && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-leaf-green rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">
                  <i className="fas fa-check"></i>
                </div>
              )}
            </div>
            <h4 className="font-black text-sm mb-1 truncate px-2">{member.name}</h4>
          </Card>
        ))}
      </div>

      {/* Profile Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-earth-brown/60 backdrop-blur-sm" onClick={() => setEditingMember(null)}></div>
          <Card className="relative z-10 w-full animate-fadeIn !p-8">
            <h3 className="text-xl font-black text-earth-brown mb-6 text-center">修改個人資料</h3>
            
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img 
                  src={editAvatar} 
                  className="w-24 h-24 rounded-full border-4 border-leaf-green shadow-soft object-cover" 
                  alt="Avatar" 
                />
                <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fas fa-camera text-white text-xl"></i>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              <p className="text-[10px] font-black text-leaf-green uppercase tracking-widest">點擊更換頭像</p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-shadow-green mb-1 block">名字 NAME</label>
                <input 
                  type="text" 
                  className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-leaf-green shadow-inner"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setEditingMember(null)}>取消</Button>
              <Button className="flex-1" onClick={handleSaveProfile}>儲存</Button>
            </div>
          </Card>
        </div>
      )}

      <SectionTitle title="旅程安全與邀請" icon={<i className="fas fa-shield-halved"></i>} />
      
      <Card className="bg-earth-brown text-white mb-6 overflow-hidden">
        <div className="p-1">
          <h3 className="font-black mb-2 flex items-center gap-2">
            <i className="fas fa-link"></i> 邀請新成員
          </h3>
          <p className="text-[10px] opacity-70 mb-4 leading-relaxed">
            分享邀請網址給夥伴，他們在加入時需要輸入您設定的 <span className="underline decoration-accent-orange">入團密碼</span> 才能進入此旅程。
          </p>
          
          <div className="bg-white/10 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border border-white/5 relative group/link">
            <div className="flex-1 min-w-0 w-full">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-accent-orange mb-1">邀請連結 (點擊文字也可複製)</p>
              <code 
                onClick={handleCopyLink}
                className="text-[10px] font-black text-leaf-green break-all cursor-pointer block hover:text-white transition-colors"
              >
                {window.location.origin}/join/{trip.id}
              </code>
            </div>
            <button 
              onClick={handleCopyLink}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                copied 
                  ? 'bg-leaf-green text-white shadow-[0_0_15px_rgba(136,164,124,0.4)]' 
                  : 'bg-white text-earth-brown shadow-soft active:scale-95'
              }`}
            >
              {copied ? <><i className="fas fa-check mr-1"></i> 已複製</> : <><i className="fas fa-copy mr-1"></i> 複製連結</>}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent-orange mb-3">入團密碼設定</p>
            
            {isAdmin ? (
              <div className="space-y-3">
                {isEditingPin ? (
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      maxLength={4}
                      className="flex-1 bg-white border-2 border-leaf-green rounded-xl px-4 py-2 text-earth-brown font-black text-center tracking-widest outline-none"
                      value={tempPin}
                      onChange={(e) => setTempPin(e.target.value.replace(/\D/g, ''))}
                    />
                    <Button className="!py-2 !px-4 !bg-leaf-green" onClick={handleSavePin}>儲存</Button>
                    <button className="text-white opacity-60 text-xs px-2" onClick={() => { setIsEditingPin(false); setTempPin(trip.accessPin || ''); }}>取消</button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <i className="fas fa-key text-accent-orange text-xs"></i>
                      </div>
                      <div>
                        <p className="text-[8px] opacity-50 font-bold uppercase">目前密碼</p>
                        <p className="font-black tracking-widest text-sm">{trip.accessPin || '未設定'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsEditingPin(true)}
                      className="text-[10px] font-black uppercase text-accent-orange bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-all"
                    >
                      修改密碼
                    </button>
                  </div>
                )}
                <p className="text-[9px] opacity-40 italic mt-2">
                  <i className="fas fa-info-circle mr-1"></i> 您是管理員 (Admin)，只有您可以修改此密碼。
                </p>
              </div>
            ) : (
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-center">
                <i className="fas fa-lock text-white/20 text-2xl mb-2"></i>
                <p className="text-[10px] font-bold opacity-60">您無權查看或修改入團密碼</p>
                <p className="text-[8px] opacity-40 mt-1 uppercase tracking-widest">Only Admin can manage access</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* PWA Install Section */}
      <div className="mb-6">
        <SectionTitle title="旅程工具" icon={<i className="fas fa-toolbox"></i>} />
        <Card className="bg-leaf-green/10 border-dashed border-leaf-green flex items-center justify-between p-6">
          <div className="flex-1 pr-4">
            <h4 className="text-sm font-black text-earth-brown mb-1">將旅程加入手機桌面</h4>
            <p className="text-[10px] text-earth-brown/60 leading-relaxed font-medium">
              一鍵開啟旅程，離線也能查看行程，體驗更順暢！
            </p>
          </div>
          <button 
            onClick={handleInstallProcess}
            className="w-16 h-16 bg-white rounded-[1.5rem] shadow-soft border-2 border-leaf-green flex flex-col items-center justify-center text-leaf-green hover:bg-leaf-green hover:text-white transition-all active:scale-95 group animate-pulse-soft"
          >
            <i className="fas fa-mobile-screen-button text-xl mb-1 group-hover:scale-110 transition-transform"></i>
            <span className="text-[8px] font-black uppercase tracking-tighter">Install</span>
          </button>
        </Card>
      </div>

      {/* iOS Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
          <div className="fixed inset-0 bg-earth-brown/60 backdrop-blur-sm" onClick={() => setShowIosGuide(false)}></div>
          <Card className="relative z-10 w-full animate-fadeIn !p-8 text-center">
            <div className="w-16 h-16 bg-warm-beige rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-shadow-green shadow-soft">
              <i className="fab fa-apple text-3xl text-earth-brown"></i>
            </div>
            <h3 className="text-lg font-black text-earth-brown mb-4">加入 iOS 桌面</h3>
            <div className="space-y-4 text-left bg-warm-beige/50 p-4 rounded-2xl border border-shadow-green">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-leaf-green text-white text-[10px] flex items-center justify-center font-black">1</div>
                <p className="text-xs font-bold text-earth-brown">點擊瀏覽器下方的 <i className="fa-solid fa-arrow-up-from-bracket text-blue-500 mx-1"></i> [分享]</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-leaf-green text-white text-[10px] flex items-center justify-center font-black">2</div>
                <p className="text-xs font-bold text-earth-brown">向上滑動找到並點擊 [加入主畫面]</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-leaf-green text-white text-[10px] flex items-center justify-center font-black">3</div>
                <p className="text-xs font-bold text-earth-brown">點擊右上角的 [新增] 即可完成！</p>
              </div>
            </div>
            <Button className="w-full mt-6" onClick={() => setShowIosGuide(false)}>我知道了</Button>
          </Card>
        </div>
      )}

      <Button variant="secondary" className="w-full !border-red-100 !text-red-400 mt-4">
        <i className="fas fa-sign-out-alt mr-2"></i>退出此旅程
      </Button>

      <style>{`
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-pulse-soft {
          animation: pulse-soft 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Members;
