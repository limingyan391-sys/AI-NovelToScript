# ✦ NovelToScript

> **AI 辅助剧本创作工具** — 将小说文本自动转换为结构化剧本（YAML 格式），降低改编门槛，提升创作效率。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-24+-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/limingyan391-sys/AI-NovelToScript/pulls)

---

## 📖 简介

每一位小说作者都希望自己的作品能搬上银幕，但将小说改编为剧本是一项专业且耗时的工作。**NovelToScript** 应运而生：

- **自动解析** 小说章节、对话、场景信息
- **智能转换** 为符合行业规范的剧本格式
- **可视化工作台** 角色管理、场景时间线、作品分析
- **零依赖部署** 纯前端 + Node.js 内置模块，无需安装任何第三方包

> ✨ **所有处理在浏览器端完成，数据不上传服务器，完全离线可用。**

---

## 🚀 快速开始

### 环境要求
- [Node.js](https://nodejs.org/) 任意版本（仅用内置模块，无第三方依赖）

### 安装与运行

```bash
git clone https://github.com/limingyan391-sys/AI-NovelToScript.git
cd AI-NovelToScript
node server/index.js
# 浏览器打开 http://localhost:3000
```

**零依赖，无需 npm install，克隆即用。**

---
## 🎯 核心功能
### 1️⃣ 小说自动解析
| 特性 | 说明 |
|------|------|
| 📑 章节识别 | 「第一章」「第1章」「Chapter 1」等  |
| 💬 对话提取 | 自动识别引号中的对话与说话人 |
| 🏠 场景标记 | 场景/地点/时间/天气结构化解析  |

### 2️⃣ 剧本智能转换
- **三幕剧结构映射** — 自动划分建置/对抗/解决三幕
- **多格式支持** — 电影/电视剧/舞台剧本一键切换
- **角色系统** — 自动提取角色，按台词频次分配定位

### 3️⃣ 可视化工作台
- **剧本预览** — 结构化展示幕、场景、对话与动作
- **角色管理** — 编辑角色名称、定位、性格特征
- **场景时间线** — 按地点分组展示剧情脉络
- **作品分析** — 对话/描写比例、台词排行、改编建议

### 4️⃣ 结构化导出
- **YAML 导出** — 标准剧本格式，可直接编辑
- **JSON 导出** — 便于程序化处理
- **纯文本剧本** — 适合分享与打印

---
## 🖥️ 界面预览

```
+----------------------------------------------+
| ✦ NovelToScript                    [🌓]   |
+----------------------------------------------+
| 作品名[____] 作者[____] [电影][电视][舞台] |
| +----------------------------------------+ |
| | 第一章 月下惊鸿                         | |
| | 时间：戌时 地点：洛阳城外·听雨亭        | |
| +----------------------------------------+ |
| [✦开始转换] [📁上传] [📖加载示例]          |
+----------------------------------------------+
| [剧本预览][角色管理][时间线][YAML导出][分析]|
| +--+ +--+ +--+ +--+                      |
| | 3| | 8| | 5| |24|                      |
| |章| |场| |角| |页|                      |
| +--+ +--+ +--+ +--+                      |
| 【第一幕（建置）】                         |
| + scene_001 ---------------------------+ |
| | 📍洛阳城外·听雨亭 🕐戌时              | |
| | 夜色如墨，月华如水。                  | |
| | 雷震天：阁下便是"夜雨剑"沈孤鸿？     | |
| | 沈孤鸿：正是在下。                    | |
| +-------------------------------------+ |
+----------------------------------------------+
```

---
## 📂 项目结构

```
AI-NovelToScript/
├── server/
│   └── index.js              HTTP服务器(零依赖)
├── public/
│   ├── index.html            主页面
│   ├── css/style.css         现代化UI样式
│   └── js/
│       ├── parser.js         小说解析引擎
│       ├── script-converter.js 剧本转换器
│       ├── yaml-writer.js    YAML序列化器
│       └── app.js            主应用逻辑
├── schema/
│   └── screenplay-schema.md  Schema文档
├── README.md
├── LICENSE                   MIT协议
├── .gitignore
└── package.json
```

---
## 📄 YAML Schema
转换后的剧本采用YAML格式，兼顾机器可读性与人工可编辑性。

```yaml
screenplay:
  metadata:
    title: "月下惊鸿"
    author: "佚名"
    date: "2026-06-08"
    format: "film"
    pageEstimate: 120
  characters:
    - id: "char_001"
      name: "沈孤鸿"
      role: "主角"
  acts:
    - id: "act_1"
      title: "第一幕（建置）"
      scenes:
        - id: "scene_001"
          setting:
            location: "洛阳城外·听雨亭"
            time: "戌时"
          content:
            - type: "action"
              description: "夜色如墨，月华如水。"
            - type: "dialogue"
              speaker: "沈孤鸿"
              line: "阁下深夜相邀，所为何事？"
```
详见 schema/screenplay-schema.md

---
## 🛠️ 技术栈
| 项目 | 方案 |
|------|------|
| 前端 | 纯原生JS + CSS3（零框架）|
| 后端 | Node.js内置http/fs/path |
| 数据格式 | YAML（自定义序列化器）|
| 设计 | 深色主题、玻璃态设计 |

### 设计决策
| 决策 | 原因 |
|------|------|
| 零npm依赖 | 克隆即用，无需安装 |
| 浏览器端处理 | 数据不上传，保护版权 |
| 纯原生前端 | 极速加载，无框架成本 |

---
## 🧪 使用建议
为获得最佳效果，在小说中添加标记:

```markdown
场景：洛阳城外·听雨亭
时间：戌时
```

### 剧本打磨流程
1. V1自动转换 → 2. V2角色打磨 → 3. V3结构优化 → 4. V4定稿

---
## 🤝 贡献指南
1. Fork本仓库
2. 创建分支：`git checkout -b feature/xxx`
3. 提交：`git commit -m "feat: xxx"`
4. Push：`git push origin feature/xxx`
5. 创建Pull Request

### 开发方向
- [ ] AI API集成增强转换质量
- [ ] 更多剧本格式支持(Final Draft/Fountain)
- [ ] 导出PDF/Word
- [ ] 角色关系图可视化

---
## 📜 许可证
MIT License

---
<p align="center">Made with ❤️</p>
