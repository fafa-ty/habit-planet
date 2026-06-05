# 习惯星球 HabitPlanet

养成好习惯，看见每一天的进步。

## 在线体验

推送至 GitHub 并开启 Pages 后，访问：

**https://你的用户名.github.io/habit-planet/**

## 项目结构

```
habit-planet/
├── index.html          # 原版（Vanilla JS）
├── js/ css/            # 原版源码
├── react/              # React 重构版（GitHub Pages 部署此版本）
├── server/             # 云同步服务器
├── docs/
│   ├── COMPETITOR_ANALYSIS.md   # 竞品分析
│   └── UI_SPEC.md               # Figma UI 规范
├── PRD.md              # 产品需求文档
└── DESIGN_WORKBOOK.md  # 设计练习册
```

## 本地运行

### React 版（推荐）

```bash
cd habit-planet/react
npm install
npm run dev
# 打开 http://localhost:5173
```

### 原版 Vanilla JS

```bash
cd habit-planet
python3 -m http.server 8766
# 打开 http://localhost:8766
```

### 云同步服务器

```bash
./habit-planet/server/start.sh
# 或 node habit-planet/server/server.js
```

### 手机局域网访问

```bash
./habit-planet/start-mobile.sh
```

## 部署到 GitHub Pages

1. 在 GitHub 创建仓库 `habit-planet`
2. 推送代码到 `main` 分支
3. 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**
4. 推送后自动部署，约 2 分钟可访问

若仓库名不是 `habit-planet`，修改 `react/vite.config.js` 中的 `base` 路径。

## 功能

- ✅ 每日习惯打卡 + Streak
- ✅ 热力图 / 周报 / 成就系统
- ✅ 习惯提醒 / 备注 / 归档
- ✅ 多设备云同步
- ✅ 深色模式 / PWA
- ✅ React 重构版

## 文档

| 文档 | 用途 |
|------|------|
| [三种场景索引](docs/README.md) | 朋友用 / 课程作业 / 面试作品集 |
| [给朋友分享](docs/SHARE_FOR_FRIENDS.md) | 分享文案 + FAQ |
| [课程作业提交包](docs/COURSE_SUBMISSION.md) | 提交清单 + 演示脚本 |
| [面试作品集](docs/PORTFOLIO.md) | 一页纸 + 10 分钟话术 |
| [竞品分析](docs/COMPETITOR_ANALYSIS.md) | Habitica / 小日常 / Done |
| [UI 设计规范](docs/UI_SPEC.md) | Figma 线框规范 |
| [产品需求 PRD](PRD.md) | 完整 PRD |

## 技术栈

| 版本 | 技术 |
|------|------|
| Vanilla | HTML + CSS + ES Modules |
| React | React 18 + Vite 5 |
| 同步 | Node.js HTTP Server |

## License

MIT
