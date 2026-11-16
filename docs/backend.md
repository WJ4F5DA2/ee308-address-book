# ContactHub 后端

## 本地运行

在仓库根目录用 PowerShell 运行，需安装 Python 3.12。

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m flask --app app run
```

Flask 启动时自动创建 `instance/contacts.sqlite`。单独运行后端可访问 `http://127.0.0.1:5000/api/contacts`，合入前端后从 `http://127.0.0.1:5000/` 打开完整页面。

## Excel

在 Excel 页面下载空白模板。每位联系人占一行，至少填写姓名和一种联系方式。同一单元格的多个值用英文分号分隔。值本身含分号或反斜杠时，分别写成 `\;` 或 `\\`。带前导零的号码请在 Excel 中输入为文本。

导入会新增联系人并报告无效行。重复导入会新增重复记录。导出文件中的“联系方式标签”列用于保留各类联系方式的标签和顺序，可直接重新导入。

## 测试

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests/backend -v
```
