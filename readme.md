
# 目标

```
Jira / 需求 / Bug 描述
  ↓
AI 解析复现步骤
  ↓
生成 Appium Flow
  ↓
移动端自动执行
  ↓
截图 / 日志 / 失败报告
  ↓
生成自动化用例
  ↓
GitLab CI 跑测试
  ↓
必要时配合 Codex 修复
  ↓
自动提 MR / 回写结果
```

## 1. 需求 / Jira 解析模块


MCP 负责执行，但它不应该直接负责理解 Jira。

你还需要一个 Issue Parser / Requirement Parser。

它负责把 Jira、需求文档、Bug 描述里的自然语言变成结构化信息。

例如 Jira 里写：

复现步骤：

1. 打开 App
2. 登录账号
3. 进入订单页面
4. 点击待支付订单
5. 返回上一页
6. 页面白屏


解析成：

``` json
{
  "type": "bug_reproduction",
  "title": "订单详情返回后白屏",
  "preconditions": [
    "用户已安装测试包",
    "账号存在待支付订单"
  ],
  "steps": [
    "打开 App",
    "登录账号",
    "进入订单页面",
    "点击待支付订单",
    "返回上一页"
  ],
  "expected": "返回订单列表页",
  "actual": "页面白屏"
}
```


这个模块可以做成：
> jira-parser-mcp

或者先不做 MCP，直接作为你的 Agent 里的一个普通服务。

## 2. Flow 生成模块

mobile-automation-mcp 可以执行 Flow，但还需要有人把“复现步骤”翻译成 Flow DSL。

也就是：

```
自然语言步骤
  ↓
AI 生成结构化 Flow
  ↓
mobile.run_flow 执行
```

比如：
```
点击登录按钮
```


要变成

``` json
{
  "action": "tap",
  "selector": {
    "strategy": "accessibilityId",
    "value": "login.submit"
  }
}
```

这里最大的问题是：AI 不一定知道元素 ID。

所以你还需要一个 页面元素知识库。


## 3. 页面元素知识库 / UI Map

这是非常关键的一层。

你不能每次都让 AI 猜：

```
login.submit
home.profileEntry
order.list
payment.confirm
```

你需要维护一个 UI Map。

例如：

``` json
{
  "LoginScreen": {
    "phoneInput": {
      "accessibilityId": "login.phoneInput",
      "description": "手机号输入框",
      "type": "input"
    },
    "submitButton": {
      "accessibilityId": "login.submit",
      "description": "登录按钮",
      "type": "button"
    }
  },
  "HomeScreen": {
    "orderEntry": {
      "accessibilityId": "home.orderEntry",
      "description": "订单入口",
      "type": "button"
    }
  },
  "OrderListScreen": {
    "pendingOrderItem": {
      "accessibilityId": "order.pending.item",
      "description": "待支付订单项",
      "type": "cell"
    }
  }
}
```

后面 AI 生成 Flow 时，就可以参考这个 UI Map。

建议你实现一个：
ui-map-service

或者：

ui-map-mcp

它提供：

```
ui.search_element
ui.get_screen_elements
ui.resolve_action_to_selector
ui.validate_selector_exists
```

## 4. 测试账号 / 测试数据管理

自动化测试不能只会点页面，还要有稳定的数据。

你需要一个 Test Data Service。

它负责提供：

```
测试账号
验证码 mock
测试订单
测试商品
测试支付状态
测试地址
测试优惠券
测试图片 / 视频文件
```

比如 Flow 里不能写死：

```
{  "text": "13800138000"}
```

更好的方式是：
``` json
{
  "action": "type",
  "selector": {
    "strategy": "accessibilityId",
    "value": "login.phoneInput"
  },
  "textFrom": {
    "source": "testData",
    "key": "defaultUser.phone"
  }
}
```
然后运行时从测试数据服务里拿：

```
{
  "defaultUser": {
    "phone": "13800138000",
    "password": "123456",
    "otp": "000000"
  }
}
```

否则你后面会遇到：

```
账号被封
订单状态变化
验证码不稳定
优惠券过期
数据重复提交
支付状态不可控
测试环境脏数据
```
## 5. 测试环境治理
你还需要明确一套测试环境：

```
dev
staging
pre-release
production-like
```
并且每次自动化运行时可以控制：

