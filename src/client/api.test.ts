import { afterEach, describe, expect, it, vi } from "vitest";
import { getEntries } from "./api";

describe("api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps browser network failures to a user-facing message", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Load failed"));

    await expect(getEntries({})).rejects.toThrow(
      "Не удалось подключиться к API. Проверьте, что сервер запущен, и нажмите «Обновить»."
    );
  });
});
