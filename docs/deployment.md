# ContactHub 服务器部署记录

## 公网地址

http://118.31.246.176:8001/

公网请求由 **Nginx** 接收并反向代理到本机 Gunicorn，应用服务器不再直接暴露到公网。

```text
公网 :8001 → Nginx → 127.0.0.1:8002 → Gunicorn → Flask / SQLite
```

云安全组当前只开放 8001，因此公网入口保留该端口。8002 仅绑定 `127.0.0.1`，外部无法直接访问。

## 部署结构

| 项目 | 路径或值 |
|---|---|
| 应用目录 | `/opt/contacthub` |
| SQLite 数据库 | `/var/lib/contacthub/contacts.sqlite` |
| 应用服务 | `contacthub.service` |
| 代理服务 | `nginx.service` |
| 公网监听 | Nginx `0.0.0.0:8001` |
| 应用监听 | Gunicorn `127.0.0.1:8002` |
| 运行服务器 | Gunicorn 23，1 个 worker、4 个线程 |
| 项目依赖目录 | `/opt/contacthub/.deps` |

Nginx 配置为 `deploy/contacthub.nginx`，设置了上传大小限制及 `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy` 安全响应头。两个服务均已启用。未修改 `calculator-backend`、8000 端口或其目录。

## 依赖说明

服务器缺少 `ensurepip`，因此将依赖安装到项目自己的 `.deps` 目录：

```bash
python3 -m pip install --target /opt/contacthub/.deps -r /opt/contacthub/requirements.txt
```

systemd 通过 `PYTHONPATH=/opt/contacthub/.deps` 加载依赖，并用 `/usr/bin/python3 -m gunicorn` 启动，不依赖 venv。

## 服务管理

```bash
systemctl status contacthub
systemctl status nginx
journalctl -u contacthub -n 50 --no-pager
sudo nginx -t
```

只重启本项目及其代理：

```bash
sudo systemctl restart contacthub
sudo systemctl restart nginx
```

## 验收结果

部署与代理加固日期：2026-11-16。

- 服务器后端测试：8 / 8 通过；
- Nginx 公网首页和 API：正常；
- 公网新增、收藏、读取、删除：通过；
- 公网 Excel 导入与导出：通过；
- 临时验收联系人：已全部清理，未删除队友已有联系人；
- `systemctl restart contacthub` 后数据仍存在：通过；
- 外部直接访问 Gunicorn 8002：已阻断；
- 公网响应确认由 Nginx 返回，并包含安全响应头；
- 公网 Edge 浏览器检查：0 个脚本错误、0 个 HTTP 404、无横向溢出。

验收脚本为 `tests/frontend/deployment_smoke.py` 和 `tests/frontend/public_visual_check.js`。仓库和文档不包含服务器私钥。
