import { expect, test } from "@playwright/test";

test("language switch works and settings language is read-only", async ({ page }) => {
  await page.goto("/board");

  await page.getByRole("button", { name: "Language" }).click();
  await page.getByRole("button", { name: "RU", exact: true }).click();

  await expect(page.getByRole("link", { name: "Доска" })).toBeVisible();

  await page.goto("/settings");

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByText(/Язык|Language/i)).toBeVisible();
  await expect(page.getByText("Русский")).toBeVisible();
  await expect(page.locator("select")).toHaveCount(0);
});
