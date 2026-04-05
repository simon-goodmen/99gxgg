# 共享建材平台 (99gxgg)

## 当前版本
**Version: v1.4**

## 版本说明
1. **后台部署简化**：`web-prototype/admin` 目录新增 `npm start`、`check:admin`、`fix:admin`、`reset:admin` 等命令，上传后可直接在后台目录维护服务。
2. **管理员安全升级**：后台管理员密码改为哈希存储，旧密码会在首次成功登录后自动升级，不再依赖数据库明文比对。
3. **默认账号自动补齐**：服务启动时会自动检查并创建 `admin_users` 表与默认管理员账号，减少首次部署和重启后的手工修复。
4. **运行稳定性增强**：新增 `PM2` 配置和进程退出处理，便于服务器常驻运行，避免每次上传后手工 `nohup`。
5. **部署说明完善**：补充 `.env` 新字段、密码重置命令和 Nginx 反代示例，方便在 GitHub 上直接查看每次版本差异。

## 最近更新记录 (2026-04-06)
- 新增 `web-prototype/admin/admin-auth.js` 统一管理员认证与密码工具。
- 新增 `web-prototype/admin/reset_admin_password.js` 用于服务器快速重置后台密码。
- 新增 `web-prototype/admin/ecosystem.config.cjs` 用于 `PM2` 一键启动后台。
- 更新 `README.md`、`.env.example` 与后台登录页提示文案。
