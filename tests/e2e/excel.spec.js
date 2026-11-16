import { test, expect } from "@playwright/test";
import path from "node:path";

const fixture = path.resolve("tests/fixtures/valid-contacts.xlsx");

test.beforeEach(async ({ page }) => {
  await page.goto("/excel?mock=1");
});

test("错误扩展名与空文件在前端被阻止", async ({ page }) => {
  await page.locator("#excel-file").setInputFiles({ name: "contacts.xls", mimeType: "application/vnd.ms-excel", buffer: Buffer.from("bad") });
  await expect(page.locator("#import-errors")).toContainText("仅支持 .xlsx");
  await expect(page.locator("#import-contacts")).toBeDisabled();
  await page.locator("#excel-file").setInputFiles({ name: "empty.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.alloc(0) });
  await expect(page.locator("#import-errors")).toContainText("文件不能为空");
});

test("有效文件显示导入结果，导出按钮触发 xlsx 下载", async ({ page }) => {
  await page.locator("#excel-file").setInputFiles(fixture);
  await expect(page.locator("#selected-file")).toContainText("valid-contacts.xlsx");
  await page.getByRole("button", { name: "开始导入" }).click();
  await expect(page.locator("#import-result")).toContainText("成功 3 条，失败 0 条");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出全部联系人" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ContactHub-demo.xlsx");
  expect(await download.failure()).toBeNull();
});

test("模板下载和全部导航入口均可用", async ({ page }) => {
  const templatePromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "下载标准模板" }).click();
  expect((await templatePromise).suggestedFilename()).toBe("contacthub-template.xlsx");
  await page.getByRole("link", { name: "使用说明" }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "使用说明" })).toBeVisible();
});
