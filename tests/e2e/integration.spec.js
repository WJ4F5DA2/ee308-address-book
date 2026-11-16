import { test, expect } from "@playwright/test";
import path from "node:path";

const fixture = path.resolve("tests/fixtures/valid-contacts.xlsx");

test.beforeEach(async ({ page }) => {
  const response = await page.request.get("/api/contacts");
  const payload = await response.json();
  for (const contact of payload.data) {
    await page.request.delete(`/api/contacts/${contact.id}`);
  }
});

test("真实后端完成新增、持久化、收藏、编辑和删除", async ({ page }) => {
  const errors = [];
  const badResponses = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 500) badResponses.push(response.url()); });
  await page.goto("/");
  await expect(page.locator(".empty-state")).toContainText("通讯录还是空的");
  await page.getByRole("button", { name: "新增联系人" }).click();
  await page.locator("#contact-name").fill("联调用户");
  await page.locator("#contact-company").fill("福州大学");
  await page.getByRole("textbox", { name: "联系方式内容" }).fill("13700000000");
  await page.getByRole("button", { name: "添加联系方式" }).click();
  const second = page.locator(".method-row").nth(1);
  await second.getByRole("combobox").selectOption("email");
  await second.getByRole("textbox", { name: "联系方式内容" }).fill("integration@example.com");
  await page.getByRole("button", { name: "保存联系人" }).click();
  await expect(page.locator("#contact-detail h2")).toHaveText("联调用户");
  await expect(page.locator("#contact-detail .method-detail")).toHaveCount(2);
  await page.reload();
  await expect(page.locator("#contact-list")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#contact-list")).toContainText("联调用户");
  await page.getByRole("button", { name: "收藏 联调用户" }).click();
  await page.goto("/favorites");
  await expect(page.locator("#contact-list")).toContainText("联调用户");
  await page.getByRole("button", { name: "编辑 联调用户" }).click();
  await page.locator("#contact-position").fill("测试工程师");
  await page.getByRole("button", { name: "保存联系人" }).click();
  await expect(page.locator("#contact-detail")).toContainText("测试工程师");
  await page.getByRole("button", { name: "删除联系人" }).click();
  await page.locator("#confirm-accept").click();
  await expect(page.locator(".empty-state")).toContainText("还没有收藏联系人");
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
});

test("真实 Excel 导入、列表落库和导出下载", async ({ page }) => {
  await page.goto("/excel");
  await page.locator("#excel-file").setInputFiles(fixture);
  await page.getByRole("button", { name: "开始导入" }).click();
  await expect(page.locator("#import-result")).toContainText("成功 1 条，失败 0 条");
  await page.goto("/");
  await expect(page.locator("#contact-list")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#contact-list")).toContainText("测试用户");
  await expect(page.locator("#contact-detail .method-detail")).toHaveCount(5);
  await page.goto("/excel");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部联系人" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ContactHub.xlsx");
  expect(await download.failure()).toBeNull();
  const filePath = await download.path();
  expect(filePath).not.toBeNull();
});
