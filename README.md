# 器 · 茶 | 中国茶具艺术展

**Chinese Tea Ware Artistic Gallery**

一个展示中国历代茶具艺术的博物馆级数字画廊。从唐宋建盏到明清官窑，品味跨越千年的器物之美。

A museum-quality digital gallery showcasing historic Chinese teapots and tea bowls across dynasties — from Song dynasty Jian ware to Qing imperial porcelain.

🌐 **Live Demo: [https://philmingdao.github.io/teaware/](https://philmingdao.github.io/teaware/)**

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-blue)

## 📊 Collection Statistics

| Metric | Count |
|--------|-------|
| Total Artworks | **1,031** |
| Museums | 3 |
| Dynasties | 15+ |
| Object Types | 5 |

### By Museum
- The Metropolitan Museum of Art: 510
- Cleveland Museum of Art: 275
- Art Institute of Chicago: 246

### By Dynasty
- Qing (清): 250+ items
- Ming (明): 120+ items
- Song (宋/北宋/南宋): 140+ items
- Yuan (元): 40+ items
- Tang (唐): 30+ items
- And more...

## ✨ 特色 Features

- 🏛️ **博物馆级呈现** — 简洁优雅的展览式布局，专注于器物之美
- 📜 **真实藏品** — 所有图片来自大都会艺术博物馆、克利夫兰艺术博物馆、芝加哥艺术博物馆开放数据
- 🔍 **智能筛选** — 按朝代、材质、器型、来源博物馆分类浏览
- 📱 **响应式设计** — 完美适配桌面与移动设备
- 🌏 **中英双语** — 以中文为主，辅以英文标签
- ⚡ **静态优化** — 支持静态导出，可部署至任意静态托管平台
- 📄 **分页浏览** — 高效分页，支持 900+ 件藏品流畅浏览
- 🌙 **深色模式** — 支持系统偏好自动切换或手动切换，优雅的深色主题
- 📺 **电视模式** — Netflix 风格沉浸式全屏浏览，支持键盘/触摸/自动播放

## 📸 预览 Preview

### 首页 Homepage
展览入口，精选藏品预览

### 藏品浏览 Gallery
按朝代/材质/器型筛选浏览

### 藏品详情 Artwork Detail
博物馆墙标式详细信息

## 🌙 深色模式 Dark Mode

网站支持三种主题模式：

- **浅色模式** — 传统温暖的纸白色调
- **深色模式** — 优雅的水墨黑配色，降低眼睛疲劳
- **跟随系统** — 自动匹配操作系统偏好设置

### 切换方式
点击右上角的太阳/月亮图标循环切换：浅色 → 深色 → 跟随系统

主题偏好会保存在 localStorage 中，下次访问时自动应用。

## 📺 电视模式 TV Mode

专为大屏幕和沉浸式浏览设计的 Netflix 风格展览模式。

### 进入方式
- 首页「电视模式」按钮
- 藏品列表右上角「电视模式」按钮
- 藏品详情页「电视模式」按钮
- 直接访问 `/tv` 路径

### 操作方式

| 操作 | 桌面端 | 移动端 |
|------|--------|--------|
| 上一件 | `←` 方向键 / 点击左侧箭头 | 向右滑动 |
| 下一件 | `→` / `空格` / 点击右侧箭头 | 向左滑动 |
| 自动播放 | `P` 键 / 点击播放按钮 | 点击播放按钮 |
| 退出 | `ESC` 键 / 点击返回 | 点击返回 |

### 特性
- 全屏沉浸式图片展示（object-fit: cover）
- 电影级渐变遮罩保证文字可读性
- 自动播放模式（8秒切换）
- UI 空闲自动隐藏
- 支持触摸滑动手势
- 支持 URL 参数筛选（`?dynasty=宋` 或 `?museum=大都会艺术博物馆`）

## 🚀 快速开始 Getting Started

### 环境要求

- Node.js 18.17 或更高版本
- npm 或 yarn 或 pnpm

### 本地运行

