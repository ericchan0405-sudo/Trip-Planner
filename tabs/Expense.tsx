
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, SectionTitle, Button } from '../components/UI';
import { CURRENCIES } from '../constants';
import { TripMember, Trip } from '../types';

interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  payers: Record<string, number>; // ID -> Amount Paid
  splitIds: string[];
  receipt?: string; // Base64 image string
}

interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed';
  date: string;
}

interface ExpenseProps {
  trip: Trip;
  members: TripMember[];
}

const Expense: React.FC<ExpenseProps> = ({ trip, members }) => {
  const [activeTab, setActiveTab] = useState<'group' | 'private' | 'settle'>('group');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState<{id: string, name: string, currency: string} | null>(null);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Storage Keys
  const storageKeyGroup = `komorebi_group_expenses_${trip.id}`;
  const storageKeyPrivate = `komorebi_private_expenses_${trip.id}`;
  const storageKeySettlements = `komorebi_settlements_${trip.id}`;

  const [groupExpenses, setGroupExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem(storageKeyGroup);
    return saved ? JSON.parse(saved) : [
      { id: '1', date: '2024/03/31', description: '敘敘苑燒肉', amount: 12000, currency: 'JPY', payers: { '2': 12000 }, splitIds: ['user-admin', '2', '3', '4'] },
      { id: '2', date: '2024/04/01', description: '新宿飯店', amount: 45000, currency: 'JPY', payers: { 'user-admin': 45000 }, splitIds: ['user-admin', '2', '3', '4'] },
    ];
  });

  const [privateExpenses, setPrivateExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem(storageKeyPrivate);
    return saved ? JSON.parse(saved) : [];
  });

  const [settlements, setSettlements] = useState<Settlement[]>(() => {
    const saved = localStorage.getItem(storageKeySettlements);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(storageKeyGroup, JSON.stringify(groupExpenses));
  }, [groupExpenses, storageKeyGroup]);

  useEffect(() => {
    localStorage.setItem(storageKeyPrivate, JSON.stringify(privateExpenses));
  }, [privateExpenses, storageKeyPrivate]);

  useEffect(() => {
    localStorage.setItem(storageKeySettlements, JSON.stringify(settlements));
  }, [settlements, storageKeySettlements]);

  // Form State
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'JPY',
    description: '',
    payers: { 'user-admin': 0 } as Record<string, number>,
    splitIds: members.map(m => m.id),
    receipt: undefined as string | undefined
  });

  const perPersonAmount = useMemo(() => {
    const total = parseFloat(formData.amount) || 0;
    const count = formData.splitIds.length;
    return count > 0 ? Math.floor(total / count) : 0;
  }, [formData.amount, formData.splitIds]);

  const handleToggleSplitter = (id: string) => {
    setFormData(prev => ({
      ...prev,
      splitIds: prev.splitIds.includes(id) ? prev.splitIds.filter(sid => sid !== id) : [...prev.splitIds, id]
    }));
  };

  const handleTogglePayer = (id: string) => {
    setFormData(prev => {
      const newPayers = { ...prev.payers };
      if (newPayers[id] !== undefined) {
        delete newPayers[id];
      } else {
        const total = parseFloat(prev.amount) || 0;
        const currentPaidSum = (Object.values(newPayers) as number[]).reduce((a, b) => a + Number(b), 0);
        newPayers[id] = Math.max(0, total - currentPaidSum);
      }
      return { ...prev, payers: newPayers };
    });
  };

  const handlePayerAmountChange = (id: string, val: string) => {
    setFormData(prev => ({
      ...prev,
      payers: { ...prev.payers, [id]: parseFloat(val) || 0 }
    }));
  };

  const handleEditClick = (item: ExpenseItem) => {
    setEditingItem(item);
    setFormData({
      amount: item.amount.toString(),
      currency: item.currency,
      description: item.description,
      payers: { ...item.payers },
      splitIds: item.splitIds,
      receipt: item.receipt
    });
    setShowAddModal(true);
  };

  const handleSaveExpense = () => {
    if (!formData.amount && !formData.description && !formData.receipt) {
      setShowAddModal(false);
      setEditingItem(null);
      resetFormData();
      return;
    }

    if (!formData.amount || !formData.description) return alert('請輸入品項與金額唷！');
    
    const totalInput = parseFloat(formData.amount) || 0;
    const isPrivate = activeTab === 'private';
    const finalPayers = isPrivate ? { 'user-admin': totalInput } : formData.payers;
    const finalSplitIds = isPrivate ? ['user-admin'] : formData.splitIds;

    const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const newItem: ExpenseItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      date: editingItem ? editingItem.date : today,
      description: formData.description,
      amount: totalInput,
      currency: formData.currency,
      payers: finalPayers,
      splitIds: finalSplitIds,
      receipt: formData.receipt
    };

    if (isPrivate) {
      if (editingItem) setPrivateExpenses(prev => prev.map(item => item.id === editingItem.id ? newItem : item));
      else setPrivateExpenses([newItem, ...privateExpenses]);
    } else {
      if (editingItem) setGroupExpenses(prev => prev.map(item => item.id === editingItem.id ? newItem : item));
      else setGroupExpenses([newItem, ...groupExpenses]);
    }
    
    setShowAddModal(false);
    setEditingItem(null);
    resetFormData();
  };

  const resetFormData = () => {
    setFormData({ amount: '', currency: 'JPY', description: '', payers: { 'user-admin': 0 }, splitIds: members.map(m => m.id), receipt: undefined });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, receipt: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Settlement Logic
  const consolidatedSettlement = useMemo(() => {
    const memberBalances: Record<string, { debt: number, credit: number, currency: string }> = {};

    groupExpenses.forEach(exp => {
      const amount = Number(exp.amount);
      const myShare = exp.splitIds.includes('user-admin') ? (amount / exp.splitIds.length) : 0;
      const myPaid = Number(exp.payers['user-admin'] || 0);
      const myNet = myPaid - myShare;

      if (myNet > 0) {
        let remaining = myNet;
        exp.splitIds.forEach(mId => {
          if (mId === 'user-admin') return;
          const otherPaid = Number(exp.payers[mId] || 0);
          const otherShare = amount / exp.splitIds.length;
          const owesMe = Math.min(remaining, Math.max(0, otherShare - otherPaid));
          if (owesMe > 0) {
            if (!memberBalances[mId]) memberBalances[mId] = { debt: 0, credit: 0, currency: exp.currency };
            memberBalances[mId].credit += owesMe;
            remaining -= owesMe;
          }
        });
      } else if (myNet < 0) {
        let remaining = Math.abs(myNet);
        Object.entries(exp.payers).forEach(([pId, pPaid]) => {
          if (pId === 'user-admin') return;
          const pShare = exp.splitIds.includes(pId) ? (amount / exp.splitIds.length) : 0;
          const pOverpaid = Number(pPaid) - pShare;
          const iOweHim = Math.min(remaining, Math.max(0, pOverpaid));
          if (iOweHim > 0) {
            if (!memberBalances[pId]) memberBalances[pId] = { debt: 0, credit: 0, currency: exp.currency };
            memberBalances[pId].debt += iOweHim;
            remaining -= iOweHim;
          }
        });
      }
    });

    settlements.forEach(s => {
      if (s.fromId === 'user-admin' && memberBalances[s.toId]) {
        memberBalances[s.toId].debt -= s.amount;
      } else if (s.toId === 'user-admin' && memberBalances[s.fromId]) {
        memberBalances[s.fromId].credit -= s.amount;
      }
    });

    return Object.entries(memberBalances).map(([mId, data]) => ({
      memberId: mId,
      memberName: members.find(m => m.id === mId)?.name || '夥伴',
      avatar: members.find(m => m.id === mId)?.avatar,
      amountToPay: Math.max(0, data.debt),
      amountToReceive: Math.max(0, data.credit),
      currency: data.currency
    })).filter(item => item.amountToPay > 1 || item.amountToReceive > 1);
  }, [groupExpenses, settlements, members]);

  const handlePayClick = (memberId: string, name: string, currency: string, suggestedAmount: number) => {
    setPayTarget({ id: memberId, name, currency });
    setPayAmountInput(Math.ceil(suggestedAmount).toString());
    setShowPayModal(true);
  };

  const confirmPaymentSubmission = () => {
    if (!payTarget || !payAmountInput) return;
    const amount = parseFloat(payAmountInput);
    const newSettlement: Settlement = {
      id: `set-${Date.now()}`,
      fromId: 'user-admin',
      toId: payTarget.id,
      amount: amount,
      currency: payTarget.currency,
      status: 'pending',
      date: new Date().toLocaleDateString()
    };
    setSettlements(prev => [...prev, newSettlement]);
    setShowPayModal(false);
    setPayTarget(null);
    setPayAmountInput('');
  };

  const handleConfirmReceipt = (settlementId: string) => {
    setSettlements(prev => prev.map(s => s.id === settlementId ? { ...s, status: 'confirmed' } : s));
  };

  const pendingIncoming = settlements.filter(s => s.toId === 'user-admin' && s.status === 'pending');

  return (
    <div className="pb-32 animate-fadeIn">
      {/* Image Preview Overlay */}
      {previewImage && (
        <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <img src={previewImage} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="Receipt preview" />
          <button className="absolute top-8 right-8 text-white text-3xl"><i className="fas fa-times"></i></button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex bg-white p-1 rounded-[2rem] border-2 border-shadow-green mb-8 shadow-soft">
        <button onClick={() => setActiveTab('group')} className={`flex-1 py-3 rounded-[1.6rem] font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === 'group' ? 'bg-leaf-green text-white shadow-soft' : 'text-earth-brown/30'}`}>團體分攤</button>
        <button onClick={() => setActiveTab('private')} className={`flex-1 py-3 rounded-[1.6rem] font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === 'private' ? 'bg-accent-orange text-white shadow-soft' : 'text-earth-brown/30'}`}>個人私帳</button>
        <button onClick={() => setActiveTab('settle')} className={`flex-1 py-3 rounded-[1.6rem] font-black text-[10px] uppercase tracking-wider transition-all ${activeTab === 'settle' ? 'bg-earth-brown text-white shadow-soft' : 'text-earth-brown/30'}`}>結算清單</button>
      </div>

      {activeTab !== 'settle' ? (
        <div className="space-y-4">
          { (activeTab === 'group' ? groupExpenses : privateExpenses).map(exp => (
            <Card key={exp.id} className="group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${activeTab === 'group' ? 'bg-leaf-green/10 text-leaf-green' : 'bg-accent-orange/10 text-accent-orange'}`}>
                    {exp.receipt ? (
                      <div className="relative" onClick={(e) => { e.stopPropagation(); setPreviewImage(exp.receipt!); }}>
                        <img src={exp.receipt} className="w-10 h-10 object-cover rounded-xl border border-white" alt="" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-[6px] text-leaf-green shadow-sm"><i className="fas fa-image"></i></div>
                      </div>
                    ) : (
                      <i className={`fas fa-${activeTab === 'group' ? 'receipt' : 'wallet'}`}></i>
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-earth-brown leading-none mb-1">
                      {exp.description} <span className="text-leaf-green ml-1">{exp.currency} {Number(exp.amount).toLocaleString()}</span>
                    </h4>
                    <p className="text-[10px] font-bold text-shadow-green uppercase tracking-widest">{exp.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {exp.receipt && <i className="fas fa-paperclip text-shadow-green text-xs"></i>}
                  <button onClick={() => handleEditClick(exp)} className="text-leaf-green font-bold text-sm bg-leaf-green/5 px-4 py-2 rounded-xl border border-leaf-green/10 active:scale-90 transition-all">編輯</button>
                </div>
              </div>
            </Card>
          ))}
          <button 
            onClick={() => { setEditingItem(null); resetFormData(); setShowAddModal(true); }}
            className="w-full py-5 rounded-[2rem] bg-emerald-100 border-2 border-leaf-green/20 text-leaf-green font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-soft mt-6"
          >
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"><i className="fas fa-plus"></i></div>
            快速記一筆
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {pendingIncoming.length > 0 && (
            <div>
              <SectionTitle title="待確認收款" icon={<i className="fas fa-hourglass-start"></i>} />
              <div className="space-y-3">
                {pendingIncoming.map(s => (
                  <Card key={s.id} className="bg-accent-orange/5 border-accent-orange/20 border-dashed">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <img src={members.find(m => m.id === s.fromId)?.avatar} className="w-10 h-10 rounded-full border-2 border-white" alt="" />
                         <div>
                           <p className="text-sm font-black text-earth-brown">{members.find(m => m.id === s.fromId)?.name} 已付給你</p>
                           <p className="text-[10px] font-bold text-accent-orange">{s.currency} {s.amount.toLocaleString()}</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => handleConfirmReceipt(s.id)}
                        className="bg-leaf-green text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-soft active:scale-95"
                      >確認收款</button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <SectionTitle title="結算總覽 (淨額加總)" icon={<i className="fas fa-calculator"></i>} />
            <div className="space-y-4">
              {consolidatedSettlement.length > 0 ? consolidatedSettlement.map((item, idx) => (
                <Card key={idx} className={item.amountToPay > 0 ? 'border-red-50 bg-red-50/10' : 'border-leaf-green/20 bg-leaf-green/5'}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <img src={item.avatar} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" alt="" />
                      <div>
                        <h4 className="font-black text-earth-brown text-sm">
                          {item.amountToPay > 0 ? `需支付給 ${item.memberName}` : `${item.memberName} 應給我`}
                        </h4>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${item.amountToPay > 0 ? 'text-red-400' : 'text-leaf-green'}`}>
                          {item.amountToPay > 0 ? 'TO BE PAID' : 'TO BE RECEIVED'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-base font-black mb-1 ${item.amountToPay > 0 ? 'text-red-400' : 'text-leaf-green'}`}>
                        {item.currency} {Math.ceil(item.amountToPay > 0 ? item.amountToPay : item.amountToReceive).toLocaleString()}
                      </p>
                      {item.amountToPay > 0 && (
                        <button 
                          onClick={() => handlePayClick(item.memberId, item.memberName, item.currency, item.amountToPay)}
                          className="bg-red-400 text-white px-4 py-1.5 rounded-full font-black text-[9px] uppercase shadow-soft active:scale-95"
                        >已付款</button>
                      )}
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="py-20 text-center opacity-30">
                  <i className="fas fa-smile-beam text-4xl mb-4"></i>
                  <p className="text-xs font-bold italic">帳目清楚，旅程無憂！</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && payTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-[110] backdrop-blur-sm">
          <Card className="w-full max-w-[280px] animate-tripSelectorIn text-center !p-8">
            <h3 className="text-lg font-black text-earth-brown mb-2 tracking-tighter">記錄付款</h3>
            <p className="text-[10px] font-bold text-shadow-green uppercase mb-6">支付給 {payTarget.name}</p>
            <div className="mb-6">
              <label className="text-[9px] font-black text-leaf-green uppercase block mb-1">金額 ({payTarget.currency})</label>
              <input 
                type="number" 
                className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 text-center text-xl font-black outline-none focus:border-leaf-green shadow-inner"
                value={payAmountInput}
                onChange={e => setPayAmountInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPayModal(false)} className="flex-1 py-3 font-black text-[10px] uppercase text-shadow-green">取消</button>
              <button onClick={confirmPaymentSubmission} className="flex-1 py-3 bg-red-400 text-white rounded-2xl font-black text-[10px] uppercase shadow-soft active:scale-95">送出通知</button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">  
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 relative animate-tripSelectorIn max-h-[90vh] flex flex-col">  
            <div className="flex justify-between items-center mb-6 pb-2 shrink-0 border-b border-shadow-green/30">
              <h2 className="text-xl font-black text-earth-brown tracking-tighter">
                {activeTab === 'private' ? '個人開支' : (editingItem ? '修改帳目' : '新增帳目')}
              </h2>
              <button onClick={() => { setShowAddModal(false); setEditingItem(null); resetFormData(); }} className="text-earth-brown/40 p-2"><i className="fas fa-times"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[9px] font-black uppercase text-leaf-green mb-1 block">金額 AMOUNT</label>
                  <input type="number" placeholder="0" className="w-full bg-warm-beige/30 border-2 border-shadow-green rounded-2xl px-4 py-3 text-xl font-black outline-none focus:border-leaf-green shadow-inner" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="w-24">
                  <label className="text-[9px] font-black uppercase text-leaf-green mb-1 block">幣別</label>
                  <select className="w-full bg-warm-beige/30 border-2 border-shadow-green rounded-2xl h-[52px] px-2 font-black text-center outline-none shadow-inner" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                    <option>JPY</option><option>HKD</option><option>TWD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-leaf-green mb-1 block">品項說明 DESCRIPTION</label>
                <input type="text" placeholder="如：藥妝、午餐" className="w-full bg-warm-beige/30 border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-leaf-green shadow-inner" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              {/* Receipt Section */}
              <div>
                <label className="text-[9px] font-black uppercase text-leaf-green mb-2 block">單據拍照或上傳 RECEIPT</label>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                
                {formData.receipt ? (
                  <div className="relative group/receipt">
                    <img src={formData.receipt} className="w-full h-40 object-cover rounded-3xl border-2 border-shadow-green shadow-inner cursor-pointer" alt="Receipt" onClick={() => setPreviewImage(formData.receipt!)} />
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, receipt: undefined }))}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-400 text-white rounded-full shadow-lg flex items-center justify-center active:scale-90"
                    >
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/receipt:opacity-100 flex items-center justify-center transition-opacity rounded-3xl pointer-events-none">
                      <i className="fas fa-eye text-white text-2xl"></i>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-shadow-green rounded-3xl flex flex-col items-center justify-center text-shadow-green hover:text-leaf-green transition-colors active:scale-95 bg-warm-beige/20"
                  >
                    <i className="fas fa-camera text-2xl mb-1"></i>
                    <span className="text-[10px] font-black uppercase tracking-widest">點擊拍照或上傳單據</span>
                  </button>
                )}
              </div>

              {activeTab !== 'private' && (
                <>
                  <div>
                    <label className="text-[9px] font-black uppercase text-leaf-green mb-3 block">誰付款？ (WHO PAID?)</label>
                    <div className="space-y-3 bg-warm-beige/10 p-4 rounded-3xl border-2 border-shadow-green/30">
                      {members.map(m => {
                        const isPayer = formData.payers[m.id] !== undefined;
                        return (
                          <div key={m.id} className="flex items-center gap-3">
                            <div onClick={() => handleTogglePayer(m.id)} className={`relative flex flex-col items-center gap-1 cursor-pointer transition-all ${isPayer ? 'scale-110 opacity-100' : 'opacity-30 grayscale scale-95'}`}>
                              <div className="relative">
                                <img src={m.avatar} className={`w-10 h-10 rounded-full border-2 ${isPayer ? 'border-leaf-green shadow-sm' : 'border-shadow-green'}`} alt="" />
                                {isPayer && <div className="absolute -top-1 -right-1 w-4 h-4 bg-leaf-green text-white rounded-full flex items-center justify-center text-[7px] border-2 border-white"><i className="fas fa-check"></i></div>}
                              </div>
                              <span className="text-[8px] font-black text-earth-brown">{m.name}</span>
                            </div>
                            {isPayer && (
                              <div className="flex-1 flex items-center gap-2 animate-fadeIn">
                                <input type="number" className="flex-1 bg-white border border-shadow-green rounded-lg px-3 py-1 text-xs font-black outline-none focus:border-leaf-green shadow-inner" value={formData.payers[m.id]} onChange={(e) => handlePayerAmountChange(m.id, e.target.value)} />
                                <span className="text-[8px] font-bold text-shadow-green">{formData.currency}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-4">
                       <label className="text-[9px] font-black uppercase text-leaf-green tracking-widest">分攤對象 (SPLIT WITH)</label>
                       {formData.amount && (
                         <div className="bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100"><p className="text-[9px] font-black text-emerald-800">每人 {formData.currency} {perPersonAmount.toLocaleString()}</p></div>
                       )}
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                      {members.map(m => {
                        const isSelected = formData.splitIds.includes(m.id);
                        return (
                          <div key={m.id} onClick={() => handleToggleSplitter(m.id)} className={`relative flex flex-col items-center gap-1 cursor-pointer transition-all ${isSelected ? 'scale-110 opacity-100' : 'opacity-30 grayscale'}`}>
                            <div className="relative">
                              <img src={m.avatar} className={`w-14 h-14 rounded-full border-4 shadow-sm ${isSelected ? 'border-leaf-green' : 'border-white'}`} alt="" />
                              {isSelected && <div className="absolute -top-1 -right-1 w-5 h-5 bg-leaf-green text-white rounded-full flex items-center justify-center text-[8px] border-2 border-white shadow-sm"><i className="fas fa-check"></i></div>}
                            </div>
                            <span className="text-[9px] font-black text-earth-brown">{m.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={handleSaveExpense} className="mt-6 w-full text-[12px] font-black text-white bg-leaf-green rounded-[1.5rem] py-4 shadow-soft active:scale-95 transition-all shrink-0">
              儲存並離開
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expense;
