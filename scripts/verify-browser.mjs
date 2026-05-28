import { chromium } from "playwright";

const appUrl = process.env.APP_URL ?? "http://localhost:5173/";
const marker = Date.now();
const initialPerformer = `Автопроверка-${marker}`;
const updatedPerformer = `Автопроверка-обновлено-${marker}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.locator("select").selectOption({ label: "Монтаж опалубки" });
  await page.locator("input[type=number]").fill("24");
  await page.getByLabel("Исполнитель").fill(initialPerformer);
  await page.getByLabel("Комментарий").fill("Ось А-Г, этаж 3");
  await page.getByRole("button", { name: "Добавить" }).click();
  await page.getByText(initialPerformer).waitFor({ timeout: 5000 });

  await page.locator("tr", { hasText: initialPerformer }).getByTitle("Редактировать").click();
  await page.locator("input[type=number]").fill("31.5");
  await page.getByLabel("Исполнитель").fill(updatedPerformer);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await page.getByText(updatedPerformer).waitFor({ timeout: 5000 });

  page.on("dialog", (dialog) => dialog.accept());
  await page.locator("tr", { hasText: updatedPerformer }).getByTitle("Удалить").click();
  await page.getByText(updatedPerformer).waitFor({ state: "hidden", timeout: 5000 });
  await page.screenshot({ path: "/tmp/work-journal-browser-check.png", fullPage: true });
  console.log("browser flow ok");
} finally {
  await browser.close();
}
