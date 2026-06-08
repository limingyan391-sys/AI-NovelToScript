# NovelToScript YAML Schema 文档

## 概述

本文档定义了 NovelToScript 工具生成的剧本 YAML 格式规范。该格式旨在将小说文本转换为结构化的、可直接编辑的剧本初稿，兼顾**机器可读性**与**人工可编辑性**。

---

## 设计理念与核心原则

### 1. 为什么选择 YAML？

| 特性 | YAML | JSON | XML |
|------|------|------|-----|
| 人工可读性 | ★★★★★ | ★★★ | ★★ |
| 注释支持 | ✅ 原生支持 | ❌ 不支持 | ✅ |
| 缩进结构 | ✅ 直观 | ❌ 需要括号 | ✅ |
| 编辑友好 | ✅ 易手写 | ❌ 易出错 | ❌ 冗长 |

YAML 的最大优势在于**作者可以直接用文本编辑器修改剧本**，无需理解复杂的语法结构。这对于非技术背景的创作者至关重要。

### 2. 层次化设计

剧本天然具有层次结构：
- **幕 (Act)** → **场景 (Scene)** → **内容块 (Content Block)**

这种层次结构与三幕剧、五幕剧等经典剧本结构完美对应。

### 3. 最小侵入性

Schema 设计遵循「尽可能保留原文」的原则：
- 对话保留原始措辞
- 动作描述保留原文风格
- 不强制要求元数据完整

---

## Schema 完整定义

### 顶层结构

```yaml
screenplay:
  metadata:        # 剧本元数据
  characters:      # 角色列表
  acts:            # 幕与场景
  timeline:        # 时间线索引（自动生成）
```

### metadata（元数据）

```yaml
metadata:
  title: "剧本标题"                # 必填，默认取小说标题
  author: "原著作者"               # 必填
  adaptedBy: "改编者"              # 可选，留空表示未指定
  date: "2026-06-08"             # 必填，转换日期
  format: "film"                  # 必填，可取值：film | tv_episode | stage_play
  genre: ["武侠", "悬疑"]         # 可选，风格标签
  logline: "一句话梗概"            # 可选，用于快速了解故事核心
  source: "改编自小说《XXX》"      # 可选，来源说明
  pageEstimate: 120               # 自动估算的剧本页数
```

**设计理由：**
- `format` 字段允许同一部小说适配不同媒介（电影/电视剧/舞台剧）
- `pageEstimate` 为制片人提供初步的篇幅参考
- `logline` 是好莱坞剧本创作的标配，帮助作者凝练故事核心

### characters（角色）

```yaml
characters:
  - id: "char_001"               # 唯一标识，自动生成
    name: "沈孤鸿"               # 角色名称
    alias: ["夜雨剑"]            # 别名/外号
    description: "二十五六岁的白衣剑客，眉目清冷"  # 外貌与背景
    personality: ["冷静", "执着"]  # 性格特征
    role: "主角"                  # 角色定位：主角/主要角色/重要配角/配角
    totalLines: 42               # 台词数量（自动统计）
```

**设计理由：**
- `id` 体系支持跨场景引用和关联
- `role` 分级帮助编剧快速识别核心角色
- `totalLines` 提供客观的戏份分布参考
- `personality` 为演员提供角色理解依据

### acts（幕）

```yaml
acts:
  - id: "act_1"                  # 唯一标识
    title: "第一幕（建置）"       # 幕标题
    chapterSources: ["第一章", "第二章"]  # 来源章节
    synopsis: ""                 # 可选，幕概要
    scenes: [...]                # 场景列表
```

**设计理由：**
- 经典三幕剧结构的自动化映射
- `chapterSources` 保留了与原文的追踪关系
- 支持任意数量的幕（不限于三幕）

### scenes（场景）

```yaml
scenes:
  - id: "scene_001"             # 全局唯一
    actId: "act_1"              # 所属幕
    chapterSource: "第一章"     # 来源章节
    setting:                    # 场景设置
      location: "洛阳城外听雨亭"  # 地点
      time: "戌时"              # 时间
      weather: "月明星稀"       # 天气（可选）
    synopsis: "沈孤鸿与雷震天在听雨亭会面"  # 场景概要
    content: [...]              # 场景内容
```

**设计理由：**
- `setting` 的三要素（地点/时间/天气）是影视制作的基本场景信息
- `chapterSource` 保留了与原文的追溯能力，方便交叉比对
- 结构化的场景信息可导出为通告单（Call Sheet）

### content（场景内容块）

内容块有四种类型：

#### 1. action（动作/描写）

```yaml
  - type: "action"
    description: "夜色如墨，月华如水。白衣身影独坐亭中饮茶。"
    camera: "中景"            # 可选，建议拍摄角度
```

**设计理由：** 对应剧本中的场景描写与动作指示。`camera` 字段为导演提供视觉参考。

#### 2. dialogue（对话）

