import { expect, test } from "@playwright/test";

const selectRole = async (page: import("@playwright/test").Page, roleLabel: string) => {
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: roleLabel, exact: true }).click();
};

test("admin can switch board role views from top bar", async ({ page }) => {
  await page.goto("/board");

  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toContainText("Admin view");

  await selectRole(page, "Warehouse");
  await expect(title).toContainText("Warehouse view");

  await selectRole(page, "Lab Operator");
  await expect(title).toContainText("Lab view");

  await selectRole(page, "Action");
  await expect(title).toContainText("Action supervision view");
});

