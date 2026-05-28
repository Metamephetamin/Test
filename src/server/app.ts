import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  findOrCreateWorkType,
  getEntryById,
  listWorkTypes,
  toJournalEntry,
  workTypeExists,
  type AppDatabase
} from "./db";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const entryInputSchema = z.object({
  workDate: isoDateSchema,
  workTypeId: z.coerce.number().int().positive().optional(),
  workTypeName: z.string().trim().min(1).max(120).optional(),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(24),
  performer: z.string().trim().min(1).max(120),
  comment: z.string().trim().max(500).optional().default("")
}).superRefine((value, context) => {
  if (!value.workTypeId && !value.workTypeName) {
    context.addIssue({
      code: "custom",
      path: ["workTypeId"],
      message: "Work type id or name is required"
    });
  }
});

const filtersSchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional()
});

export function createApp(database: AppDatabase) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.get("/api/work-types", (_request, response) => {
    response.json({ workTypes: listWorkTypes(database) });
  });

  app.get("/api/entries", (request, response) => {
    const filters = filtersSchema.safeParse(request.query);

    if (!filters.success) {
      response.status(400).json({
        error: "VALIDATION_ERROR",
        fields: uniqueFields(filters.error.issues)
      });
      return;
    }

    const where: string[] = [];
    const params: Record<string, string> = {};

    if (filters.data.from) {
      where.push("e.work_date >= @from");
      params.from = filters.data.from;
    }

    if (filters.data.to) {
      where.push("e.work_date <= @to");
      params.to = filters.data.to;
    }

    const rows = (
      database.sqlite
      .prepare(
        `
        SELECT
          e.id,
          e.work_date,
          e.work_type_id,
          wt.name AS work_type_name,
          e.quantity,
          e.unit,
          e.performer,
          e.comment,
          e.created_at,
          e.updated_at
        FROM journal_entries e
        JOIN work_types wt ON wt.id = e.work_type_id
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY e.work_date DESC, e.id DESC
      `
      )
        .all(params) as Parameters<typeof toJournalEntry>[0][]
    ).map(toJournalEntry);

    const totalQuantity = rows.reduce((sum, entry) => sum + entry.quantity, 0);
    const uniquePerformers = new Set(rows.map((entry) => entry.performer)).size;

    response.json({
      entries: rows,
      summary: {
        count: rows.length,
        totalQuantity,
        uniquePerformers
      }
    });
  });

  app.post("/api/entries", (request, response) => {
    const payload = parseEntryPayload(request.body);

    if (!payload.success) {
      response.status(400).json(payload.error);
      return;
    }

    const workTypeId = resolveWorkTypeId(database, payload.data);
    if (!workTypeId) {
      response.status(400).json({ error: "UNKNOWN_WORK_TYPE", fields: ["workTypeId"] });
      return;
    }

    const result = database.sqlite
      .prepare(
        `
        INSERT INTO journal_entries (work_date, work_type_id, quantity, unit, performer, comment)
        VALUES (@workDate, @workTypeId, @quantity, @unit, @performer, @comment)
      `
      )
      .run({ ...payload.data, workTypeId });

    response.status(201).json({ entry: getEntryById(database, Number(result.lastInsertRowid)) });
  });

  app.put("/api/entries/:id", (request, response) => {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      response.status(404).json({ error: "ENTRY_NOT_FOUND" });
      return;
    }

    const payload = parseEntryPayload(request.body);

    if (!payload.success) {
      response.status(400).json(payload.error);
      return;
    }

    const workTypeId = resolveWorkTypeId(database, payload.data);
    if (!workTypeId) {
      response.status(400).json({ error: "UNKNOWN_WORK_TYPE", fields: ["workTypeId"] });
      return;
    }

    const result = database.sqlite
      .prepare(
        `
        UPDATE journal_entries
        SET
          work_date = @workDate,
          work_type_id = @workTypeId,
          quantity = @quantity,
          unit = @unit,
          performer = @performer,
          comment = @comment,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `
      )
      .run({ ...payload.data, workTypeId, id });

    if (result.changes === 0) {
      response.status(404).json({ error: "ENTRY_NOT_FOUND" });
      return;
    }

    response.json({ entry: getEntryById(database, id) });
  });

  app.delete("/api/entries/:id", (request, response) => {
    const id = Number(request.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      response.status(404).json({ error: "ENTRY_NOT_FOUND" });
      return;
    }

    const result = database.sqlite.prepare("DELETE FROM journal_entries WHERE id = ?").run(id);

    if (result.changes === 0) {
      response.status(404).json({ error: "ENTRY_NOT_FOUND" });
      return;
    }

    response.status(204).send();
  });

  return app;
}

function parseEntryPayload(body: unknown) {
  const parsed = entryInputSchema.safeParse(body);

  if (!parsed.success) {
    return {
      success: false as const,
      error: {
        error: "VALIDATION_ERROR",
        fields: uniqueFields(parsed.error.issues)
      }
    };
  }

  return {
    success: true as const,
    data: parsed.data
  };
}

function uniqueFields(issues: z.core.$ZodIssue[]) {
  return Array.from(new Set(issues.map((issue) => String(issue.path[0] ?? "body"))));
}

function resolveWorkTypeId(
  database: AppDatabase,
  payload: { workTypeId?: number; workTypeName?: string; unit: string }
) {
  if (payload.workTypeId) {
    return workTypeExists(database, payload.workTypeId) ? payload.workTypeId : null;
  }

  if (payload.workTypeName) {
    return findOrCreateWorkType(database, payload.workTypeName, payload.unit).id;
  }

  return null;
}
