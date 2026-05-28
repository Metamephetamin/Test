import type { EntryPayload, JournalEntry } from "../shared/journal";

export const CUSTOM_WORK_TYPE_ID = "custom";

export type EntryDraft = {
  workDate: string;
  workTypeId: string;
  customWorkTypeName: string;
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
    customWorkTypeName: "",
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
    customWorkTypeName: "",
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
  if (draft.workTypeId === CUSTOM_WORK_TYPE_ID && !draft.customWorkTypeName.trim()) {
    errors.customWorkTypeName = "Укажите свой вид работ";
  }
  if (!Number.isFinite(quantity) || quantity <= 0) errors.quantity = "Укажите объем больше 0";
  if (!draft.unit.trim()) errors.unit = "Укажите единицу";
  if (!draft.performer.trim()) errors.performer = "Укажите исполнителя";

  return errors;
}

export function buildEntryPayload(draft: EntryDraft): EntryPayload {
  const basePayload = {
    workDate: draft.workDate,
    quantity: Number(draft.quantity),
    unit: draft.unit.trim(),
    performer: draft.performer.trim(),
    comment: draft.comment.trim()
  };

  if (draft.workTypeId === CUSTOM_WORK_TYPE_ID) {
    return {
      ...basePayload,
      workTypeName: draft.customWorkTypeName.trim()
    };
  }

  return {
    ...basePayload,
    workTypeId: Number(draft.workTypeId)
  };
}
