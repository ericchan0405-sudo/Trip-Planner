
import React from 'react';
import { Card } from './UI';

interface FlightLocation {
  code: string;
  city: string;
  time: string;
}

interface FlightCardProps {
  id: string;
  airline: string;
  flightNumber: string;
  origin: FlightLocation;
  destination: FlightLocation;
  passenger: string;
  classType: string;
  gate: string;
  seat: string;
  date: string;
  duration: string;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  suggestedDeparture?: {
    time: string;
    transport: string;
    estimate: string;
  };
}

const FlightCard: React.FC<FlightCardProps> = ({
  id,
  airline,
  flightNumber,
  origin,
  destination,
  passenger,
  classType,
  gate,
  seat,
  date,
  duration,
  onDelete,
  onEdit,
  suggestedDeparture,
}) => {
  // 更強大的切割邏輯，支援 逗號、空格、點、分號、全形符號、換行
  const passengers = passenger.split(/[,\n;，。、\t]+/).map(p => p.trim()).filter(p => p.length > 0);
  const seats = seat.split(/[,\s;，。、\t]+/).map(s => s.trim()).filter(s => s.length > 0);

  return (
    <div className="relative group perspective-1000">
      <div className="absolute -top-2 -right-2 flex gap-2 z-30 opacity-0 group-hover:opacity-100 transition-all">
        {onEdit && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(id); }}
            className="w-8 h-8 rounded-full bg-leaf-green text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-90"
          >
            <i className="fas fa-pen text-[10px]"></i>
          </button>
        )}
        {onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(id); }}
            className="w-8 h-8 rounded-full bg-red-400 text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-90"
          >
            <i className="fas fa-trash-can text-[10px]"></i>
          </button>
        )}
      </div>

      <div 
        onClick={() => onEdit?.(id)}
        className="bg-white rounded-[2.5rem] overflow-hidden border-2 border-shadow-green shadow-soft transition-all duration-300 group-active:scale-[0.97] cursor-pointer"
      >
        <div className="px-6 py-5 bg-gradient-to-r from-white to-warm-beige/30 flex justify-between items-center border-b-2 border-dashed border-shadow-green/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-leaf-green/10 flex items-center justify-center text-leaf-green">
              <i className="fas fa-plane-up text-xl"></i>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-leaf-green leading-none mb-1">{airline}</p>
              <p className="text-sm font-bold text-earth-brown">{flightNumber}</p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-accent-orange/10 text-accent-orange text-[10px] font-black uppercase tracking-tighter">
            {classType}
          </div>
        </div>

        <div className="p-8 relative">
          <div className="flex justify-between items-center mb-2">
            <div className="text-left">
              <h2 className="text-4xl font-black text-earth-brown tracking-tighter mb-1">{origin.code || '---'}</h2>
              <p className="text-xs font-medium opacity-60 mb-2">{origin.city}</p>
              <p className="text-xl font-black text-leaf-green">{origin.time}</p>
            </div>

            <div className="flex-1 px-4 flex flex-col items-center justify-center relative">
              <div className="w-full flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-shadow-green"></div>
                <div className="flex-1 h-[2px] border-b-2 border-dotted border-shadow-green relative">
                   <i className="fas fa-plane absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-shadow-green text-sm group-hover:text-leaf-green transition-colors"></i>
                </div>
                <div className="w-2 h-2 rounded-full border-2 border-shadow-green"></div>
              </div>
              <p className="text-[9px] font-bold text-shadow-green uppercase tracking-widest">{duration || '--'}</p>
            </div>

            <div className="text-right">
              <h2 className="text-4xl font-black text-earth-brown tracking-tighter mb-1">{destination.code || '---'}</h2>
              <p className="text-xs font-medium opacity-60 mb-2">{destination.city}</p>
              <p className="text-xl font-black text-leaf-green">{destination.time}</p>
            </div>
          </div>
        </div>

        {suggestedDeparture && (
          <div className="px-6 py-3 bg-accent-orange/5 border-t-2 border-dashed border-shadow-green/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent-orange/20 flex items-center justify-center text-accent-orange text-[10px]">
                <i className="fas fa-clock"></i>
              </div>
              <span className="text-[10px] font-black text-earth-brown uppercase tracking-wider">建議出發</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-accent-orange">{suggestedDeparture.time}</span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-shadow-green bg-white px-2 py-0.5 rounded-full border border-shadow-green/50">
                <i className={`fas ${suggestedDeparture.transport === '開車' ? 'fa-car' : 'fa-train'}`}></i>
                <span>{suggestedDeparture.transport} ({suggestedDeparture.estimate})</span>
              </div>
            </div>
          </div>
        )}

        <div className="relative h-4 flex items-center px-2">
          <div className="absolute left-[-12px] w-6 h-6 rounded-full bg-warm-beige border-2 border-shadow-green"></div>
          <div className="w-full border-t-2 border-dotted border-shadow-green/40"></div>
          <div className="absolute right-[-12px] w-6 h-6 rounded-full bg-warm-beige border-2 border-shadow-green"></div>
        </div>

        <div className="p-6 bg-leaf-green/5 space-y-4">
          <div className="border-b border-shadow-green/30 pb-4">
            <p className="text-[9px] font-bold text-shadow-green uppercase tracking-widest mb-3">Passenger Manifest & Seat Assignments</p>
            <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
              {passengers.map((p, i) => (
                <div key={i} className="flex justify-between items-center group/row py-0.5">
                  <span className="text-[11px] font-black text-earth-brown whitespace-nowrap pr-4 truncate max-w-[70%]">
                    {p}
                  </span>
                  <span className="text-[10px] font-black text-accent-orange bg-white border border-shadow-green/60 px-2 py-0.5 rounded-md min-w-[3.5rem] text-center shadow-sm whitespace-nowrap">
                    {seats[i] || '---'}
                  </span>
                </div>
              ))}
              {passengers.length === 0 && (
                <p className="text-[10px] font-black text-earth-brown/30 italic">尚未輸入乘客資訊</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-shadow-green uppercase tracking-widest">Gate</p>
              <p className="text-sm font-black text-earth-brown">{gate || '--'}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] font-bold text-shadow-green uppercase tracking-widest">Date</p>
              <p className="text-sm font-black text-earth-brown">{date}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t-2 border-warm-beige flex justify-center opacity-40 grayscale group-hover:grayscale-0 transition-all">
          <div className="flex gap-1 h-8 items-end">
            {[2, 4, 1, 3, 2, 5, 2, 1, 4, 2, 3, 1, 6, 2, 4].map((h, i) => (
              <div key={i} className="bg-earth-brown" style={{ width: i % 3 === 0 ? '3px' : '1.5px', height: `${h * 15}%` }}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
