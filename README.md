# ContactHub 前端与测试

本目录当前包含通讯录作业的前端页面、交互脚本、Excel 模板和前端测试。后端、数据库及云服务器由另一位成员提供，本项目不包含也不需要任何服务器密钥。

## 已实现

- 全部联系人：列表、搜索、新增、编辑、删除和详情展示；
- 收藏：列表与详情中收藏/取消收藏，收藏页同步展示；
- 多联系方式：电话、邮箱、社交账号、邮寄地址，同类型支持多条；
- Excel 页面：`.xlsx` 文件选择、拖放、格式/大小校验、导入结果和错误行展示、文件下载；
- 加载、空数据、接口异常、表单错误和操作成功反馈；
- 桌面双栏与移动端单栏布局，键盘焦点和原生对话框支持。

## 目录

```text
app/
├── templates/          # Flask Jinja 模板
├── static/css/         # 页面样式
├── static/js/          # 原生 ES Module 交互与 API 适配
└── static/samples/     # 标准 Excel 模板
tests/
├── unit/               # Node.js 校验与 API 单元测试
├── e2e/                # Playwright 页面测试
├── fixtures/           # 浏览器测试 Excel 文件
└── frontend/           # 仅用于前端预览和测试的工具
docs/frontend-testing.md
```

## 与后端联调

将 `app/templates`、`app/static` 合并到对方的 Flask 工程中，页面路由为：

```text
/           全部联系人
/favorites  收藏联系人
/excel      Excel 管理
/about      使用说明
```

前端默认请求同源 API，接口遵循团队方案：`/api/contacts`、`/api/favorites`、`/api/contacts/<id>/favorite`、`/api/contacts/import`、`/api/contacts/export`。列表接口的 `data` 可直接返回数组，也兼容 `{ "items": [] }`。

Excel 导入响应建议使用：

```json
{
  "success": true,
  "message": "导入完成",
  "data": {
    "success_count": 3,
    "failed_count": 1,
    "errors": [{ "row": 4, "message": "姓名为空" }]
  }
}
```

## 无后端页面预览

仅用于前端开发，不实现数据库或后端 API：

```bash
python3 tests/frontend/preview_server.py
```

访问 `http://127.0.0.1:4173/?mock=1`。模拟数据只保存在当前浏览器标签页的 `sessionStorage`，不会写入数据库。模拟导入只验证前端流程，模拟导出下载标准模板；真实 Excel 解析与导出必须由后端验收。

## 测试

需要 Node.js 20+、本机 Microsoft Edge，以及 Python 环境中的 Flask、OpenPyXL。

```bash
# 首次生成测试 Excel 文件
python3 tests/frontend/create_excel_fixture.py

npm install
npm test
npm run test:e2e
```

测试结果和分工边界见 `docs/frontend-testing.md`。
