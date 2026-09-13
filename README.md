# 器 · 茶 | 中国茶具艺术展

**Chinese Tea Ware Artistic Gallery**

一个展示中国历代茶具艺术的博物馆级数字画廊。从唐宋建盏到明清官窑，品味跨越千年的器物之美。

A museum-quality digital gallery showcasing historic Chinese teapots and tea bowls across dynasties — from Song dynasty Jian ware to Qing imperial porcelain.

🌐 **Live Demo: [https://philmingdao.github.io/teaware/](https://philmingdao.github.io/teaware/)**

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub%20Pages-blue)

## ✨ 特色 Features

- 🏛️ **博物馆级呈现** — 简洁优雅的展览式布局，专注于器物之美
- 📜 **真实藏品** — 所有图片来自大都会艺术博物馆与克利夫兰艺术博物馆开放数据
- 🔍 **智能筛选** — 按朝代、材质、器型分类浏览
- 📱 **响应式设计** — 完美适配桌面与移动设备
- 🌏 **中英双语** — 以中文为主，辅以英文标签
- ⚡ **静态优化** — 支持静态导出，可部署至任意静态托管平台

## 📸 预览 Preview

### 首页 Homepage
展览入口，精选藏品预览

### 藏品浏览 Gallery
按朝代/材质/器型筛选浏览

### 藏品详情 Artwork Detail
博物馆墙标式详细信息

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
├── public/              # 静态资源
├── scripts/
│   └── fetch-artworks.ts  # 数据获取脚本
├── src/
│   ├── app/             # Next.js App Router 页面
│   │   ├── page.tsx     # 首页
│   │   ├── gallery/     # 藏品浏览页
│   │   ├── about/       # 关于展览页
│   │   └── artwork/[id] # 藏品详情页
│   ├── components/      # React 组件
│   ├── data/
│   │   └── artworks.ts  # 藏品数据
│   ├── lib/             # 工具函数
│   └── types/           # TypeScript 类型定义
├── next.config.ts       # Next.js 配置
├── tailwind.config.ts   # Tailwind CSS 配置
└── tsconfig.json        # TypeScript 配置
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

### 更新数据

如需重新获取或更新藏品数据：

```bash
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

**首次设置（仓库管理员）:**
1. 进入仓库 **Settings → Pages**
2. 将 **Source** 设置为 **GitHub Actions**
3. 保存设置

之后每次推送到 `main` 分支，GitHub Actions 会自动构建并部署。

**Live URL:** https://philmingdao.github.io/teaware/

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

## 📄 许可证 License

本项目代码采用 [MIT License](LICENSE) 许可。

藏品图片版权归原博物馆所有，采用 CC0 公共领域许可。

---

<p align="center">
  <em>「一器一茶，皆有其道」</em><br>
  <em>Every vessel tells a story of tea and tradition.</em>
</p>
