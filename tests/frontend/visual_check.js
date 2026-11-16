import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const output = "test-results/visual";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
const badResponses = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("response", (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });

await page.goto("http://127.0.0.1:4173/?mock=1");
await page.locator("#contact-list[aria-busy='false']").waitFor();
await page.screenshot({ path: `${output}/desktop-contacts.png`, fullPage: true });
const metrics = await page.evaluate(() => {
  const resources = performance.getEntriesByType("resource");
  return {
    requests: resources.length + 1,
    transferBytes: resources.reduce((total, item) => total + (item.transferSize || 0), 0),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
await page.getByRole("button", { name: "新增联系人" }).click();
await page.screenshot({ path: `${output}/desktop-form.png`, fullPage: true });
await page.getByRole("button", { name: "关闭联系人表单" }).click();
await page.goto("http://127.0.0.1:4173/excel?mock=1");
await page.screenshot({ path: `${output}/desktop-excel.png`, fullPage: true });
await page.setViewportSize({ width: 375, height: 812 });
await page.goto("http://127.0.0.1:4173/?mock=1");
await page.locator("#contact-list[aria-busy='false']").waitFor();
await page.screenshot({ path: `${output}/mobile-contacts.png`, fullPage: true });
const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
console.log(JSON.stringify({ errors, badResponses, metrics, mobileOverflow }));
await browser.close();
if (errors.length || badResponses.length || metrics.horizontalOverflow || mobileOverflow) process.exitCode = 1;
