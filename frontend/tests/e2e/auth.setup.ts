import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";

const AUTH_FILE = "tests/e2e/.auth/admin.json";
const STORAGE_KEY = "labsync-auth";

test("authenticate as admin and persist storage state", async ({ page, request }) => {
  const loginRes = await request.post("/api/auth/login", {
    data: { username: "admin", password: "admin" },
  });
  expect(loginRes.ok(), `Login failed with status ${loginRes.status()}`).toBeTruthy();
  const loginData = (await loginRes.json()) as {
    token: string;
    role: string;
    roles?: string[];
    full_name: string;
    must_change_password?: boolean;
  };

  let token = loginData.token;
  if (loginData.must_change_password) {
    const changeRes = await request.post("/api/auth/change-password", {
      headers: { Authorization: `Bearer ${token}` },
      data: { current_password: "admin", new_password: "Admin12345!" },
    });
    expect(changeRes.ok(), `Password change failed with status ${changeRes.status()}`).toBeTruthy();
    const changeData = (await changeRes.json()) as {
      token: string;
      role: string;
      roles?: string[];
      full_name: string;
      must_change_password?: boolean;
    };
    token = changeData.token;
  }

  const authUser = {
    token,
    role: loginData.role,
    roles: loginData.roles ?? [loginData.role],
    fullName: loginData.full_name,
    mustChangePassword: false,
  };

  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: STORAGE_KEY, value: JSON.stringify(authUser) },
  );

  await page.goto("/board");
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Admin view|Админ/i);

  await page.goto("/login");

  await fs.mkdir("tests/e2e/.auth", { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
