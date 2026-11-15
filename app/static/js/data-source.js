import { contactApi } from "./api.js";
import { isMockMode } from "./common.js";
import { createMockApi } from "./mock-api.js";

export const api = isMockMode ? createMockApi() : contactApi;
