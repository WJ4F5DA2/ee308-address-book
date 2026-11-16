# ContactHub 服务器部署记录

## 公网地址

http://118.31.246.176:8001/

## 部署结构

| 项目 | 路径或值 |
|---|---|
| 应用目录 | `/opt/contacthub` |
| SQLite 数据库 | `/var/lib/contacthub/contacts.sqlite` |
| systemd 服务 | `contacthub.service` |
| 监听地址 | `0.0.0.0:8001` |
| 运行服务器 | Gunicorn 23，1 个 worker、4 个线程 |
| 项目依赖目录 | `/opt/contacthub/.deps` |

服务使用 `Restart=always` 和 `WantedBy=multi-user.target`，已设置为开机启动。仅使用 8001 端口，未修改 `calculator-backend`、8000 端口或其目录。

## 依赖说明

服务器缺少 `ensurepip`，因此没有安装系统包，而是将依赖安装到项目自己的 `.deps` 目录：

```bash
python3 -m pip install --target /opt/contacthub/.deps -r /opt/contacthub/requirements.txt
```

systemd 通过 `PYTHONPATH=/opt/contacthub/.deps` 加载依赖，并用 `/usr/bin/python3 -m gunicorn` 启动，不依赖 venv。

## 服务管理

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now contacthub
systemctl status contacthub
journalctl -u contacthub -n 50 --no-pager
```

只重启本项目：

```bash
sudo systemctl restart contacthub
```

## 验收结果

部署日期：2026-11-16。

- 服务器后端测试：8 / 8 通过；
- 公网首页和 API：正常；
- 公网新增、收藏、读取、删除：通过；
- 公网 Excel 导入与导出：通过；
- 临时验收联系人：已全部清理；
- `systemctl restart contacthub` 后数据仍存在：通过；
- 公网 Edge 浏览器检查：0 个脚本错误、0 个 HTTP 404、无横向溢出。

验收脚本为 `tests/frontend/deployment_smoke.py` 和 `tests/frontend/public_visual_check.js`。仓库和文档不包含服务器私钥。