```
App 包地址
API host
登录环境
Mock 开关
灰度开关
功能开关
测试账号
数据初始化
```
建议你做一个：

> environment-config-service

最少要有：

``` json
{
  "env": "staging",
  "apiBaseUrl": "https://staging-api.xxx.com",
  "appBuildUrl": "https://cdn.xxx.com/app.ipa",
  "featureFlags": {
    "newPayment": true,
    "rnNewHome": false
  },
  "mock": {
    "smsCode": "000000",
    "payment": "success"
  }
}
```

## 6. 设备管理 / Device Farm

mobile-automation-mcp 能连 Appium，但它本身不应该负责管理大量设备。

你后面需要：

```
设备池
模拟器池
真机池
Appium Server 池
设备占用 / 释放
设备健康检查
并发调度
失败重试
```

比如：

```
{
  "platform": "ios",
  "device": "iPhone 15",
  "os": "17.5",
  "runtime": "rn"
}
```

实际要分配到某台机器：

```
mac-runner-01
  └── iPhone 15 Simulator
  └── Appium :4723
```

这个模块可以叫：

> device-orchestrator

它负责：

```
device.acquire
device.release
device.health_check
device.install_app
device.reset_app
device.list_available
```


## 7. App 构建产物管理
你前面已经在做 GitLab CI、IPA/APK、CDN、二维码、OBS 上传。
这套自动化里还需要一个 Build Artifact Service。
它负责回答：
```
当前要测哪个包？
这个包的 IPA/APK 地址是什么？
版本号是多少？
构建环境是什么？
对应 Git commit 是哪个？
对应 MR 是哪个？
```

例如：

``` json
{
  "app": {
    "platform": "ios",
    "versionName": "0.1.238",
    "versionCode": "238",
    "buildEnv": "staging",
    "downloadUrl": "https://cdn.onemoresg.com/ios/app.ipa",
    "commitSha": "abc123"
  }
}
```
否则自动化执行时会混乱：

```
不知道测的是哪个包
不知道失败对应哪个 commit
不知道报告应该回写到哪个 MR
不知道截图对应哪个版本
```

## 8. Evidence Collector 证据中心
mobile-automation-mcp 可以截图和拿日志，但你还需要一个统一的证据收集规范。
每次失败至少要保存：

```
失败步骤
失败原因
失败截图
失败前一张截图
当前页面 source
当前设备信息
App 版本
Git commit
测试账号
网络环境
Appium logs
iOS syslog / Android logcat
Flow JSON
生成的 Appium case
```
建议产物结构：

```
artifacts/
└── runs/
    └── 2026-04-30-001/
        ├── meta.json
        ├── flow.json
        ├── report.md
        ├── junit.xml
        ├── screenshots/
        │   ├── 001-before-login.png
        │   ├── 002-after-submit.png
        │   └── failed-step.png
        ├── page-source/
        │   └── failed-step.xml
        ├── logs/
        │   ├── appium.log
        │   ├── android-logcat.log
        │   └── ios-syslog.log
        └── generated-tests/
            └── reproduce-order-white-screen.spec.ts
```

这个模块可以叫：

> evidence-service

## 9. 报告系统
只截图还不够，需要生成可读报告。

至少支持：

```
Markdown 报告
HTML 报告
JUnit XML
GitLab Test Report
失败摘要
AI 分析结论
```

报告里应该有：

```
测试结论：成功 / 失败 / 部分成功
执行环境
App 版本
设备信息
步骤详情
每一步耗时
失败步骤
失败截图
错误日志
可能原因
复现稳定性
建议修复方向
```
例如：

```markdown
# 订单返回白屏复现报告

- 结果：复现成功
- App：iOS 0.1.238
- 设备：iPhone 15 / iOS 17.5
- 环境：staging
- 失败步骤：第 5 步，点击返回按钮后页面白屏

## 证据

- failed-step.png
- failed-step.xml
- appium.log
- ios-syslog.log

## 初步判断
```

## 10.  测试用例仓库

AI 临时跑出来的 Flow 不能只停留在一次性执行。

你要有一个测试用例仓库：

```
mobile-e2e-tests/
├── flows/
│   ├── login.flow.json
│   ├── order-create.flow.json
│   ├── payment-success.flow.json
│   └── profile-logout.flow.json
├── generated/
│   └── jira-bug-1234.flow.json
├── specs/
│   ├── login.spec.ts
│   └── order.spec.ts
└── wdio.conf.ts
```
把临时复现成功的 Flow 固化成长期用例。

