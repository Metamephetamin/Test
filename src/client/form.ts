import type { EntryPayload, JournalEntry } from "../shared/journal";

export type EntryDraft = {
  workDate: string;
  workTypeId: string;
  quantity: string;
  unit: string;
  performer: string;
  comment: string;
};

export type DraftErrors = Partial<Record<keyof EntryDraft, string>>;

export function createEmptyDraft(): EntryDraft {
  return {
    workDate: new Date().toISOString().slice(0, 10),
    workTypeId: "",
    quantity: "",
    unit: "",
    performer: "",
    comment: ""
  };
}

export function draftFromEntry(entry: JournalEntry): EntryDraft {
  return {
    workDate: entry.workDate,
    workTypeId: String(entry.workTypeId),
    quantity: String(entry.quantity),
    unit: entry.unit,
    performer: entry.performer,
    comment: entry.comment
  };
}

export function validateDraft(draft: EntryDraft): DraftErrors {
  const errors: DraftErrors = {};
  const quantity = Number(draft.quantity);

  if (!draft.workDate) errors.workDate = "Укажите дату";
  if (!draft.workTypeId) errors.workTypeId = "Выберите вид работ";
  if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = "Укажите объем больше 0";
  if (!draft.unit.trim()) errors.unit = "Укажите единицу";
  if (!draft.performer.trim()) errors.performer = "Укажите исполнителя";

  return errors;
}

export function buildEntryPayload(draft: EntryDraft): EntryPayload {
  return {
    workDate: draft.workDate,
    workTypeId: Number(draft.workTypeId),
    quantity: Number(draft.quantity),
    unit: draft.unit.trim(),
    performer: draft.performer.trim(),
    comment: draft.comment.trim()
  };
}
