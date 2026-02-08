
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, SectionTitle, Button } from '../components/UI';
import { Task, TripMember } from '../types';

// The current user ID as defined in App.tsx
const CURRENT_USER_ID = 'user-admin';

interface PlanningProps {
  members: TripMember[];
}

const Planning: React.FC<PlanningProps> = ({ members }) => {
  const [activeList, setActiveList] = useState<'todo' | 'packing' | 'shopping' | 'souvenirs'>('todo');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  const storageKey = `komorebi_planning_tasks`;
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [
      { id: 't1', title: '購買 JR Pass', completed: true, assignedTo: ['2'], listType: 'todo' },
      { id: 't2', title: '預約敘敘苑', completed: true, assignedTo: ['2'], listType: 'todo' },
      { id: 't3', title: '保險線上投保', completed: false, assignedTo: ['user-admin', '2', '3', '4'], listType: 'todo' },
      { id: 'p1', title: '個人護照', completed: true, assignedTo: ['user-admin'], listType: 'packing' },
    ];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
  }, [tasks]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    assignedTo: [] as string[],
    recipient: '',
    image: undefined as string | undefined
  });

  const toggleComplete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const isIndividualList = activeList === 'packing' || activeList === 'shopping' || activeList === 'souvenirs';

  const openAddModal = () => {
    setEditingTask(null);
    const initialAssignees = isIndividualList ? [CURRENT_USER_ID] : [CURRENT_USER_ID];
    setFormData({ 
      title: '', 
      assignedTo: initialAssignees, 
      recipient: '', 
      image: undefined 
    });
    setShowModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({ 
      title: task.title, 
      assignedTo: [...task.assignedTo],
      recipient: task.recipient || '',
      image: task.image
    });
    setShowModal(true);
  };

  const handleSaveTask = () => {
    if (!formData.title.trim()) return alert('請輸入內容唷！');

    const finalAssignedTo = isIndividualList ? [CURRENT_USER_ID] : formData.assignedTo;

    const taskData: Partial<Task> = {
      title: formData.title,
      assignedTo: finalAssignedTo,
      listType: activeList,
      recipient: activeList === 'souvenirs' ? formData.recipient : undefined,
      image: activeList === 'souvenirs' ? formData.image : undefined,
    };

    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { 
        ...t, 
        ...taskData
      } : t));
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        completed: false,
        ...(taskData as Required<Pick<Task, 'title' | 'assignedTo' | 'listType'>>)
      };
      setTasks(prev => [...prev, newTask]);
    }

    setShowModal(false);
  };

  const handleDeleteTask = () => {
    if (!editingTask) return;
    if (confirm('確定要刪除這個項目嗎？')) {
      setTasks(prev => prev.filter(t => t.id !== editingTask.id));
      setShowModal(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAssignee = (id: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(id) 
        ? prev.assignedTo.filter(aid => aid !== id) 
        : [...prev.assignedTo, id]
    }));
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
      {/* List Type Switcher */}
      <div className="flex gap-1.5 mb-8 p-1 bg-white border-2 border-shadow-green rounded-[1.8rem] shadow-soft overflow-x-auto no-scrollbar">
        {(['todo', 'packing', 'shopping', 'souvenirs'] as const).map(type => (
          <button
            key={type}
            onClick={() => setActiveList(type)}
            className={`flex-1 min-w-[64px] py-2.5 px-1 rounded-[1.3rem] font-black text-[9px] transition-all uppercase tracking-tighter shrink-0 ${
              activeList === type 
                ? 'bg-leaf-green text-white shadow-soft' 
                : 'text-earth-brown/40 hover:text-earth-brown'
            }`}
          >
            {type === 'todo' ? '待辦' : type === 'packing' ? '行李' : type === 'shopping' ? '購物' : '手信'}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-4">
        <SectionTitle 
          title={
            activeList === 'todo' ? '出發前待辦' : 
            activeList === 'packing' ? '我的行李清單' : 
            activeList === 'shopping' ? '我的購物清單' : '送給誰的手信？'
          } 
          icon={
            <i className={`fas fa-${
              activeList === 'todo' ? 'list-check' : 
              activeList === 'packing' ? 'suitcase' : 
              activeList === 'shopping' ? 'bag-shopping' : 'gift'
            }`}></i>
          } 
        />
        <button 
          onClick={openAddModal}
          className="w-10 h-10 rounded-2xl bg-leaf-green text-white shadow-soft flex items-center justify-center active:scale-90"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {/* Progress Bar */}
      <Card className="mb-6 !p-4 border-dashed bg-leaf-green/5">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-leaf-green">
            {isIndividualList ? '個人準備進度' : '小組完成進度'}
          </span>
          <span className="text-sm font-black text-leaf-green">{progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-shadow-green shadow-inner">
          <div 
            className="h-full bg-leaf-green transition-all duration-700 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </Card>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length > 0 ? filteredTasks.map(item => (
          <Card 
            key={item.id} 
            onClick={() => openEditModal(item)}
            className={`flex items-center gap-4 transition-all ${item.completed ? 'bg-warm-beige/50 border-dashed opacity-60' : 'hover:border-leaf-green/50'}`}
          >
            <div 
              onClick={(e) => toggleComplete(e, item.id)}
              className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shadow-inner shrink-0 ${
                item.completed ? 'bg-leaf-green border-leaf-green' : 'bg-white border-shadow-green'
              }`}
            >
              {item.completed && <i className="fas fa-check text-white text-xs"></i>}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {item.image && (
                  <img src={item.image} className="w-10 h-10 rounded-xl object-cover border border-shadow-green shadow-sm" alt="" />
                )}
                <div>
                  <p className={`font-black text-sm text-earth-brown leading-tight ${item.completed ? 'line-through opacity-40' : ''}`}>
                    {item.title}
                  </p>
                  {item.recipient && (
                    <p className="text-[9px] font-bold text-accent-orange mt-1">
                      <i className="fas fa-gift mr-1"></i> {item.recipient}
                    </p>
                  )}
                </div>
              </div>
              
              {!isIndividualList && (
                <div className="flex -space-x-2 mt-2">
                  {item.assignedTo.map(uid => {
                    const member = members.find(m => m.id === uid);
                    return member ? (
                      <img 
                        key={uid}
                        src={member.avatar} 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        title={member.name}
                        alt={member.name}
                      />
                    ) : null;
                  })}
                  {item.assignedTo.length === 0 && (
                     <span className="text-[8px] font-bold text-shadow-green uppercase tracking-widest">未指派</span>
                  )}
                </div>
              )}
            </div>

            <button className="text-leaf-green/30 hover:text-leaf-green p-2 active:scale-90">
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </Card>
        )) : (
          <div className="py-20 text-center opacity-20">
            <i className={`fas fa-${
              activeList === 'packing' ? 'suitcase-rolling' : 
              activeList === 'shopping' ? 'bag-shopping' : 
              activeList === 'souvenirs' ? 'gift' : 'clipboard-list'
            } text-4xl mb-4`}></i>
            <p className="text-xs font-bold italic">這份清單還空空的唷</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-earth-brown/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-sm:max-w-xs p-8 animate-tripSelectorIn overflow-y-auto no-scrollbar max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-earth-brown tracking-tighter">
                {editingTask ? '修改項目' : '新增項目'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-earth-brown/30 p-1">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">項目名稱 ITEM TITLE</label>
                <input 
                  type="text" 
                  placeholder={
                    activeList === 'packing' ? "例如：護照、牙刷、充電線" : 
                    activeList === 'shopping' ? "例如：大和美妝、限定零食" : 
                    activeList === 'souvenirs' ? "例如：小明御守、限定和菓子" : "例如：購買門票、預約餐廳"
                  }
                  className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-leaf-green shadow-inner"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              {activeList === 'souvenirs' && (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-1 block">送給誰？ RECIPIENT</label>
                    <input 
                      type="text" 
                      placeholder="例如：媽媽、同事、自己"
                      className="w-full bg-warm-beige border-2 border-shadow-green rounded-2xl px-4 py-3 font-bold text-sm outline-none focus:border-leaf-green shadow-inner"
                      value={formData.recipient}
                      onChange={e => setFormData({...formData, recipient: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-2 block">上傳相片 PHOTO</label>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    
                    {formData.image ? (
                      <div className="relative group/image">
                        <img src={formData.image} className="w-full h-32 object-cover rounded-2xl border-2 border-shadow-green shadow-inner" alt="" />
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, image: undefined }))}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-400 text-white rounded-full flex items-center justify-center active:scale-90 shadow-lg"
                        >
                          <i className="fas fa-trash-can text-[10px]"></i>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-6 border-2 border-dashed border-shadow-green rounded-2xl flex flex-col items-center justify-center text-shadow-green hover:text-leaf-green transition-colors bg-warm-beige/10"
                      >
                        <i className="fas fa-camera text-xl mb-1"></i>
                        <span className="text-[9px] font-black uppercase">點擊加入相片</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {!isIndividualList && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-leaf-green mb-3 block">指派給夥伴 ASSIGN TO</label>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                    {members.map(m => {
                      const isSelected = formData.assignedTo.includes(m.id);
                      return (
                        <div 
                          key={m.id} 
                          onClick={() => toggleAssignee(m.id)}
                          className={`relative flex flex-col items-center gap-1 cursor-pointer transition-all ${isSelected ? 'scale-110 opacity-100' : 'opacity-30 grayscale'}`}
                        >
                          <div className="relative">
                            <img src={m.avatar} className={`w-12 h-12 rounded-full border-2 shadow-sm ${isSelected ? 'border-leaf-green' : 'border-white'}`} alt="" />
                            {isSelected && <div className="absolute -top-1 -right-1 w-4 h-4 bg-leaf-green text-white rounded-full flex items-center justify-center text-[7px] border border-white shadow-sm"><i className="fas fa-check"></i></div>}
                          </div>
                          <span className="text-[8px] font-black text-earth-brown">{m.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-shadow-green/30">
                {editingTask && (
                  <button 
                    onClick={handleDeleteTask}
                    className="w-12 h-12 rounded-2xl border-2 border-red-100 text-red-400 flex items-center justify-center active:scale-90"
                  >
                    <i className="fas fa-trash-can"></i>
                  </button>
                )}
                <button 
                  onClick={handleSaveTask}
                  className="flex-1 py-4 bg-leaf-green text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-soft active:scale-95 transition-all"
                >
                  儲存並離開
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planning;