这样你就会有两类自动化：

```
主流程回归用例
Bug 复现用例
```


## 11. 用例分级和调度策略

不能所有提交都跑所有用例。

你需要一套策略：

```
P0 冒烟测试：每次提交都跑
P1 主流程测试：MR 合并前跑
P2 全量回归：每天定时跑
P3 Bug 复现池：相关模块变更时跑
P4 兼容性矩阵：发版前跑
```

例如：

``` json
{
  "caseId": "order.white-screen.001",
  "priority": "P1",
  "tags": ["order", "rn", "navigation"],
  "platforms": ["ios", "android"],
  "trigger": ["merge_request", "nightly"],
  "relatedPaths": [
    "src/pages/order/**",
    "src/navigation/**"
  ]
}
```

这样 GitLab CI 可以根据变更文件决定跑哪些用例。

## 12. GitLab CI 编排

你已经有 Android / iOS CI 基础了。后面需要加移动端自动化 job。

例如：

``` yaml
mobile_e2e_android:
  stage: test
  image: reactnativecommunity/react-native-android:v20.1
  script:
    - npm ci
    - npm run build:mcp
    - appium --port 4723 > appium.log 2>&1 &
    - npm run e2e:android
  artifacts:
    when: always
    paths:
      - artifacts/mobile-e2e/
    reports:
      junit: artifacts/mobile-e2e/junit.xml
```

iOS 则需要 macOS runner：

``` yaml
mobile_e2e_ios:
  stage: test
  tags:
    - macos-runner
  script:
    - npm ci
    - appium --port 4723 > appium.log 2>&1 &
    - npm run e2e:ios
  artifacts:
    when: always
    paths:
      - artifacts/mobile-e2e/
    reports:
      junit: artifacts/mobile-e2e/junit.xml
```

## 13.  风险控制 / 权限系统

这个非常重要。

你不能让 AI 随便点任何东西，尤其是：

```
支付
删除账号
修改密码
真实下单
真实发短信
真实发送通知
生产环境操作
```


所以你需要一个 Action Policy Engine。

它负责拦截高风险动作。

例如：

```
{
  "blockedActions": [
    "payment.confirm",
    "account.delete",
    "profile.changePassword",
    "wallet.withdraw"
  ],
  "requireHumanApproval": [
    "order.submit",
    "payment.pay",
    "user.logout"
  ],
  "allowedEnvs": ["dev", "staging"]
}
```

Flow 执行前先校验：

```
mobile_validate_flow
  ↓
policy_check
  ↓
允许执行 / 需要确认 / 拒绝执行
```
这是你未来能不能“去掉人工确认”的关键。

不是完全不确认，而是：


```
低风险自动执行
中风险规则确认
高风险人工确认
生产环境禁止执行
```

## 14.  AI Agent 编排层

MCP 是工具，不是大脑。

你还需要一个 Agent Orchestrator。

它负责决定：
```
什么时候读 Jira
什么时候查 UI Map
什么时候生成 Flow
什么时候调用 mobile MCP
什么时候重试
什么时候生成报告
什么时候生成 Appium Case
什么时候通知人
什么时候提 MR
```

可以这样分层：

```
Agent Orchestrator
  ├── Jira Agent
  ├── Flow Generator Agent
  ├── Mobile Executor Agent
  ├── Evidence Analyst Agent
  ├── Test Case Generator Agent
  └── GitLab MR Agent
```

也可以先简单点：

```
一个 Node.js 服务
  ├── 调 jira-mcp
  ├── 调 mobile-automation-mcp
  ├── 调 gitlab-mcp
  └── 调 LLM
```


## 15. Codex / 修复链路

如果你要做到：

```
扫描 Jira → 复现 → 修复 → 测试 → 提 MR
```

那还需要一个 Code Fix Agent。

它要做：

```
1. 根据失败报告定位相关代码
2. 让 Codex / 编程 Agent 修改代码
3. 本地跑单测 / 类型检查 / lint
4. 重新打包 App
5. 重新执行 mobile flow
6. 成功后提交 MR
```
注意这个链路必须有沙箱和权限限制。

建议分成两个阶段：

### 阶段 A：只复现，不修复

Jira → Flow → 执行 → 报告

### 阶段 B：半自动修复

