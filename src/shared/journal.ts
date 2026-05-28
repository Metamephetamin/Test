export type WorkType = {
  id: number;
  name: string;
  defaultUnit: string;
};

export type JournalEntry = {
  id: number;
  workDate: string;
  workTypeId: number;
  workTypeName: string;
  quantity: number;
  unit: string;
  performer: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type JournalSummary = {
  count: number;
  totalQuantity: number;
  uniquePerformers: number;
};

export type EntryPayload = {
  workDate: string;
  workTypeId: number;
  quantity: number;
  unit: string;
  performer: string;
  comment?: string;
};

export type EntryFilters = {
  from?: string;
  to?: string;
};
