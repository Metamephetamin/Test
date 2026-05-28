import { describe, expect, it } from "vitest";
import { buildEntryPayload, createEmptyDraft, validateDraft } from "./form";

describe("journal form model", () => {
  it("reports required fields before an entry is submitted", () => {
    const result = validateDraft({
      ...createEmptyDraft(),
      workDate: "",
      workTypeId: "",
      quantity: "",
      unit: "",
      performer: ""
    });

    expect(result).toEqual({
      workDate: "Укажите дату",
      workTypeId: "Выберите вид работ",
      quantity: "Укажите объем больше 0",
      unit: "Укажите единицу",
      performer: "Укажите исполнителя"
    });
  });

  it("converts a valid draft into an API payload", () => {
    const payload = buildEntryPayload({
      workDate: "2026-05-28",
      workTypeId: "2",
      quantity: "18.5",
      unit: "м2",
      performer: "ООО Вертикаль",
      comment: "Секция Б"
    });

    expect(payload).toEqual({
      workDate: "2026-05-28",
      workTypeId: 2,
      quantity: 18.5,
      unit: "м2",
      performer: "ООО Вертикаль",
      comment: "Секция Б"
    });
  });
});