Jira → 复现 → AI 生成修复建议 → 人工确认 → Codex 修改 → 自动测试

### 阶段 C：自动提 MR

Jira → 复现 → Codex 修改 → 测试通过 → 自动提 MR

不要一开始就直接做阶段 C。

## 16. Mock / 后端测试辅助能力

很多移动端问题无法只靠 UI 自动化稳定复现。

你需要后端配合：

```
接口 Mock
测试数据初始化
订单状态修改
用户状态重置
验证码固定
支付结果模拟
推送模拟
文件上传模拟
AB 实验开关
灰度开关
```
否则很多 Flow 会卡住。

例如支付场景：
```
点击支付
  ↓
真实支付不可自动化
  ↓
需要 mock payment success
  ↓
返回 App 断言支付成功页
```

所以你要有：

> test-backend-helper

提供：

```
testData.createUser
testData.createOrder
testData.mockPaymentSuccess
testData.resetUserState
testData.setFeatureFlag
```


## 17. 页面稳定性和等待策略

Appium 自动化最大的坑之一是等待。

你不能只用：

```
wait 3000ms
```


要实现统一等待策略：

```
wait_for_element
wait_for_text
wait_for_page_idle
wait_for_network_idle
wait_for_loading_gone
wait_for_animation_end
```

尤其 RN / Hybrid 里常见：

```
loading 还没结束
动画还没结束
页面刚跳转
接口还在请求
列表还没渲染
WebView 还没 ready
```

所以 mobile MCP 之外，你还要规范 App 内部暴露一些测试状态。

例如 RN 可以在 dev/staging 包里暴露：

``` typescript
global.__E2E__ = {
  currentRouteName: "OrderList",
  pendingRequests: 0,
  isLoading: false
}
```

然后 MCP 可以通过 native bridge / WebView evaluate / test endpoint 查询页面是否稳定。

## 18. App 内测试 Hook

如果你想做得更稳，可以在 App 内置一个仅测试环境启用的 E2E Hook。

例如：

```
e2e://reset
e2e://login?user=default
e2e://openPage?name=OrderList
e2e://mock?payment=success
```

或者 RN 暴露：

``` typescript
global.__E2E__.loginAs("defaultUser")
global.__E2E__.navigate("OrderList")
global.__E2E__.setMock("payment", "success")
```

这样可以大幅减少 UI 自动化的前置步骤。

比如不用每次都走完整登录流程：

```
启动 App
  ↓
e2e login as default user
  ↓
直接进入目标页面
  ↓
开始复现 bug
```

这比纯 UI 点一遍稳定很多。

## 19. 视觉对比 / 白屏检测

你前面提到白屏、Hybrid、WebView、RN 页面问题。

那你还需要一些自动判断能力：

```
白屏检测
黑屏检测
页面卡死检测
Crash 检测
明显 UI 错乱检测
截图相似度比较
关键区域 OCR
```

第一版不用做复杂 AI 视觉，可以先做简单规则：

```
截图大面积纯白 → 疑似白屏
截图大面积纯黑 → 疑似黑屏
页面 source 元素数过少 → 疑似未渲染
连续 5 秒页面 source 不变 + loading 存在 → 疑似卡死
App 进程退出 → crash
```

这些可以做成：

```
visual-check-service
```

或者 mobile MCP 的 tool：

```
mobile_detect_white_screen
mobile_detect_crash
mobile_compare_screenshot
```


## 20. 日志分析模块

只收集日志不够，还要分析日志。

尤其移动端常见错误：

```
JS exception
Native crash
ANR
Network error
接口 500
WebView load failed
RN red screen
OOM
Image decode error
Promise rejection
Navigation error
```

你需要一个 Log Analyzer：


```
log_analyzer.analyze_android_logcat
log_analyzer.analyze_ios_syslog
log_analyzer.analyze_rn_js_log
log_analyzer.extract_error_stack
```


输出：

``` json
{
  "level": "error",
  "category": "RN_JS_EXCEPTION",
  "message": "Cannot read property 'items' of undefined",
  "stack": "...",
  "possibleFiles": [
    "src/pages/order/OrderList.tsx"
  ]
}
```

这个结果可以给 Codex 修复 Agent 使用。

21. 你最终需要的模块总览

完整体系可以这样拆：

