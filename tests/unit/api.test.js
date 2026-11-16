import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, createContactApi } from "../../app/static/js/api.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("联系人列表与收藏列表使用约定接口", async () => {
  const calls = [];
  const api = createContactApi(async (path) => { calls.push(path); return jsonResponse({ success: true, data: [] }); });
  await api.list();
  await api.list(true);
  assert.deepEqual(calls, ["/api/contacts", "/api/favorites"]);
});

test("新增与修改联系人发送 JSON 请求体", async () => {
  const calls = [];
  const api = createContactApi(async (path, options) => { calls.push({ path, options }); return jsonResponse({ success: true, data: { id: 1 } }); });
  await api.create({ name: "张三", methods: [] });
  await api.update(7, { name: "李四", methods: [] });
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.body, JSON.stringify({ name: "张三", methods: [] }));
  assert.equal(calls[1].path, "/api/contacts/7");
  assert.equal(calls[1].options.method, "PUT");
  assert.equal(calls[0].options.headers.get("Content-Type"), "application/json");
});

test("收藏和取消收藏分别使用 POST 与 DELETE", async () => {
  const methods = [];
  const api = createContactApi(async (_path, options) => { methods.push(options.method); return jsonResponse({ success: true, data: null }); });
  await api.setFavorite(3, true);
  await api.setFavorite(3, false);
  assert.deepEqual(methods, ["POST", "DELETE"]);
});

test("统一错误响应保留后端消息与状态码", async () => {
  const api = createContactApi(async () => jsonResponse({ success: false, message: "联系人不存在", data: null }, 404));
  await assert.rejects(api.get(99), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, "联系人不存在");
    assert.equal(error.status, 404);
    return true;
  });
});

test("Excel 导入使用 file 表单字段", async () => {
  let uploaded;
  const api = createContactApi(async (_path, options) => { uploaded = options.body; return jsonResponse({ success: true, data: { success_count: 1 } }); });
  const file = new File(["xlsx"], "contacts.xlsx");
  const result = await api.importExcel(file);
  assert.ok(uploaded instanceof FormData);
  assert.equal(uploaded.get("file"), file);
  assert.equal(result.success_count, 1);
});

test("Excel 导出读取文件及响应文件名", async () => {
  const api = createContactApi(async () => new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { "Content-Disposition": "attachment; filename*=UTF-8''ContactHub-demo.xlsx" },
  }));
  const result = await api.exportExcel();
  assert.equal(result.filename, "ContactHub-demo.xlsx");
  assert.equal(result.blob.size, 3);
});
