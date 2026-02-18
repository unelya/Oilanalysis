import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";

const AUTH_FILE = "tests/e2e/.auth/admin.json";
const STORAGE_KEY = "labsync-auth";
const BACKEND_BASE_URL = "http://127.0.0.1:8000";

test("authenticate as admin and persist storage state", async ({ page, request }) => {
  const loginRes = await request.post(`${BACKEND_BASE_URL}/auth/login`, {
    data: { username: "admin", password: "admin" },
  });
  if (!loginRes.ok()) {
    const body = await loginRes.text();
    throw new Error(`Login failed with status ${loginRes.status()}: ${body}`);
  }
  const loginData = (await loginRes.json()) as {
    token: string;
    role: string;
    roles?: string[];
    full_name: string;
    must_change_password?: boolean;
  };

  let token = loginData.token;
  if (loginData.must_change_password) {
    const changeRes = await request.post(`${BACKEND_BASE_URL}/auth/change-password`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { current_password: "admin", new_password: "Admin12345!" },
    });
    if (!changeRes.ok()) {
      const body = await changeRes.text();
      throw new Error(`Password change failed with status ${changeRes.status()}: ${body}`);
    }
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
