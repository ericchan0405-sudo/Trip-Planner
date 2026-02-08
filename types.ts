
export enum TabType {
  SCHEDULE = 'schedule',
  BOOKINGS = 'bookings',
  EXPENSE = 'expense',
  PLANNING = 'planning',
  MEMBERS = 'members'
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  destination: string;
  accessPin?: string;
  adminId?: string;
}

export interface TripMember {
  id: string;
  name: string;
  avatar: string;
  role?: string;
  isMe?: boolean;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location: string;
  category: 'sightseeing' | 'food' | 'transport' | 'stay';
  notes?: string;
  images?: string[];
  date: string;
  tripId: string;
}

export interface Booking {
  id: string;
  type: 'flight' | 'stay' | 'car' | 'ticket';
  title: string;
  details: any;
  cost: number;
  paidBy: string;
  splitWith: string[];
}

export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  payerIds: string[];
  splitIds: string[];
  date: string;
  isPrivate: boolean;
  receiptUrl?: string;
  isSettled?: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  assignedTo: string[];
  listType: 'todo' | 'packing' | 'shopping' | 'souvenirs';
  image?: string;
  recipient?: string;
}
