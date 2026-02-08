
import React from 'react';
import { Card } from './UI';

interface StayCardProps {
  id: string;
  hotelName: string;
  provider?: string;
  checkIn: string;
  checkOut: string;
  location: string;
  cost?: number;
  note?: string;
  onDelete: (id: string) => void;
  onEdit?: (id: string) => void;
}

const StayCard: React.FC<StayCardProps> = ({
  id,
  hotelName,
  checkIn,
  checkOut,
  location,
  cost,
  note,
  onDelete,
  onEdit
}) => {
  return (
    <Card 
      onClick={() => onEdit?.(id)}
      className="relative overflow-hidden group cursor-pointer"
    >
      {/* Action Buttons Container */}
      <div className="absolute top-4 right-4 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all">
        {onEdit && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(id);
            }}
            className="w-8 h-8 rounded-full bg-leaf-green/10 text-leaf-green flex items-center justify-center hover:bg-leaf-green hover:text-white transition-all"
          >
            <i className="fas fa-pen text-[10px]"></i>
          </button>
        )}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-400 hover:text-white transition-all"
        >
          <i className="fas fa-trash-can text-[10px]"></i>
        </button>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-500 shrink-0 shadow-inner">
          <i className="fas fa-hotel text-xl"></i>
        </div>
        <div className="flex-1 min-w-0 flex items-center">
          <h4 className="text-lg font-black text-earth-brown truncate leading-tight">{hotelName}</h4>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-warm-beige/50 p-3 rounded-2xl border border-shadow-green">
          <p className="text-[9px] font-bold text-shadow-green uppercase mb-1">Check In</p>
          <p className="text-sm font-black text-earth-brown">{checkIn}</p>
        </div>
        <div className="bg-warm-beige/50 p-3 rounded-2xl border border-shadow-green">
          <p className="text-[9px] font-bold text-shadow-green uppercase mb-1">Check Out</p>
          <p className="text-sm font-black text-earth-brown">{checkOut}</p>
        </div>
      </div>

      <div className="flex items-start gap-2 mb-3 px-1">
        <i className="fas fa-location-dot text-red-400 mt-0.5"></i>
        <p className="text-xs font-bold text-earth-brown/70 leading-relaxed">{location}</p>
      </div>

      <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-shadow-green/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-shadow-green uppercase">Total Cost</span>
          <span className="text-base font-black text-leaf-green">
            {cost ? `HK$ ${Number(cost).toLocaleString()}` : '尚未填寫金額'}
          </span>
        </div>
        {note && (
          <div className="text-[10px] text-earth-brown/40 italic flex items-center gap-1">
            <i className="fas fa-info-circle"></i> 備註
          </div>
        )}
      </div>
    </Card>
  );
};

export default StayCard;
