import type { EntryFilters, EntryPayload, JournalEntry, JournalSummary, WorkType } from "../shared/journal";

type EntriesResponse = {
  entries: JournalEntry[];
  summary: JournalSummary;
};

type WorkTypesResponse = {
  workTypes: WorkType[];
};

type EntryResponse = {
  entry: JournalEntry;
};

export async function getWorkTypes() {
  return requestJson<WorkTypesResponse>("/api/work-types").then((response) => response.workTypes);
}

export async function getEntries(filters: EntryFilters) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const query = params.toString();
  return requestJson<EntriesResponse>(`/api/entries${query ? `?${query}` : ""}`);
}

export async function createEntry(payload: EntryPayload) {
  return requestJson<EntryResponse>("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then((response) => response.entry);
}

export async function updateEntry(id: number, payload: EntryPayload) {
  return requestJson<EntryResponse>(`/api/entries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).then((response) => response.entry);
}

export async function deleteEntry(id: number) {
  await requestJson<void>(`/api/entries/${id}`, { method: "DELETE" });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    let message = "Не удалось выполнить запрос";
    try {
      const data = (await response.json()) as { error?: string; fields?: string[] };
      if (data.error === "VALIDATION_ERROR") {
        message = `Проверьте поля: ${data.fields?.join(", ") ?? "форма"}`;
      } else if (data.error === "UNKNOWN_WORK_TYPE") {
        message = "Выбранный вид работ не найден";
      } else if (data.error === "ENTRY_NOT_FOUND") {
        message = "Запись уже удалена или недоступна";
      }
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
