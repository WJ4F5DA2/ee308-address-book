import test from "node:test";
import assert from "node:assert/strict";
import { matchesSearch, validateContact, validateExcelFile } from "../../app/static/js/validation.js";

const validContact = { name: "张三", methods: [{ type: "phone", value: "13800000000", label: "手机" }] };

test("联系人姓名和至少一条联系方式为必填项", () => {
  assert.deepEqual(validateContact(validContact), []);
  assert.match(validateContact({ name: "", methods: [] }).join("\n"), /姓名/);
  assert.match(validateContact({ name: "张三", methods: [] }).join("\n"), /至少添加一条/);
});

test("邮箱和电话格式校验", () => {
  const badEmail = { name: "张三", methods: [{ type: "email", value: "invalid" }] };
  const badPhone = { name: "张三", methods: [{ type: "phone", value: "abc" }] };
  assert.match(validateContact(badEmail)[0], /邮箱格式/);
  assert.match(validateContact(badPhone)[0], /电话格式/);
});

test("搜索覆盖公司、备注及所有联系方式", () => {
  const contact = { ...validContact, company: "福州大学", remark: "结对成员" };
  for (const query of ["张三", "福州", "结对", "138000", "手机"]) {
    assert.equal(matchesSearch(contact, query), true, query);
  }
  assert.equal(matchesSearch(contact, "不存在"), false);
  assert.equal(matchesSearch(contact, "  "), true);
});

test("Excel 仅接受非空且不超过 10 MB 的 xlsx 文件", () => {
  assert.equal(validateExcelFile({ name: "contacts.xlsx", size: 1024 }), null);
  assert.match(validateExcelFile(null), /请选择/);
  assert.match(validateExcelFile({ name: "contacts.xls", size: 10 }), /仅支持/);
  assert.match(validateExcelFile({ name: "empty.xlsx", size: 0 }), /不能为空/);
  assert.match(validateExcelFile({ name: "large.xlsx", size: 11 * 1024 * 1024 }), /10 MB/);
});