```bash
# 克隆仓库
git clone <repository-url>
cd chinese-tea-gallery

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看网站。

### 构建

```bash
# 生产构建
npm run build

# 预览生产构建
npm run start
```

构建产物位于 `out/` 目录，可直接部署至静态托管服务。

## 🗂️ 项目结构

```
├── public/                    # 静态资源
├── research/                  # 研究日志与文档
│   ├── museums-survey.md      # 博物馆调研报告
│   ├── crawl-log.jsonl        # 爬取日志（机器可读）
│   └── sources.json           # 数据源注册表
├── scripts/
│   ├── expand-collection.ts   # 增量扩展脚本（读取crawl-log避免重复）
│   ├── fetch-artworks-v3.ts   # 数据获取脚本（推荐）
│   ├── fetch-artworks-v2.ts   # 数据获取脚本（完整版）
│   └── fetch-artworks.ts      # 数据获取脚本（旧版）
├── src/
│   ├── app/                   # Next.js App Router 页面
│   │   ├── page.tsx           # 首页
│   │   ├── gallery/           # 藏品浏览页
│   │   ├── about/             # 关于展览页
│   │   └── artwork/[id]       # 藏品详情页
│   ├── components/            # React 组件
│   ├── data/
│   │   ├── artworks.json      # 藏品数据（1,031件）
│   │   └── artworks.ts        # 数据加载器
│   ├── lib/                   # 工具函数
│   └── types/                 # TypeScript 类型定义
├── next.config.ts             # Next.js 配置
├── tailwind.config.ts         # Tailwind CSS 配置
└── tsconfig.json              # TypeScript 配置
```

## 🖼️ 数据来源 Data Sources

本展览所有藏品图片及元数据均来自以下博物馆的开放数据项目，采用 **CC0（公共领域）** 许可：

### The Metropolitan Museum of Art
- [Open Access Initiative](https://www.metmuseum.org/about-the-met/policies-and-documents/open-access)
- [Collection API](https://metmuseum.github.io/)
- License: CC0 / Public Domain

### Cleveland Museum of Art
- [Open Access](https://www.clevelandart.org/open-access)
- [Open Access API](https://openaccess-api.clevelandart.org/)
- License: CC0 / Public Domain

### Art Institute of Chicago
- [Open Access](https://www.artic.edu/open-access/public-api)
- [Collection API](https://api.artic.edu/docs/)
- License: CC0 / Public Domain

## 🔬 Research Infrastructure

This project maintains durable research logs to support future expansion without duplicate crawling.

### Research Files

| File | Purpose |
|------|---------|
| `research/museums-survey.md` | Human-readable survey of 17+ museums worldwide: open-access policies, API documentation, tea ware relevance, license caveats |
| `research/crawl-log.jsonl` | Machine-readable append-only log of every crawl: timestamps, queries, result counts, accepted/rejected IDs with reasons |
| `research/sources.json` | Structured registry of sources with status (`active`/`needs_key`/`deferred`), query configurations |

### Crawl Pipeline

The crawl scripts implement:
- **Deduplication** by museum object ID, accession number, and image URL
- **Quality filtering**: Public domain only, has image, Chinese/East Asian origin, tea-related object types
- **Rate limiting** with exponential backoff for API errors
- **Comprehensive logging** for reproducibility

### Avoiding Duplicate Crawls

Before running a new crawl:
1. Read `research/sources.json` to check source/query status
2. Read `research/crawl-log.jsonl` to find completed query+source pairs
3. Skip already-completed queries unless explicitly refreshing with `--refresh` flag

### Future Expansion

The following sources need API keys (see `research/museums-survey.md` for details):
- **Smithsonian (Freer/Sackler)** — Excellent Chinese ceramics collection
- **National Palace Museum Taiwan** — Premier imperial tea ware
- **Rijksmuseum** — Chinese export porcelain
- **Harvard Art Museums** — Good scholarly metadata

Estimated additional yield with keys: 500-1000+ more artworks.

### 更新数据

如需重新获取或更新藏品数据：

```bash
# Run the comprehensive crawl (v3 - recommended)
npx tsx scripts/fetch-artworks-v3.ts

