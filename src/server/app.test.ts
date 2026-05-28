import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createTestDatabase, type AppDatabase } from "./db";

let database: AppDatabase;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  database = createTestDatabase();
  app = createApp(database);
});

afterEach(() => {
  database.close();
});

describe("work journal API", () => {
  it("creates, lists and summarizes journal entries", async () => {
    const createResponse = await request(app)
      .post("/api/entries")
      .send({
        workDate: "2026-05-28",
        workTypeId: 1,
        quantity: 24,
        unit: "м3",
        performer: "Бригада Монолит-2",
        comment: "Ось А-Г, этаж 3"
      })
      .expect(201);

    expect(createResponse.body.entry).toMatchObject({
      id: expect.any(Number),
      workDate: "2026-05-28",
      workTypeName: "Кладка перегородок",
      quantity: 24,
      unit: "м3",
      performer: "Бригада Монолит-2"
    });

    const listResponse = await request(app).get("/api/entries").expect(200);

    expect(listResponse.body.entries).toHaveLength(1);
    expect(listResponse.body.summary).toMatchObject({
      count: 1,
      totalQuantity: 24
    });
  });

  it("validates required fields before saving an entry", async () => {
    const response = await request(app)
      .post("/api/entries")
      .send({
        workDate: "",
        workTypeId: 1,
        quantity: 0,
        unit: "",
        performer: ""
      })
      .expect(400);

    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(response.body.fields).toEqual(
      expect.arrayContaining(["workDate", "quantity", "unit", "performer"])
    );
  });

  it("creates a catalog work type when a custom work name is submitted", async () => {
    const createResponse = await request(app)
      .post("/api/entries")
      .send({
        workDate: "2026-05-28",
        workTypeName: "Гидроизоляция швов",
        quantity: 42,
        unit: "м.п.",
        performer: "ООО Изолстрой"
      })
      .expect(201);

    expect(createResponse.body.entry).toMatchObject({
      workTypeId: expect.any(Number),
      workTypeName: "Гидроизоляция швов",
      quantity: 42,
      unit: "м.п."
    });

    const catalogResponse = await request(app).get("/api/work-types").expect(200);
    expect(catalogResponse.body.workTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Гидроизоляция швов",
          defaultUnit: "м.п."
        })
      ])
    );
  });

  it("filters entries by inclusive date range sorted by newest date", async () => {
    await request(app).post("/api/entries").send({
      workDate: "2026-05-27",
      workTypeId: 2,
      quantity: 10,
      unit: "м2",
      performer: "Иван Петров"
    });
    await request(app).post("/api/entries").send({
      workDate: "2026-05-28",
      workTypeId: 3,
      quantity: 8,
      unit: "шт",
      performer: "ООО Вертикаль"
    });
    await request(app).post("/api/entries").send({
      workDate: "2026-05-29",
      workTypeId: 1,
      quantity: 4,
      unit: "м3",
      performer: "Смена 1"
    });

    const response = await request(app)
      .get("/api/entries?from=2026-05-28&to=2026-05-29")
      .expect(200);

    expect(response.body.entries.map((entry: { workDate: string }) => entry.workDate)).toEqual([
      "2026-05-29",
      "2026-05-28"
    ]);
    expect(response.body.summary).toMatchObject({
      count: 2,
      totalQuantity: 12
    });
  });

  it("updates and deletes an existing entry", async () => {
    const created = await request(app).post("/api/entries").send({
      workDate: "2026-05-28",
      workTypeId: 1,
      quantity: 24,
      unit: "м3",
      performer: "Бригада Монолит-2"
    });

    const id = created.body.entry.id;

    const updated = await request(app)
      .put(`/api/entries/${id}`)
      .send({
        workDate: "2026-05-28",
        workTypeId: 4,
        quantity: 31.5,
        unit: "м.п.",
        performer: "Бригада фасадчиков"
      })
      .expect(200);

    expect(updated.body.entry).toMatchObject({
      id,
      workTypeName: "Армирование",
      quantity: 31.5,
      performer: "Бригада фасадчиков"
    });

    await request(app).delete(`/api/entries/${id}`).expect(204);
    const listResponse = await request(app).get("/api/entries").expect(200);
    expect(listResponse.body.entries).toHaveLength(0);
  });

  it("returns a seeded work type catalog", async () => {
    const response = await request(app).get("/api/work-types").expect(200);

    expect(response.body.workTypes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, name: "Кладка перегородок", defaultUnit: "м3" }),
        expect.objectContaining({ id: 2, name: "Монтаж опалубки", defaultUnit: "м2" })
      ])
    );
  });
});
