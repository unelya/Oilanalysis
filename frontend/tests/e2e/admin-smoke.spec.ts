import { expect, test } from "@playwright/test";

test("admin page renders users and event log blocks", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /Users & roles|Пользователи и роли/i })).toBeVisible();
  await expect(page.getByText(/Event log|Журнал событий/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Create user|Создать пользователя/i })).toBeVisible();
});
