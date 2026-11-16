# ContactHub 通讯录管理系统

基于 Flask、SQLite、原生 JavaScript 和 OpenPyXL 的两人结对作业。当前分支已整合前端与后端，不包含任何服务器密钥。

## 已实现

- 联系人新增、编辑、删除、搜索和详情展示；
- 收藏、取消收藏及收藏列表；
- 电话、邮箱、社交账号、邮寄地址，同类型支持多条；
- Excel `.xlsx` 模板下载、真实导入、逐行错误反馈和导出；
- SQLite 持久化、删除级联、表单校验和接口异常提示；
- 桌面双栏与移动端单栏布局，键盘焦点和原生对话框支持。

## 本地运行

需要 Python 3.12。Windows PowerShell：

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m flask --app app run --debug
```

访问 `http://127.0.0.1:5000/`。首次启动自动创建 `instance/contacts.sqlite`。

## 项目结构

```text
app/
├── __init__.py         # Flask 应用、页面路由和错误处理
├── api.py              # 联系人、收藏和 Excel API
├── db.py               # SQLite 模型与事务
├── excel.py            # OpenPyXL 导入导出
├── validation.py       # 后端数据校验
├── templates/          # Jinja 页面模板
└── static/             # CSS、JavaScript 和模板资源
tests/
├── backend/            # 数据库、API、Excel 后端测试
├── unit/               # 前端校验与 API 单元测试
├── e2e/                # 页面及真实联调测试
└── frontend/           # 预览、测试服务器和资源生成工具
```

## 测试

需要 Node.js 20+ 和本机 Microsoft Edge。先安装依赖并生成测试 Excel 文件：

```powershell
.\.venv\Scripts\python.exe tests\frontend\create_excel_fixture.py
npm install

# 后端：8 项
.\.venv\Scripts\python.exe -m unittest discover -s tests/backend -v

# 前端单元：10 项；模拟页面：9 项
npm test
npm run test:e2e

# 真实 Flask + SQLite + 浏览器联调：2 项
npm run test:integration
```

联调测试使用 `test-results/integration/contacts.sqlite` 隔离数据库，每次启动自动重建，不会污染开发数据。

## 仅预览前端

```powershell
.\.venv\Scripts\python.exe tests\frontend\preview_server.py
```

访问 `http://127.0.0.1:4173/?mock=1`。模拟数据只保存在当前标签页，不会写入数据库；此模式不能作为真实后端验收证据。

## 接口与分工

API 路径与字段遵循团队方案，详见 `docs/backend.md`。测试记录见 `docs/frontend-testing.md`。数据库和后端由成员 A 提供，页面和前端测试由成员 B 提供，双方共同联调。

## 公网部署

应用已部署至 `http://118.31.246.176:8001/`。公网由 Nginx 反向代理到仅监听 `127.0.0.1:8002` 的 Gunicorn，不直接暴露应用服务。生产环境使用项目独立依赖目录和 systemd，部署结构及验收结果见 `docs/deployment.md`。
