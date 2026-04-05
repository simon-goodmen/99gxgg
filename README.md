# 99gxgg (99共享建材平台)

🏗️ **99共享建材平台前端项目**，包含微信小程序与 Web 预览原型，面向钢构、商砼、共享建材、订单追踪与后台管理场景。

[![Platform: MiniProgram](https://img.shields.io/badge/Platform-MiniProgram-green.svg)](https://mp.weixin.qq.com/)
[![Tech: React + Vite](https://img.shields.io/badge/Tech-React%20%2B%20Vite-blue.svg)](https://vitejs.dev/)

## 📝 项目简介 (Project Overview)

**99共享建材** 是一套围绕钢构、商砼与建材共享交易的前端项目。本仓库同时包含：

- 微信小程序端
- Web 预览原型
- 本地后台管理端

项目重点覆盖用户登记、商品展示、下单、物流追踪、后台订单管理和静态数据导出。

## ✨ 核心功能 (Key Features)

- **📊 智能看板**: 首页统计、实时报价、平台能力展示。
- **🚛 共享商砼**: 多站点价格、标号选择、锁单与物流跟踪。
- **🏗️ 共享钢构**: 工厂排产、能力展示、代工下单。
- **📦 共享建材**: 拼团采购、价格展示与采购需求提交。
- **👤 个人中心**: 姓名 + 手机号快速登记、资料修改、订单查看。
- **🛠️ 后台管理**: 站点数据、订单、物流进度、咨询线索管理。

## 📸 界面展示 (Screenshots)

| 共享钢构首页 (Home) | 个人中心 (Profile) |
| :---: | :---: |
| ![Home Preview](assets/home_preview.png) | ![Profile Preview](assets/profile_preview.png) |

## 🚀 技术栈 (Tech Stack)

- **Framework**: React 18 + Vite (Web Prototype) / 原生小程序云开发 (Mini Program)
- **UI Architecture**: 设计令牌 (Design Tokens) + 响应式 Flexbox/Grid
- **State Management**: React Hooks / Context API
- **Communication**: Cloud Functions (云函数) / Axios

## 🛠️ 本地开发 (Local Development)

### 1. 克隆仓库

```bash
git clone https://github.com/simon-goodmen/99gxgg.git
cd 99gxgg
```

### 2. 配置环境变量

复制根目录示例文件：

```bash
copy .env.example .env
```

然后在 `.env` 中填写真实配置：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=99app
DB_USER=your_db_user
DB_PASSWORD=your_db_password
PORT=5001
ADMIN_DEFAULT_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=change_me_before_use
ADMIN_SYNC_PASSWORD_ON_BOOT=false
```

说明：

- `.env` 已被 `.gitignore` 忽略，不会上传到 GitHub
- 不要把数据库账号密码写回源码
- 建议把服务端 `.env` 放在 `web-prototype/.env`
- 如果你曾经暴露过旧密码，请先在服务器上完成密码轮换

### 3. 安装 Web 原型依赖

```bash
cd web-prototype
npm install
```

### 4. 启动后台服务

```bash
npm run server
```

或者直接在 `web-prototype/admin` 目录执行：

```bash
npm start
```

后台默认地址：

- `http://127.0.0.1:5001/admin/`
- `http://127.0.0.1:5001/api/health`

常用后台命令：

```bash
cd web-prototype/admin
npm run check:admin
npm run fix:admin
npm run reset:admin -- admin YourNewPassword123
```

### 5. 启动 Web 原型

```bash
npm run dev
```

前端默认地址：

- `http://localhost:5173/home`
- `http://localhost:5173/concrete`
- `http://localhost:5173/steel`
- `http://localhost:5173/materials`
- `http://localhost:5173/profile`
- `http://localhost:5173/tracking`

### 6. 导出小程序静态数据

小程序展示数据采用静态快照方式，导出命令如下：

```bash
cd web-prototype/admin
npm install
npm run export:mini
```

执行后会生成：

- `miniprogram/data/home.js`
- `miniprogram/data/steel.js`
- `miniprogram/data/concrete.js`
- `miniprogram/data/materials.js`

### 7. 小程序开发

#### 环境准备
- 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序开发者账号

#### 导入项目
- 打开微信开发者工具
- 选择 "导入项目"
- 项目目录选择 `miniprogram` 文件夹
- AppID 输入你的小程序 AppID（可在微信公众平台获取）

#### 开发说明

小程序当前采用两条数据链路：

- 展示数据：读取 `miniprogram/data/*.js` 静态快照
- 实时写入：咨询和下单请求发往 Web 后台接口

#### 云开发配置（可选）
如果使用云开发功能：
- 在开发者工具中启用云开发
- 配置云环境 ID（参考 `project.config.json`）

#### 开发调试
- 在开发者工具中进行代码编辑和调试
- 使用真机调试确保兼容性

## 📂 目录结构 (Directory Structure)

```text
99gxgg/
├── miniprogram/        # 微信小程序源码
│   ├── data/           # 导出的静态展示数据
│   ├── pages/          # 页面 (钢构、商砼、建材、追踪、我的、咨询)
│   ├── components/     # 公用组件
│   └── app.wxss        # 全局样式
├── web-prototype/      # Web 预览原型 + 本地后台
│   ├── src/
│   │   ├── layouts/    # 布局
│   │   ├── pages/      # 页面视图
│   │   └── index.css   # 全局样式
│   └── admin/          # Express 后台与管理页面
├── assets/             # 项目静态资源 (截图、图标)
├── cloudfunctions/     # 云函数示例
├── scripts/            # 版本同步与部署脚本
├── release.json        # 当前统一版本配置
├── VERSION_CURRENT.md  # 当前发布版本索引
├── .env.example        # 环境变量模板
└── load-env.js         # 环境变量加载工具
```

## 🏷️ 版本管理

现在版本信息统一由根目录 `release.json` 管理，并同步到：

- `VERSION_CURRENT.md`
- `VERSION_v*.md`
- `web-prototype/package.json`
- `web-prototype/admin/package.json`

更新版本后执行：

```bash
node scripts/sync-release.js
```

如果要创建下一个版本模板，先执行：

```bash
node scripts/create-release.js 1.5.0 "这里写版本标题"
node scripts/sync-release.js
```

这样你在 GitHub 上能同时看到：

- 固定入口：`VERSION_CURRENT.md`
- 历史版本文件：`VERSION_v1.2.md`、`VERSION_v1.3.md`、`VERSION_v1.4.md`

## 🔐 安全说明

- 仓库已改为通过环境变量读取数据库配置
- `.env` 不应提交到 Git
- 建议定期轮换数据库密码和后台初始密码
- 若历史上曾暴露敏感信息，请同步在服务器侧完成密码变更
- 后台管理员密码已改为安全哈希存储，旧的明文密码会在首次成功登录后自动升级

## 🚢 服务器部署建议

推荐使用 PM2 常驻后台，避免每次上传后手工 `nohup`：

```bash
cd /www/wwwroot/99/web-prototype/admin
npm install
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

如果只是更新后台，推荐统一用仓库脚本：

```bash
cd /www/wwwroot/99
bash scripts/deploy-admin.sh
```

Nginx 反代保持指向本机 Node 服务：

```nginx
location ^~ /admin/ {
    proxy_pass http://127.0.0.1:5001/admin/;
}

location ^~ /api/ {
    proxy_pass http://127.0.0.1:5001/api/;
}
```
