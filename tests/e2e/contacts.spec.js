import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?mock=1");
  await expect(page.locator("#contact-list")).toHaveAttribute("aria-busy", "false");
});

test("联系人索引、搜索和详情完整展示", async ({ page }) => {
  await expect(page.locator("#contact-count")).toHaveText("5 位联系人");
  await expect(page.locator("#contact-detail h2")).toHaveText("张三");
  await expect(page.locator("#contact-detail .method-detail")).toHaveCount(4);
  await page.getByRole("searchbox", { name: "搜索联系人" }).fill("王强");
  await expect(page.locator("#contact-count")).toHaveText("1 位联系人");
  await page.getByRole("button", { name: "查看 王强 的详情" }).click();
  await expect(page.locator("#contact-detail h2")).toHaveText("王强");
  await expect(page.locator("#contact-detail")).toContainText("wangqiang_design");
});

test("新增联系人支持同类型多条联系方式", async ({ page }) => {
  await page.getByRole("button", { name: "新增联系人" }).click();
  await page.locator("#contact-name").fill("周测试");
  await page.locator("#contact-company").fill("测试公司");
  await page.getByRole("textbox", { name: "联系方式内容" }).fill("13700000000");
  await page.getByRole("button", { name: "添加联系方式" }).click();
  const rows = page.locator(".method-row");
  await expect(rows).toHaveCount(2);
  await rows.nth(1).getByRole("combobox").selectOption("phone");
  await rows.nth(1).getByRole("textbox", { name: "联系方式内容" }).fill("13700000001");
  await rows.nth(1).getByRole("textbox", { name: "联系方式标签" }).fill("工作手机");
  await page.getByRole("button", { name: "保存联系人" }).click();
  await expect(page.locator("#contact-dialog")).not.toBeVisible();
  await expect(page.locator("#contact-detail h2")).toHaveText("周测试");
  await expect(page.locator("#contact-detail .method-detail")).toHaveCount(2);
});

test("表单错误清晰显示且不会提交无效联系人", async ({ page }) => {
  await page.getByRole("button", { name: "新增联系人" }).click();
  await page.getByRole("button", { name: "保存联系人" }).click();
  await expect(page.locator("#contact-form-errors")).toContainText("请填写联系人姓名");
  await expect(page.locator("#contact-form-errors")).toContainText("第 1 条联系方式的内容不能为空");
  await page.locator("#contact-name").fill("错误邮箱");
  await page.getByRole("combobox", { name: "联系方式类型" }).selectOption("email");
  await page.getByRole("textbox", { name: "联系方式内容" }).fill("not-an-email");
  await page.getByRole("button", { name: "保存联系人" }).click();
  await expect(page.locator("#contact-form-errors")).toContainText("邮箱格式不正确");
});

test("收藏状态可切换并进入收藏页面", async ({ page }) => {
  const row = page.locator('[data-contact-id="3"]');
  await row.getByRole("button", { name: "收藏 王强" }).click();
  await expect(row.getByRole("button", { name: "取消收藏 王强" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/favorites?mock=1");
  await expect(page.locator("#contact-list")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#contact-list")).toContainText("王强");
  await expect(page.locator("#contact-count")).toHaveText("3 位联系人");
});

test("编辑与删除联系人具有完整反馈", async ({ page }) => {
  await page.getByRole("button", { name: "编辑 张三" }).click();
  await page.locator("#contact-company").fill("更新后的公司");
  await page.getByRole("button", { name: "保存联系人" }).click();
  await expect(page.locator("#contact-detail")).toContainText("更新后的公司");
  await page.getByRole("button", { name: "删除联系人" }).click();
  await expect(page.locator("#confirm-dialog")).toBeVisible();
  await page.locator("#confirm-accept").click();
  await expect(page.locator("#contact-list")).not.toContainText("张三");
  await expect(page.locator("#contact-count")).toHaveText("4 位联系人");
});

test("页面无控制台错误且移动端无横向溢出", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload();
  await expect(page.locator("#contact-list")).toHaveAttribute("aria-busy", "false");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await expect(page.getByRole("button", { name: "新增联系人" })).toBeVisible();
  expect(errors).toEqual([]);
});