```yaml
  - type: "dialogue"
    speaker: "沈孤鸿"          # 说话者
    line: "阁下深夜相邀，所为何事？"  # 台词内容
    parenthetical: "放下茶杯，转身"  # 可选，动作提示
```

**设计理由：** 遵循标准剧本格式（角色名 + 台词）。`parenthetical` 对应剧本中的括号提示（如「站起」「低声」），帮助演员理解表演状态。

#### 3. transition（转场）

```yaml
  - type: "transition"
    style: "CUT TO:"           # 转场方式
```

**设计理由：** 转场是剧本与小说的核心差异之一。常见的转场包括：
- `CUT TO:` - 剪切
- `FADE OUT.` - 淡出
- `FADE IN:` - 淡入
- `DISSOLVE TO:` - 叠化
- `SMASH CUT TO:` - 突然切换

#### 4. note（备注）

```yaml
  - type: "note"
    content: "此处需要特效处理"
```

**设计理由：** 为编剧提供添加元备注的能力，不影响剧本正文。

### timeline（时间线索引）

```yaml
timeline:
  - sceneId: "scene_001"
    actId: "act_1"
    location: "洛阳城外听雨亭"
    time: "戌时"
```

**设计理由：** 自动生成的时间线索引支持按地点和场景快速导航，对于多线叙事的剧本尤为重要。

---

## 完整示例

```yaml
screenplay:
  metadata:
    title: "月下惊鸿"
    author: "佚名"
    adaptedBy: ""
    date: "2026-06-08"
    format: "film"
    genre: ["武侠"]
    logline: "白衣剑客沈孤鸿卷入一场饷银劫案，却发现背后隐藏着更大的阴谋"
    source: "原创小说"
    pageEstimate: 8
  characters:
    - id: "char_001"
      name: "沈孤鸿"
      alias: ["夜雨剑"]
      description: ""
      personality: []
      role: "主角"
      totalLines: 3
    - id: "char_002"
      name: "雷震天"
      alias: []
      description: ""
      personality: []
      role: "主要角色"
      totalLines: 5
  acts:
    - id: "act_1"
      title: "第一幕（建置）"
      chapterSources: ["第一章"]
      synopsis: ""
      scenes:
        - id: "scene_001"
          actId: "act_1"
          chapterSource: "第一章"
          setting:
            location: "洛阳城外·听雨亭"
            time: "戌时"
            weather: "月明星稀"
          synopsis: ""
          content:
            - type: "action"
              description: "夜色如墨，月华如水。"
              camera: ""
            - type: "action"
              description: "洛阳城外三里处的听雨亭中，一个白衣身影正独自饮茶。那人背对着月光，看不清面容，只能隐约看见他腰间悬挂的一柄长剑——剑鞘通体漆黑，唯有剑格处一抹暗红，在月光下泛着幽光。"
              camera: ""
            - type: "action"
              description: "远处传来急促的马蹄声。"
              camera: ""
            - type: "action"
              description: "马蹄声由远及近，在听雨亭外戛然而止。"
              camera: ""
            - type: "dialogue"
              speaker: "雷震天"
              line: "阁下便是'夜雨剑'沈孤鸿？"
              parenthetical: ""
            - type: "action"
              description: "马上之人沉声问道。那是个三十出头的黑衣汉子，满面风霜，眼神锐利如鹰。"
              camera: ""
            - type: "action"
              description: "白衣人缓缓放下茶杯，转过身来。月光洒在他的脸上，那是一张约莫二十五六岁的面容，眉目清冷，却带着三分倦意。"
              camera: ""
            - type: "dialogue"
              speaker: "沈孤鸿"
              line: "正是在下。阁下深夜相邀，所为何事？"
              parenthetical: ""
```

---

## 使用建议

### 1. 为获得最佳转换效果

在小说文本中添加结构化标记：
```markdown
场景：洛阳城外·听雨亭
时间：戌时
天气：月明星稀
```

### 2. 后续人工编辑

YAML 格式可以直接在文本编辑器中修改：
- 调整台词措辞
- 添加转场指示
- 细化动作描述
- 增设新场景

### 3. 版本迭代建议

1. **初稿（V1）**：自动转换，保留原文风格
2. **人物打磨（V2）**：完善角色性格与台词
3. **结构优化（V3）**：调整场景顺序，优化节奏
4. **定稿（V4）**：添加技术标注，准备拍摄

---

## 词汇表

| 术语 | 说明 |
|------|------|
| 幕 (Act) | 剧本的主要章节单位，经典三幕剧对应建置/对抗/解决 |
| 场景 (Scene) | 发生在同一地点、同一时间的连续戏剧单元 |
| 动作 (Action) | 场景中的视觉描述与角色动作 |
| 对话 (Dialogue) | 角色之间的话语交流 |
| 转场 (Transition) | 场景之间的视觉切换指示 |
| 人物小传 (Logline) | 一句话概括故事核心的高概念描述 |

---

*Last updated: 2026-06-08*
