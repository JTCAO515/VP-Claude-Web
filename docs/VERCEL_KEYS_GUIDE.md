# VisePanda · Vercel 环境变量填写指南（小白向）

这份文档教你怎么把"密钥"（API Key）填到 Vercel 上，让网站的各项功能真正跑起来。
**不需要懂代码**，跟着步骤点点鼠标、复制粘贴就行。

## 一、怎么打开"填密钥"的地方

1. 打开 [vercel.com](https://vercel.com) 并登录（用你部署这个项目时的账号）。
2. 点进 **vp-claude-web** 这个项目。
3. 顶部菜单点 **Settings**（设置）。
4. 左侧菜单点 **Environment Variables**（环境变量）。
5. 你会看到一个"Key / Value"的表单：**Key** 填变量名（比如 `DEEPSEEK_API_KEY`），**Value** 填你申请到的密钥本身。
6. 填完点 **Save**。
7. **全部填完后，必须重新部署一次才会生效**：回到项目首页 → **Deployments** 标签 → 找最新的一条 → 点右边 `...` → **Redeploy**。

> 不知道某个功能要不要配？**全部都是可选的**。不填，对应功能会自动降级成"能用但简化版"，网站不会因为没填而打不开。

---

## 二、⚠️ 最重要的一条（一定要填，否则会丢用户数据）

| 变量名 | 填什么 | 为什么重要 |
|---|---|---|
| `APP_ENV` | 填 `production` | **必填**。如果不填，系统会误以为自己在"本地开发模式"，把用户注册信息写到一个临时文件里——这个文件在 Vercel 上随时可能被清空，导致**注册的用户全部消失**。一定要先填这个，再考虑下面 Supabase 那一组。 |

---

## 三、按"做什么用"分组的密钥清单

### 🤖 1. AI 聊天 + 翻译（DeepSeek）
没有这个，Chat 和翻译功能会用一个很弱的本地模板回复，体验会很差。**建议优先填这组。**

| 变量名 | 填什么 | 去哪里申请 |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek 的 API Key | [platform.deepseek.com](https://platform.deepseek.com) 注册账号 → API Keys → 创建一个，复制粘贴过来 |
| `DEEPSEEK_MODEL` | 不用填（默认 `deepseek-chat`） | — |

### 🗣️ 2. 语音翻译（说话/听发音）
没有这个，语音功能会自动用浏览器自带的语音（效果一般但能用）。

| 变量名 | 填什么 | 去哪里申请 |
|---|---|---|
| `DASHSCOPE_API_KEY` | 阿里云 DashScope 的 API Key | [dashscope.console.aliyun.com](https://dashscope.console.aliyun.com) 注册阿里云账号 → 开通 DashScope → API-KEY 管理 → 创建 |

### 👤 3. 用户登录系统（账号持久保存）
没有这个，用户注册的账号信息会"飘在内存里"，刷新几次或者过一会儿就可能丢失。**强烈建议配置**，否则等于没有真正的账号系统。

| 变量名 | 填什么 | 去哪里申请 |
|---|---|---|
| `SUPABASE_URL` | 你的 Supabase 项目地址，形如 `https://abcd1234.supabase.co` | [supabase.com](https://supabase.com) 免费注册 → New Project → 创建完后在 Project Settings → API 里能看到这个地址 |
| `SUPABASE_SERVICE_KEY` | 同一个页面里的 `service_role` 密钥（注意不是 `anon` 那个） | 同上页面，往下翻能看到 |
| `SUPABASE_ANON_KEY` | 同一个页面的 `anon` `public` 密钥 | 同上 |

填完 Supabase 后，还要做一步：打开 Supabase 项目里的 **SQL Editor**，新建一个查询，把仓库里 `api/storage.py` 文件中 `SCHEMA_SQL` 这段 SQL 代码原样粘贴进去并运行一次（只需要做一次）。这一步是在创建"用户表"。如果不知道怎么打开这个文件，告诉负责接手的程序员一声就行，他/她一看就懂。

### ✉️ 4. 邮箱验证码（注册时发验证邮件）
没有这个，用户注册后会被自动设为"已验证"，跳过邮箱验证这一步（不影响正常使用，只是少了这道安全验证）。

| 变量名 | 填什么 | 去哪里申请 |
|---|---|---|
| `RESEND_API_KEY` | Resend 的 API Key | [resend.com](https://resend.com) 免费注册 → API Keys → 创建 |

### 🔑 5. 用 Google 账号一键登录
没有这个，登录框里就不会出现"Continue with Google"按钮（其他登录方式不受影响）。

| 变量名 | 填什么 | 去哪里申请 |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth 客户端 ID | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) → 创建 OAuth 2.0 客户端 ID（类型选 "Web application"） |
| `GOOGLE_CLIENT_SECRET` | 同上页面生成的密钥 | 同上 |

申请时有一项叫"Authorized redirect URIs"（授权重定向地址），填：
```
https://claude.go2china.space/api/auth/callback
```

### 🗺️ 6. 地图（Plan 页面的路线地图）
没有这个，Plan 页面的地图会显示一个示意图案（条纹背景+编号小圆点），不影响其他功能。

| 变量名 | 填什么 | 去哪里申请 |
|---|---|---|
| `AMAP_JS_KEY` | 高德地图 **Web端(JS API)** 类型的 key | [console.amap.com](https://console.amap.com) 注册 → 创建应用 → 添加 key 时选择"Web端(JS API)" |
| `AMAP_SECURITY_CODE` | 创建上面那个 key 时，系统会同时给你一个"安全密钥" | 同上，创建 key 的页面就能看到 |

### ⭐ 7. 餐厅/景点评分
没有这个，酒店/餐厅卡片上就不会显示 ★ 评分小标签，其他都正常。

| 变量名 | 填什么 | 去哪里申请 |
|---|---|---|
| `AMAP_WEB_SERVICE_KEY` | 高德地图 **Web服务** 类型的 key（**注意和上面第 6 组的 key 类型不一样，要单独申请一个**） | 同样在 [console.amap.com](https://console.amap.com)，创建 key 时这次要选"Web服务" |

### 🏨 8. 订酒店/火车票/机票（Trip.com，携程国际版）
**这一组已经默认能用，不填也能跳转，但建议你花 5 分钟注册一下，把佣金算到自己账上。**

我们调研过两条路：
- ❌ **携程国内的"开放平台"真接口**：需要先和携程谈成商务合作，人工签约才能拿到接口密钥，个人/小项目基本拿不到，所以没有走这条路。
- ✅ **Trip.com（携程国际版）联盟计划**：免费自助注册，几分钟到几小时就能通过审核，拿到你自己的专属推广 ID。这是我们现在用的方案——"Book a hotel/transport"功能点击后会跳转到 Trip.com 对应的搜索结果页，**链接里带着推广 ID，产生的订单佣金会进你的账户**。

**注册步骤**：
1. 打开 [trip.com/partners](https://www.trip.com/partners)，点击"Join Now"或类似按钮注册。
2. 填一些基本信息（你的网站/产品介绍），提交后等审核（通常几小时到几天）。
3. 通过后，在联盟后台找到你的 **Affiliate ID / Sub ID**（不同后台叫法可能不同，找"追踪 ID"类的字段）。

| 变量名 | 填什么 | 去哪里获取 |
|---|---|---|
| `CTRIP_AID` | 你在 Trip.com 联盟后台拿到的推广渠道 ID（系统已有通用默认值，注册后建议换成你自己的） | [trip.com/partners](https://www.trip.com/partners) 注册后在后台查看 |
| `CTRIP_SID` | 你的子推广位 ID（系统已有通用默认值，注册后建议换成你自己的） | 同上 |

⚠️ 注意：目前系统是用"自动拼接网址"的方式生成跳转链接，不是调用 Trip.com 的查询接口，
所以网址里的参数命名**还没有用真实账号验证过**。注册完之后如果发现跳转后页面不对，
告诉负责接手的程序员，让他对照你联盟后台提供的真实示例链接核实参数名称。

### 🏷️ 9. 团购优惠（美团联盟）
没有这个，"Group deals"功能会显示精选的优惠信息 + 一个跳转到美团官网的按钮。同样需要**申请审核**。

| 变量名 | 填什么 | 去哪里申请 |
|---|---|---|
| `MEITUAN_UNION_API_KEY` | 美团联盟分配的 App Key | [union.meituan.com](https://union.meituan.com) 申请成为联盟会员（需要审核） |
| `MEITUAN_UNION_API_SECRET` | 美团联盟分配的签名密钥 | 同上 |

---

## 四、⚠️ 关于"大众点评"的说明

很多人会以为可以接入大众点评看评分/评论，但**大众点评没有对外开放的公开接口**，第三方拿不到这个数据，除非和美团/点评官方签商务数据合作协议（不是申请个 key 就能用的）。

我们用**高德地图的评分数据**（上面第 7 组的 `AMAP_WEB_SERVICE_KEY`）作为替代方案——这是真实可申请、公开可用的接口，能拿到真实的餐厅/景点评分。

---

## 五、检查是否填对了

填完并重新部署后，打开 https://claude.go2china.space/api/config/public ，浏览器会显示一段文字（JSON），里面每个 `has_xxx: true` 就说明对应的功能已经成功识别到你填的密钥了；`false` 就是还没填或者填错了。
