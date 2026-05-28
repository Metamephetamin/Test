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

  it("requires a custom work type name when custom mode is selected", () => {
    const result = validateDraft({
      ...createEmptyDraft(),
      workTypeId: "custom",
      customWorkTypeName: "",
      quantity: "12",
      unit: "м2",
      performer: "Бригада 1"
    });

    expect(result).toMatchObject({
      customWorkTypeName: "Укажите свой вид работ"
    });
  });

  it("converts a valid draft into an API payload", () => {
    const payload = buildEntryPayload({
      workDate: "2026-05-28",
      workTypeId: "2",
      customWorkTypeName: "",
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

  it("converts a custom work type draft into an API payload", () => {
    const payload = buildEntryPayload({
      workDate: "2026-05-28",
      workTypeId: "custom",
      customWorkTypeName: "Устройство временного ограждения",
      quantity: "36",
      unit: "м.п.",
      performer: "Смена 2",
      comment: ""
    });

    expect(payload).toEqual({
      workDate: "2026-05-28",
      workTypeName: "Устройство временного ограждения",
      quantity: 36,
      unit: "м.п.",
      performer: "Смена 2",
      comment: ""
    });
  });
});
