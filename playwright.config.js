import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: "integration.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "msedge",
    viewport: { width: 1440, height: 960 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "python3 tests/frontend/preview_server.py",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 15000,
  },
});