# Or use the legacy script
npm run fetch-data
```

此脚本会从博物馆 API 获取最新数据并更新 `src/data/artworks.json`。

## 🌐 部署 Deployment

### Vercel（推荐）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/chinese-tea-gallery)

1. 点击上方按钮或登录 [Vercel](https://vercel.com)
2. 导入此仓库
3. 保持默认设置，点击 Deploy

### GitHub Pages

本项目已配置自动部署到 GitHub Pages。

**⚠️ 首次设置（必须由仓库管理员完成）:**

1. 进入仓库 **Settings → Pages**
2. 在 "Build and deployment" 下，将 **Source** 设置为 **GitHub Actions**
3. 点击 **Save** 保存设置
4. 返回 **Actions** 标签页，点击失败的 workflow，选择 **Re-run all jobs** 重新运行

> **重要**: GitHub Pages 必须手动启用后，Actions 工作流才能成功部署。这是 GitHub 的安全限制，无法通过 API 自动启用。

**Live URL:** https://philmingdao.github.io/teaware/

之后每次推送到 `main` 分支，GitHub Actions 会自动构建并部署。

> 注意：`next.config.ts` 中已配置 `basePath: '/teaware'` 和 `assetPrefix: '/teaware'`，确保静态资源在项目子路径下正常加载。

### 其他静态托管

构建后的 `out/` 目录可以部署至任何支持静态网站的平台：
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront
- 阿里云 OSS
- 腾讯云 COS

## 🛠️ 技术栈 Tech Stack

- **框架**: [Next.js 16](https://nextjs.org/) (App Router)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **字体**: 
  - 中文: [Noto Serif SC](https://fonts.google.com/noto/specimen/Noto+Serif+SC)
  - 西文: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond)

## 🎨 设计理念 Design Philosophy

- **安静的奢华** — 柔和的米白与水墨黑，大量留白，精致的衬线字体搭配
- **博物馆体验** — 每件藏品都有完整的「墙标」信息
- **中国优先** — 中文为主要语言，英文为辅助标签
- **可及性** — 语义化 HTML，键盘导航，图片 alt 文本

## 🔗 开发指南：导航与 basePath

本项目部署在 GitHub Pages 子路径 `/teaware/` 下，使用 Next.js 的 `basePath` 配置。

### ⚠️ 重要：内部链接必须使用 next/link

**正确做法：**
```tsx
import Link from 'next/link';

<Link href="/gallery">藏品浏览</Link>
<Link href={`/artwork/${id}`}>查看详情</Link>
```

**错误做法（会导致 404）：**
```tsx
// ❌ 不要这样做 - 绕过了 basePath
<a href="/gallery">藏品浏览</a>
<a href={`/artwork/${id}`}>查看详情</a>
```

### 为什么？

在 GitHub Pages 上，网站部署在 `https://username.github.io/teaware/` 路径下。
- `<Link href="/gallery">` → 自动转换为 `/teaware/gallery` ✅
- `<a href="/gallery">` → 保持为 `/gallery`，导致 404 ❌

### ESLint 规则

项目配置了 ESLint 规则，当检测到 `<a href="/...">` 模式时会发出警告。

运行 `npm run lint` 检查是否有违规使用。

### 外部链接

外部链接（http://、https://、mailto: 等）仍然使用普通 `<a>` 标签：
```tsx
<a href="https://www.metmuseum.org" target="_blank" rel="noopener noreferrer">
  大都会艺术博物馆
</a>
```

## 📄 许可证 License

本项目代码采用 [MIT License](LICENSE) 许可。

藏品图片版权归原博物馆所有，采用 CC0 公共领域许可。

---

<p align="center">
  <em>「一器一茶，皆有其道」</em><br>
  <em>Every vessel tells a story of tea and tradition.</em>
</p>
