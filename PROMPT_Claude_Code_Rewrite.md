# VisePanda 重写 Prompt — Claude Code

重新写 VisePanda，从零开始，所有代码推到 main 分支。

---

## 项目背景

VisePanda 是一个面向外国游客的一站式中国旅行管家。
仓库：~/projects/VP-Claude-Web
部署：Vercel → https://go2china.space

先读以下文档理解产品和数据：
- PRD_PRODUCT_ANALYSIS.md — 产品定位
- DESIGN.md — 设计系统
- HANDOFF.md — 项目状态
- PLAN.md — 当前迭代目标
- CONTEXT.md — 产品上下文
- CHANGELOG.md — 版本历史
- PROMPT_v6.2.0_Iteration.md — 功能清单
- data/translations/ — 翻译 JSON 数据（保留使用）

---

## 一、Git 分支规范

- 所有代码直接推送到 main 分支
- 不要创建其他分支
- 每次提交信息清晰描述改动内容

---

## 二、设计风格

### 中国风，但不是刻板中国风

不要全黑背景。整体应为浅色/宣纸基调，点缀中式元素：

**配色参考：**
- 主背景：宣纸白 / 米白（#f5f0e8 或类似暖白底）
- 品牌色：青花蓝（#1e6f9f 或 #2d7fb8）
- 点缀色：朱砂红（#c63d2f）用于重要操作/CTA
- 文字：墨黑（#2c2c2c）
- 辅助色：黛绿、淡金

**视觉元素：**
- 留白充足（中式美学核心）
- 水墨风格点缀（淡墨晕染、山形轮廓）
- 边框/分割线使用细线，而非粗框
- 标题可尝试书法感字体（Noto Serif SC 或类似衬线体）
- 微纹理背景（宣纸纹理、水墨渐变）
- Tab/按钮考虑圆形或圆角设计，柔和不尖锐

**反例（不要）：**
- ❌ 全黑背景
- ❌ 大红灯笼式刻板中国风
- ❌ 浓重的金色红色搭配
- ❌ 卡通熊猫/灯笼等符号堆砌

---

## 三、用户登录系统

### 功能要求

1. **邮箱密码登录 + 注册**
2. **Google OAuth 登录**
3. **邮箱验证（Resend）**
4. **会话管理（JWT 或 Session）**

### 技术实现

**后端：**
- `/api/auth/register` — 邮箱注册，发送验证邮件
- `/api/auth/login` — 邮箱密码登录
- `/api/auth/google` — Google OAuth 登录
- `/api/auth/verify` — 邮箱验证
- `/api/auth/profile` — 获取/更新用户信息
- `/api/auth/logout` — 退出登录

**邮箱服务（Resend）：**
- 注册时发送验证邮件
- 使用 Resend API（api_key 从环境变量读取）
- 邮件模板简洁，品牌统一

**Google OAuth：**
- Google Cloud Console 配置 OAuth 2.0
- client_id / client_secret 从环境变量读取
- 前端直接调 Google 登录按钮 → 后端验证 token

**前端：**
- 底部弹窗式登录/注册界面（mobile-friendly）
- 登录后可保存行程、翻译历史
- 未登录状态仍可使用核心功能，
- 登录入口在顶部栏右侧

### 用户数据模型

```
User:
  id, email, name, avatar_url,
  google_id (nullable),
  email_verified (boolean),
  created_at, updated_at
```

数据存储：JSON 文件或 SQLite（轻量）

---

## 四、功能范围

三个 Tab：
1. **Chatbot** — AI 旅行咨询 + 行程规划（DeepSeek API）
2. **Dashboard** — 多功能仪表盘（天气/酒店/地图/团购/行程/城市/工具）
3. **Translation** — 语音翻译 + 文字翻译 + 景点/餐饮/文化短语库

后端 API：
- /api/chat — AI 对话（DeepSeek）
- /api/health — 健康检查
- /api/maps/* — 高德地图存根
- /api/hotels/* — 酒店预订存根
- /api/deals/* — 团购存根
- /api/translations — 翻译查询
- /api/auth/* — 用户认证

---

## 五、约束

- 从头写，不复制旧代码
- 保留 data/translations/ 下的翻译数据
- 后端 Python（Vercel 兼容 WSGI 或 FastAPI）
- 前端 Vanilla JS / 轻量方案
- 移动端优先
- English-native UI，中文用括号标注（故宫/Forbidden City）
- API keys 从环境变量读取，不硬编码
- 版本号：v7.0.0
- 更新 CHANGELOG.md
