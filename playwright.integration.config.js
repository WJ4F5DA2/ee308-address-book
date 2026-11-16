import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "integration.spec.js",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4174",
    channel: "msedge",
    viewport: { width: 1440, height: 960 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: ".venv\\Scripts\\python.exe tests/frontend/integration_server.py",
    url: "http://127.0.0.1:4174/api/contacts",
    reuseExistingServer: false,
    timeout: 15000,
  },
});
