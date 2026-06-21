# VisePanda 线上回归检查手册

## 1. 文档用途

这份文档用于发布前后和线上复测时做人工回归，不替代自动化测试。

## 2. 回归前提

- 线上地址：`https://www.go2china.space`
- 本地测试命令：

```bash
python3 -m unittest discover -s tests -v
node --test web/tests/*.test.js
```

## 3. 桌面端核心回归

- 首页是否正常加载
- `Sign in` 是否正常触发
- Chat 是否正常响应
- Cities 是否可进入
- Trips 是否可进入
- Tools 是否可进入

## 4. 移动端核心回归

- bottom nav 是否可见
- tab 是否可点击
- safe-area 是否正确
- 页面是否被遮挡
- 输入区是否被挤压

## 5. 资源与性能观察点

- 图片是否加载失败
- 页面切换是否缺乏反馈
- 是否出现空白或卡死感
- 控制台是否报错

## 6. 如果发现问题先怀疑哪里

- `Sign in` 异常：先看 `web/app.js` 的 bootstrap 与 auth trigger
- 图片异常：先看图片路径、fallback 和 `static/img`
- 移动端 nav 异常：先看 `web/app.css` 的 safe-area 和 `.bottom-nav`

## 7. 发布前最低通过线

- 首页、Sign in、Chat、Cities、Trips、Tools 全部可进入
- 手机端 bottom nav 可见可点
- 图片没有大面积失败
- 回归命令通过
