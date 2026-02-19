// Client-side type definitions (AWS DynamoDB based)

export interface Profile {
  userId: string;
  name: string;
  phone: string;
  residentNumber: string;
  email: string;
  selfIntroduction?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Event {
  id: string;
  title: string;
  category: string; // sports, concert, exhibition
  date: string;
  workDates?: string[];
  startTime: string;
  endTime: string;
  weekendStartTime?: string | null;
  weekendEndTime?: string | null;
  location: string;
  address?: string | null;
  region?: string | null;
  jobType?: string | null;
  wage: number;
  wageType?: string; // hourly, daily, per_event
  wageNote?: string | null;
  positionsAvailable: number;
  description?: string | null;
  dressCode?: string | null;
  rules?: string | null;
  createdAt?: string;
}

export interface Application {
  id: string;
  userId: string;
  eventId: string;
  selfIntroduction?: string | null;
  status: string; // pending, hired, rejected
  bankAccount?: string | null;
  bankName?: string | null;
  photoUrl?: string | null;
  idCardUrl?: string | null;
  confirmedDressCode?: boolean;
  confirmedRules?: boolean;
  documentsSubmittedAt?: string | null;
  appliedAt?: string;
  event?: Event;
}

export interface RegularApplication {
  userId: string;
  availableDays: string[];
  preferredCategories: string[];
  availableStartTime: string;
  availableEndTime: string;
  note?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