```
AI Mobile QA System
│
├── 1. mobile-automation-mcp
│   └── 负责执行移动端动作
│
├── 2. jira-parser / requirement-parser
│   └── 负责解析需求、Bug、复现步骤
│
├── 3. flow-generator
│   └── 负责把自然语言转 Flow DSL
│
├── 4. ui-map-service
│   └── 负责页面元素知识库
│
├── 5. test-data-service
│   └── 负责账号、订单、验证码、Mock 数据
│
├── 6. environment-service
│   └── 负责测试环境、包地址、feature flag
│
├── 7. device-orchestrator
│   └── 负责设备池、Appium server、并发调度
│
├── 8. evidence-service
│   └── 负责截图、日志、source、报告产物
│
├── 9. report-service
│   └── 负责 Markdown / HTML / JUnit 报告
│
├── 10. policy-engine
│   └── 负责风险动作拦截和权限控制
│
├── 11. gitlab-ci-integration
│   └── 负责 CI 触发、artifact、MR、测试结果
│
├── 12. app-build-artifact-service
│   └── 负责 IPA/APK 包、版本、commit 关联
│
├── 13. log-analyzer
│   └── 负责分析 JS/native/network 错误
│
├── 14. visual-check-service
│   └── 负责白屏、黑屏、卡死、截图对比
│
└── 15. code-fix-agent
    └── 负责配合 Codex 修复并提 MR
```

## 22. 实现优先级

不要一次全做。

我建议你按这个顺序。

### 第一阶段：能跑

```
1. mobile-automation-mcp
2. UI Map 最小版
3. Flow DSL
4. Evidence Collector 最小版
5. 本地 Appium 跑通登录流程
```

目标：

```
AI 可以启动 App，跑一个登录 Flow，失败时截图。
```


### 第二阶段：能复现

```
6. Jira / 需求解析
7. Flow Generator
8. Test Data Service
9. Report Service
10. Log Analyzer 最小版
```

目标：

```
从 Jira 复现步骤生成 Flow，跑完后输出报告。
```


### 第三阶段：能进 CI

```
11. GitLab CI 集成
12. App Build Artifact Service
13. Device Orchestrator 最小版
14. JUnit Report
```

目标：

```
MR 或定时任务触发移动端自动化，报告进入 GitLab。
```

### 第四阶段：能长期维护

```
15. 用例仓库
16. 用例分级
17. 变更影响分析
18. 失败重试策略
19. Flaky Case 治理
```

目标：

```
不是一次性 demo，而是能持续跑。
```

### 第五阶段：半自动修复

```
20. Code Fix Agent
21. Codex 集成
22. 自动生成修复分支
23. 自动跑回归
24. 自动提 MR
```

目标：

```
AI 可以基于复现结果尝试修复，并自动验证。
```

## 23. 最小可落地版本

你现在最应该先做的是这个：

```
mobile-automation-mcp
  +
ui-map.json
  +
flow-runner
  +
artifacts/report.md
```
最小闭环：

```
手写一个 bug-flow.json
  ↓
mobile-automation-mcp 执行
  ↓
失败时截图 + page source
  ↓
生成 report.md
```

目录可以是：


```
mobile-qa/
├── mcp/
│   └── mobile-automation-mcp/
├── flows/
│   ├── login.flow.json
│   └── order-white-screen.flow.json
├── ui-map/
│   ├── login.json
│   ├── home.json
│   └── order.json
├── test-data/
│   └── staging.json
├── artifacts/
│   └── runs/
└── scripts/
    ├── run-flow.ts
    └── generate-report.ts
```

这样你先不用接 Jira，也不用接 Codex，先把最核心的“移动端自动化复现能力”跑通。

## 24. 一句话总结

实现 mobile-automation-mcp 只是完成了：

```
AI 可以控制手机 App
```

但要满足你的完整需求，还要补齐：

```
AI 如何理解需求
AI 如何知道点哪个元素
测试数据怎么来
设备怎么分配
失败证据怎么保存
报告怎么生成
CI 怎么跑
风险动作怎么拦截
Bug 如何固化成用例
修复如何验证
```


所以最终你要做的不是一个 MCP，而是一套：

```
AI 驱动的移动端自动化测试平台
```

其中 mobile-automation-mcp 是执行核心，但旁边必须配：
```
UI Map + Flow Generator + Test Data + Device Orchestrator + Evidence + Report + CI + Policy Engine
```