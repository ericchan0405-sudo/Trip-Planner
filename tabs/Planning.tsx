
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, SectionTitle, Button } from '../components/UI';
import { Task, TripMember, Trip } from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const CURRENT_USER_ID = 'user-admin';

interface PlanningProps {
  trip: Trip;
  members: TripMember[];
}

const Planning: React.FC<PlanningProps> = ({ trip, members }) => {
  const [activeList, setActiveList] = useState<'todo' | 'packing' | 'shopping' | 'souvenirs'>('todo');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tasks, setTasks] = useState<Task[]>([]);

  // Firestore Real-time Sync
  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('tripId', '==', trip.id));
    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
    return () => unsub();
  }, [trip.id]);

  const [formData, setFormData] = useState({
    title: '',
    assignedTo: [] as string[],
    recipient: '',
    image: undefined as string | undefined
  });

  const toggleComplete = async (e: React.MouseEvent, id: string, current: boolean) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'tasks', id), { completed: !current });
  };

  const isIndividualList = activeList === 'packing' || activeList === 'shopping' || activeList === 'souvenirs';

  const handleSaveTask = async () => {
    if (!formData.title.trim()) return alert('請輸入內容唷！');

    const finalAssignedTo = isIndividualList ? [CURRENT_USER_ID] : formData.assignedTo;
    const taskData: any = {
      title: formData.title,
      assignedTo: finalAssignedTo,
      listType: activeList,
      recipient: activeList === 'souvenirs' ? formData.recipient : null,
      image: activeList === 'souvenirs' ? (formData.image || null) : null,
      tripId: trip.id,
      completed: editingTask ? editingTask.completed : false
    };

    try {
      if (editingTask) {
        await updateDoc(doc(db, 'tasks', editingTask.id), taskData);
      } else {
        await addDoc(collection(db, 'tasks'), taskData);
      }
      setShowModal(false);
    } catch (e) {
      alert("儲存失敗");
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;
    if (confirm('確定要刪除這個項目嗎？')) {
      await deleteDoc(doc(db, 'tasks', editingTask.id));
      setShowModal(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.listType === 'packing' || t.listType === 'shopping' || t.listType === 'souvenirs') {
        return t.listType === activeList && t.assignedTo.includes(CURRENT_USER_ID);
      }
      return t.listType === activeList;
    });
  }, [tasks, activeList]);

  const progress = filteredTasks.length > 0 
    ? Math.round((filteredTasks.filter(t => t.completed).length / filteredTasks.length) * 100) 
    : 0;

  return (
    <div className="pb-32 animate-fadeIn">
      <div className="flex gap-1.5 mb-8 p-1 bg-white border-2 border-shadow-green rounded-[1.8rem] shadow-soft overflow-x-auto no-scrollbar">
        {(['todo', 'packing', 'shopping', 'souvenirs'] as const).map(type => (
          <button key={type} onClick={() => setActiveList(type)} className={`flex-1 min-w-[64px] py-2.5 px-1 rounded-[1.3rem] font-black text-[9px] transition-all uppercase ${activeList === type ? 'bg-leaf-green text-white shadow-soft' : 'text-earth-brown/40'}`}>
            {type === 'todo' ? '待辦' : type === 'packing' ? '行李' : type === 'shopping' ? '購物' : '手信'}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <SectionTitle title={activeList === 'todo' ? '出發前待辦' : activeList === 'packing' ? '我的行李清單' : activeList === 'shopping' ? '我的購物清單' : '送給誰的手信？'} icon={<i className={`fas fa-${activeList === 'todo' ? 'list-check' : activeList === 'packing' ? 'suitcase' : activeList === 'shopping' ? 'bag-shopping' : 'gift'}`}></i>} />
        <button onClick={() => { setEditingTask(null); setFormData({title: '', assignedTo: [CURRENT_USER_ID], recipient: '', image: undefined}); setShowModal(true); }} className="w-10 h-10 rounded-2xl bg-leaf-green text-white shadow-soft flex items-center justify-center"><i className="fas fa-plus"></i></button>
      </div>

      <Card className="mb-6 !p-4 border-dashed bg-leaf-green/5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-black text-leaf-green uppercase">準備進度</span>
          <span className="text-sm font-black text-leaf-green">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-white rounded-full border border-shadow-green overflow-hidden"><div className="h-full bg-leaf-green" style={{ width: `${progress}%` }}></div></div>
      </Card>

      <div className="space-y-4">
        {filteredTasks.length > 0 ? filteredTasks.map(item => (
          <Card key={item.id} onClick={() => { setEditingTask(item); setFormData({title: item.title, assignedTo: item.assignedTo, recipient: item.recipient || '', image: item.image}); setShowModal(true); }} className={`flex items-center gap-4 transition-all ${item.completed ? 'bg-warm-beige/50 border-dashed opacity-60' : ''}`}>
            <div onClick={(e) => toggleComplete(e, item.id, item.completed)} className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center ${item.completed ? 'bg-leaf-green border-leaf-green' : 'bg-white border-shadow-green'}`}>
              {item.completed && <i className="fas fa-check text-white text-xs"></i>}
            </div>
            <div className="flex-1"><p className={`font-black text-sm ${item.completed ? 'line-through opacity-40' : ''}`}>{item.title}</p></div>
          </Card>
        )) : <p className="text-center text-xs opacity-30 italic py-20">清單目前是空的</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-earth-brown/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 animate-tripSelectorIn">
            <h3 className="text-lg font-black mb-6">{editingTask ? '修改項目' : '新增項目'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="內容" className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              <div className="flex gap-2">
                {editingTask && <Button variant="danger" className="!px-4" onClick={handleDeleteTask}><i className="fas fa-trash-can"></i></Button>}
                <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button>
                <Button className="flex-1" onClick={handleSaveTask}>儲存</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planning;
