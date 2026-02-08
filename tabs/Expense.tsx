
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, SectionTitle, Button } from '../components/UI';
import { CURRENCIES } from '../constants';
import { TripMember, Trip } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';

interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  payers: Record<string, number>; 
  splitIds: string[];
  receipt?: string;
  tripId: string;
}

interface Settlement {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed';
  date: string;
  tripId: string;
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, id: string, type: 'group' | 'private' }>({ isOpen: false, id: '', type: 'group' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'expenses'), where('tripId', '==', trip.id), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseItem)));
    });
    return () => unsub();
  }, [trip.id]);

  useEffect(() => {
    const q = query(collection(db, 'settlements'), where('tripId', '==', trip.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setSettlements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Settlement)));
    });
    return () => unsub();
  }, [trip.id]);

  const groupExpenses = expenses.filter(e => e.splitIds.length > 1);
  const privateExpenses = expenses.filter(e => e.splitIds.length === 1 && e.splitIds[0] === 'user-admin');

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

  const handleSaveExpense = async () => {
    if (!formData.amount || !formData.description) return alert('請輸入品項與金額唷！');
    
    const totalInput = parseFloat(formData.amount) || 0;
    const isPrivate = activeTab === 'private';
    const finalPayers = isPrivate ? { 'user-admin': totalInput } : formData.payers;
    const finalSplitIds = isPrivate ? ['user-admin'] : formData.splitIds;

    const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const data: any = {
      date: editingItem ? editingItem.date : today,
      description: formData.description,
      amount: totalInput,
      currency: formData.currency,
      payers: finalPayers,
      splitIds: finalSplitIds,
      receipt: formData.receipt || null,
      tripId: trip.id
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'expenses', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'expenses'), data);
      }
      setShowAddModal(false);
      setEditingItem(null);
      resetFormData();
    } catch (e) {
      alert("儲存失敗");
    }
  };

  const handleDeleteExpense = async () => {
    try {
      await deleteDoc(doc(db, 'expenses', deleteConfirm.id));
      setDeleteConfirm({ ...deleteConfirm, isOpen: false });
    } catch (e) {
      alert("刪除失敗");
    }
  };

  const confirmPaymentSubmission = async () => {
    if (!payTarget || !payAmountInput) return;
    const amount = parseFloat(payAmountInput);
    const newSettlement: any = {
      fromId: 'user-admin',
      toId: payTarget.id,
      amount: amount,
      currency: payTarget.currency,
      status: 'pending',
      date: new Date().toLocaleDateString(),
      tripId: trip.id
    };
    await addDoc(collection(db, 'settlements'), newSettlement);
    setShowPayModal(false);
    setPayTarget(null);
    setPayAmountInput('');
  };

  const handleConfirmReceipt = async (settlementId: string) => {
    await updateDoc(doc(db, 'settlements', settlementId), { status: 'confirmed' });
  };

  const resetFormData = () => {
    setFormData({ amount: '', currency: 'JPY', description: '', payers: { 'user-admin': 0 }, splitIds: members.map(m => m.id), receipt: undefined });
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

  return (
    <div className="pb-32 animate-fadeIn">
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[400] flex items-center justify-center p-6">
          <Card className="w-full max-w-[280px] text-center !p-8">
            <h3 className="text-lg font-black text-earth-brown mb-2">刪除帳目</h3>
            <p className="text-[10px] font-bold text-shadow-green mb-6">確定要刪除這筆帳目嗎？</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })} className="flex-1 py-3 text-shadow-green font-bold">取消</button>
              <button onClick={handleDeleteExpense} className="flex-1 py-3 bg-red-400 text-white rounded-2xl font-bold">確定</button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex bg-white p-1 rounded-[2rem] border-2 border-shadow-green mb-8 shadow-soft">
        <button onClick={() => setActiveTab('group')} className={`flex-1 py-3 rounded-[1.6rem] font-black text-[10px] uppercase transition-all ${activeTab === 'group' ? 'bg-leaf-green text-white shadow-soft' : 'text-earth-brown/30'}`}>團體分攤</button>
        <button onClick={() => setActiveTab('private')} className={`flex-1 py-3 rounded-[1.6rem] font-black text-[10px] uppercase transition-all ${activeTab === 'private' ? 'bg-accent-orange text-white shadow-soft' : 'text-earth-brown/30'}`}>個人私帳</button>
        <button onClick={() => setActiveTab('settle')} className={`flex-1 py-3 rounded-[1.6rem] font-black text-[10px] uppercase transition-all ${activeTab === 'settle' ? 'bg-earth-brown text-white shadow-soft' : 'text-earth-brown/30'}`}>結算清單</button>
      </div>

      {activeTab !== 'settle' ? (
        <div className="space-y-4">
          {(activeTab === 'group' ? groupExpenses : privateExpenses).length > 0 ? (activeTab === 'group' ? groupExpenses : privateExpenses).map(exp => (
            <Card key={exp.id} className="group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${activeTab === 'group' ? 'bg-leaf-green/10 text-leaf-green' : 'bg-accent-orange/10 text-accent-orange'}`}>
                    <i className={`fas fa-${activeTab === 'group' ? 'receipt' : 'wallet'}`}></i>
                  </div>
                  <div>
                    <h4 className="font-black text-earth-brown leading-none mb-1">{exp.description} <span className="text-leaf-green">{exp.currency} {Number(exp.amount).toLocaleString()}</span></h4>
                    <p className="text-[10px] font-bold text-shadow-green">{exp.date}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, id: exp.id, type: activeTab as any }); }} className="w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center"><i className="fas fa-trash-can text-[10px]"></i></button>
                  <button onClick={() => handleEditClick(exp)} className="text-leaf-green font-bold text-sm bg-leaf-green/5 px-4 py-2 rounded-xl">編輯</button>
                </div>
              </div>
            </Card>
          )) : <p className="text-center text-xs opacity-30 italic py-20">目前沒有記帳項目</p>}
          <button onClick={() => { setEditingItem(null); resetFormData(); setShowAddModal(true); }} className="w-full py-5 rounded-[2rem] bg-emerald-100 border-2 border-leaf-green/20 text-leaf-green font-black text-sm uppercase flex items-center justify-center gap-3">
            <i className="fas fa-plus"></i> 快速記一筆
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {consolidatedSettlement.length > 0 ? consolidatedSettlement.map((item, idx) => (
            <Card key={idx} className={item.amountToPay > 0 ? 'border-red-50 bg-red-50/10' : 'border-leaf-green/20 bg-leaf-green/5'}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <img src={item.avatar} className="w-12 h-12 rounded-full border-2 border-white" alt="" />
                  <div>
                    <h4 className="font-black text-earth-brown text-sm">{item.amountToPay > 0 ? `需支付給 ${item.memberName}` : `${item.memberName} 應給我`}</h4>
                    <p className={`text-[9px] font-black uppercase ${item.amountToPay > 0 ? 'text-red-400' : 'text-leaf-green'}`}>{item.amountToPay > 0 ? 'TO BE PAID' : 'TO BE RECEIVED'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-base font-black ${item.amountToPay > 0 ? 'text-red-400' : 'text-leaf-green'}`}>{item.currency} {Math.ceil(item.amountToPay > 0 ? item.amountToPay : item.amountToReceive).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          )) : <p className="text-center text-xs opacity-30 italic py-20">帳目已結清</p>}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">  
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 relative animate-tripSelectorIn">  
            <h2 className="text-xl font-black mb-6">新增帳目</h2>
            <div className="space-y-4">
              <input type="number" placeholder="金額" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-black" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
              <input type="text" placeholder="說明" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>取消</Button>
                <Button className="flex-1" onClick={handleSaveExpense}>儲存</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expense;
