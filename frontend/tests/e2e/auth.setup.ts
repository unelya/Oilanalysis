import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";

const AUTH_FILE = "tests/e2e/.auth/admin.json";

test("authenticate as admin and persist storage state", async ({ page }) => {
  await page.goto("/login");

  await page.locator("#username").fill("admin");
  await page.locator("#password").fill("admin");
  await page.getByRole("button", { name: /Sign in|Вход/i }).click();

  const currentPassword = page.locator("#current-password");
  const loginError = page.locator("text=/Invalid username or password|Неверное имя пользователя или пароль/i");

  // Login can lead either directly to /board or to forced password change on /login.
  await expect(async () => {
    const onBoard = /\/board$/.test(page.url());
    const mustChangePassword = await currentPassword.isVisible().catch(() => false);
    const hasLoginError = await loginError.isVisible().catch(() => false);
    expect(hasLoginError, "Login failed for bootstrap admin user").toBeFalsy();
    expect(onBoard || mustChangePassword).toBeTruthy();
  }).toPass({ timeout: 30_000 });

  const mustChangePassword = await currentPassword.isVisible().catch(() => false);

  if (mustChangePassword) {
    await currentPassword.fill("admin");
    await page.locator("#new-password").fill("Admin12345!");
    await page.locator("#confirm-password").fill("Admin12345!");
    await page.getByRole("button", { name: /Update password|Обновить пароль/i }).click();
    await page.waitForURL(/\/board$/, { timeout: 30_000 });
  }

  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Admin view|Админ/i);

  await fs.mkdir("tests/e2e/.auth", { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
