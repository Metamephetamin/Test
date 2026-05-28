import {
  CalendarDays,
  Check,
  ClipboardList,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createEntry,
  deleteEntry,
  getEntries,
  getWorkTypes,
  updateEntry
} from "./api";
import {
  buildEntryPayload,
  CUSTOM_WORK_TYPE_ID,
  createEmptyDraft,
  draftFromEntry,
  validateDraft,
  type DraftErrors,
  type EntryDraft
} from "./form";
import type { EntryFilters, JournalEntry, JournalSummary, WorkType } from "../shared/journal";

const emptySummary: JournalSummary = {
  count: 0,
  totalQuantity: 0,
  uniquePerformers: 0
};

export function App() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [summary, setSummary] = useState<JournalSummary>(emptySummary);
  const [filters, setFilters] = useState<EntryFilters>({});
  const [draft, setDraft] = useState<EntryDraft>(createEmptyDraft);
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadFilteredEntries() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getEntries(filters);
        if (!isMounted) return;
        setEntries(response.entries);
        setSummary(response.summary);
      } catch (requestError) {
        if (isMounted) setError(errorMessage(requestError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadFilteredEntries();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  const activeWorkType = useMemo(
    () => workTypes.find((type) => String(type.id) === draft.workTypeId),
    [draft.workTypeId, workTypes]
  );

  async function loadCatalog() {
    try {
      const catalog = await getWorkTypes();
      setWorkTypes(catalog);
      setDraft((current) => {
        if (current.workTypeId || catalog.length === 0) return current;
        return {
          ...current,
          workTypeId: String(catalog[0].id),
          unit: catalog[0].defaultUnit
        };
      });
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function loadEntries(nextFilters = filters) {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getEntries(nextFilters);
      setEntries(response.entries);
      setSummary(response.summary);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateDraft(draft);
    setDraftErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    setError(null);
    try {
      const payload = buildEntryPayload(draft);
      if (editingId) {
        await updateEntry(editingId, payload);
      } else {
        await createEntry(payload);
      }
      await loadCatalog();
      resetForm();
      await loadEntries();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    const firstType = workTypes[0];
    setDraft({
      ...createEmptyDraft(),
      workTypeId: firstType ? String(firstType.id) : "",
      customWorkTypeName: "",
      unit: firstType?.defaultUnit ?? ""
    });
    setDraftErrors({});
    setEditingId(null);
  }

  function editEntry(entry: JournalEntry) {
    setEditingId(entry.id);
    setDraft(draftFromEntry(entry));
    setDraftErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removeEntry(entry: JournalEntry) {
    const approved = window.confirm(`Удалить запись за ${formatDate(entry.workDate)}?`);
    if (!approved) return;

    setError(null);
    try {
      await deleteEntry(entry.id);
      if (editingId === entry.id) resetForm();
      await loadEntries();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  function updateDraft<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDraftErrors((current) => ({ ...current, [key]: undefined }));
  }

  function chooseWorkType(value: string) {
    const nextType = workTypes.find((type) => String(type.id) === value);
    setDraft((current) => ({
      ...current,
      workTypeId: value,
      customWorkTypeName: value === CUSTOM_WORK_TYPE_ID ? current.customWorkTypeName : "",
      unit: nextType?.defaultUnit ?? current.unit
    }));
    setDraftErrors((current) => ({
      ...current,
      workTypeId: undefined,
      customWorkTypeName: undefined,
      unit: undefined
    }));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">Строительный объект</div>
          <h1>Журнал выполненных работ</h1>
        </div>
        <button className="ghost-button" onClick={() => void loadEntries()} title="Обновить данные">
          <RefreshCw size={18} />
          <span>Обновить</span>
        </button>
      </header>

      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}

      <section className="workspace">
        <aside className="editor-panel" aria-label="Форма записи">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">{editingId ? "Редактирование" : "Новая запись"}</span>
              <h2>{editingId ? "Обновить объем" : "Зафиксировать работы"}</h2>
            </div>
            {editingId ? (
              <button className="icon-button" onClick={resetForm} title="Отменить редактирование">
                <X size={18} />
              </button>
            ) : (
              <span className="status-pill">
                <Plus size={14} />
                ввод
              </span>
            )}
          </div>

          <form className="entry-form" onSubmit={handleSubmit}>
            <Field label="Дата" error={draftErrors.workDate}>
              <input
                type="date"
                value={draft.workDate}
                onChange={(event) => updateDraft("workDate", event.target.value)}
              />
            </Field>

            <Field label="Вид работ" error={draftErrors.workTypeId}>
              <select value={draft.workTypeId} onChange={(event) => chooseWorkType(event.target.value)}>
                <option value="">Выберите</option>
                {workTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
                <option value={CUSTOM_WORK_TYPE_ID}>Свой вид работ</option>
              </select>
            </Field>

            {draft.workTypeId === CUSTOM_WORK_TYPE_ID ? (
              <Field label="Название вида работ" error={draftErrors.customWorkTypeName}>
                <input
                  value={draft.customWorkTypeName}
                  onChange={(event) => updateDraft("customWorkTypeName", event.target.value)}
                  placeholder="Например, гидроизоляция швов"
                />
              </Field>
            ) : null}

            <div className="form-row">
              <Field label="Объем" error={draftErrors.quantity}>
                <input
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  type="number"
                  value={draft.quantity}
                  onChange={(event) => updateDraft("quantity", event.target.value)}
                  placeholder="24"
                />
              </Field>
              <Field label="Ед." error={draftErrors.unit}>
                <input
                  value={draft.unit}
                  onChange={(event) => updateDraft("unit", event.target.value)}
                  placeholder={activeWorkType?.defaultUnit ?? "м3"}
                />
              </Field>
            </div>

            <Field label="Исполнитель" error={draftErrors.performer}>
              <input
                value={draft.performer}
                onChange={(event) => updateDraft("performer", event.target.value)}
                placeholder="Бригада / подрядчик"
              />
            </Field>

            <Field label="Комментарий">
              <textarea
                value={draft.comment}
                onChange={(event) => updateDraft("comment", event.target.value)}
                placeholder="Захватка, этаж, оси"
                rows={4}
              />
            </Field>

            <div className="form-actions">
              <button className="primary-button" disabled={isSaving} type="submit">
                {editingId ? <Save size={18} /> : <Check size={18} />}
                <span>{isSaving ? "Сохранение" : editingId ? "Сохранить" : "Добавить"}</span>
              </button>
              {editingId ? (
                <button className="secondary-button" onClick={resetForm} type="button">
                  Отмена
                </button>
              ) : null}
            </div>
          </form>
        </aside>

        <section className="journal-panel" aria-label="Список работ">
          <div className="metrics">
            <Metric icon={<ClipboardList size={18} />} label="Записей" value={summary.count} />
            <Metric icon={<CalendarDays size={18} />} label="Общий объем" value={formatNumber(summary.totalQuantity)} />
            <Metric icon={<Search size={18} />} label="Исполнителей" value={summary.uniquePerformers} />
          </div>

          <div className="filters">
            <div className="filter-title">
              <Filter size={17} />
              <span>Период</span>
            </div>
            <label>
              <span>с</span>
              <input
                type="date"
                value={filters.from ?? ""}
                onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value || undefined }))}
              />
            </label>
            <label>
              <span>по</span>
              <input
                type="date"
                value={filters.to ?? ""}
                onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value || undefined }))}
              />
            </label>
            <button className="ghost-button compact" onClick={() => setFilters({})}>
              Сброс
            </button>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Вид работ</th>
                  <th>Объем</th>
                  <th>Исполнитель</th>
                  <th>Комментарий</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <TableState label="Загрузка записей" />
                ) : entries.length === 0 ? (
                  <TableState label="Записей за выбранный период нет" />
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="date-cell" data-label="Дата">
                        {formatDate(entry.workDate)}
                      </td>
                      <td data-label="Вид работ">
                        <strong>{entry.workTypeName}</strong>
                      </td>
                      <td className="quantity-cell" data-label="Объем">
                        {formatNumber(entry.quantity)} <span>{entry.unit}</span>
                      </td>
                      <td data-label="Исполнитель">{entry.performer}</td>
                      <td className="comment-cell" data-label="Комментарий">
                        {entry.comment || "—"}
                      </td>
                      <td data-label="Действия">
                        <div className="row-actions">
                          <button className="icon-button" onClick={() => editEntry(entry)} title="Редактировать">
                            <Pencil size={17} />
                          </button>
                          <button className="icon-button danger" onClick={() => void removeEntry(entry)} title="Удалить">
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function TableState({ label }: { label: string }) {
  return (
    <tr>
      <td className="table-state" colSpan={6}>
        {label}
      </td>
    </tr>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2
  }).format(value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Что-то пошло не так";
}
