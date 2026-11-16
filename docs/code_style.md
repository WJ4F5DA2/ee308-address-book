# ContactHub 代码规范

整理于 2026-11-16。依据 ContactHub v1.0.0（`9c68c0d`）的 Python、JavaScript、模板与测试，以及开工计划的 API 和 Git 提交约定补写。

## 文件职责

| 文件或目录 | 职责 |
| --- | --- |
| `app/__init__.py` | 创建 Flask 应用，注册蓝图、页面路由与错误处理 |
| `app/api.py` | HTTP 请求解析、响应与写入事务 |
| `app/db.py`、`app/validation.py` | SQLite 数据存取和联系人字段校验 |
| `app/excel.py` | 工作簿表头、单元格与联系人结构之间的转换 |
| `app/templates/`、`app/static/` | Jinja 模板、样式与浏览器交互 |
| `tests/backend/`、`tests/unit/`、`tests/e2e/` | 后端、前端单元和浏览器测试 |

## Python 与 SQLite

- Python 使用四空格缩进。函数和变量使用 `snake_case`，模块常量使用 `UPPER_SNAKE_CASE`。按标准库、第三方和项目模块组织导入。
- 请求和导入数据经过联系人校验。电话、邮箱、社交账号和邮寄地址统一使用 `{type, value, label}`，电话值保存为字符串。
- SQL 参数用 `?` 绑定。连接启用外键。联系人和联系方式的多步写入放在同一个事务中，避免部分更新。删除联系人时由外键级联清理联系方式。
- 中文用户提示写清失败原因。针对顺序、转义、事务等容易误读的约束补简短注释。
- SQLite 文件使用应用配置指定。测试使用隔离数据库，提交前排除数据库、真实通讯录、环境文件和临时下载。

## API 与工作簿

- JSON 接口统一返回 `success`、`message`、`data`。创建使用 201，参数校验失败使用 400，记录缺失使用 404，上传超限使用 413。
- 收藏与取消收藏分别由 `POST` 和 `DELETE /api/contacts/<id>/favorite` 处理。普通联系人编辑保持已有收藏状态。
- Excel 读写共用表头映射。上传字段为 `file`，文件格式为 `.xlsx`。整表格式错误返回失败，行级校验错误返回实际 Excel 行号。有效行统一写入。
- 导出每位联系人占一行。电话保留文本格式。同类多值用英文分号分隔并转义值中的特殊字符。往返测试同时检查标签、联系方式顺序、收藏状态和号码前导零。
- 调整路径、字段、表头或错误结构时，同步更新调用方、说明与相关测试。

## JavaScript、HTML 与 CSS

- JavaScript 使用 ES modules、两空格缩进、双引号和语句末尾分号。函数与变量使用 `camelCase`，常量使用 `UPPER_SNAKE_CASE`。优先用 `const`，确需重新赋值时用 `let`。
- API 请求集中于 `api.js`。页面模块负责事件、状态和渲染。联系人输入校验复用 `validation.js`，后端保留最终校验。
- 页面共用 `base.html`。操作入口使用原生按钮或链接，表单字段有可读标签，异步结果使用可读状态提示。展示用户输入时使用文本节点或 `textContent`。
- CSS 类使用短横线分隔，优先复用样式表已有颜色、间距和公共组件规则。改动页面后检查窄屏布局、表单提示和空列表。

## Git 与验证

- 按功能组织 `feature/...` 分支。提交标题写清单次变更，可使用 `feat:`、`fix:`、`style:`、`test:`、`docs:` 等前缀。
- 提交或合入前运行相关测试。涉及接口、数据库或 Excel 时，用真实 Flask 与临时 SQLite 联调，记录测试结果和复现步骤。
- PR 说明变更范围、验收方式和影响的接口。Release 标签指向要交付的提交，文档说明如何安装和运行。

验证入口见[后端运行与测试](https://github.com/WJ4F5DA2/ee308-address-book/blob/v1.0.0/docs/backend.md)和[前端与联调测试](https://github.com/WJ4F5DA2/ee308-address-book/blob/v1.0.0/docs/frontend-testing.md)。
