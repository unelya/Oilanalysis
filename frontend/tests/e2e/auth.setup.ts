import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";

const AUTH_FILE = "tests/e2e/.auth/admin.json";

test("authenticate as admin and persist storage state", async ({ page }) => {
  await page.goto("/login");

  await page.locator("#username").fill("admin");
  await page.locator("#password").fill("admin");
  await page.getByRole("button", { name: /Sign in|Вход/i }).click();

  // Login can lead either directly to /board or to forced password change on /login.
  await Promise.race([
    page.waitForURL(/\/board$/, { timeout: 15_000 }),
    page.locator("#current-password").waitFor({ state: "visible", timeout: 15_000 }),
  ]);

  const mustChangePassword = await page.locator("#current-password").isVisible().catch(() => false);

  if (mustChangePassword) {
    await page.locator("#current-password").fill("admin");
    await page.locator("#new-password").fill("Admin12345!");
    await page.locator("#confirm-password").fill("Admin12345!");
    await page.getByRole("button", { name: /Update password|Обновить пароль/i }).click();
    await page.waitForURL(/\/board$/, { timeout: 15_000 });
  }

  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Admin view");

  await fs.mkdir("tests/e2e/.auth", { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
