# 真实应用体验验收

本目录验证 `web` 中的创作者工作台、项目管理和导航改造，不是 `../prototype/` 中的独立积分演示。

## 结果

- 独立 Chrome 测试环境完成 9 组流程检查，详见 [verification.json](./verification.json)。测试禁止外部服务请求，未使用真实账户或付费模型。
- 新建的文字简报、待生成图片与连线在本地写入完成后可以刷新恢复；图片节点保持 `idle`，创建项目不会自动生成。
- 项目名称搜索、首尾空格处理、无结果恢复、名称排序、重命名、选择与取消选择、删除全部的取消确认和 ZIP 导出通过。
- 本地小图预览刷新恢复、最近编辑项目顺序、语言与主题切换、手机导航及表单布局通过；测试范围内无浏览器运行错误或 HTTP POST。
- Vite 生产构建成功。现有主包约 3.76 MB，gzip 约 1.19 MB；仍有大包与静态/动态重复引用提示。路由拆包可作为后续性能优化，当前没有进行无关架构重构。
- TypeScript 检查仍有一处上游已有错误：未改动的 `web/src/components/layout/model-script-editor.tsx:58` 使用 `Modal.styles.content`，与当前 Ant Design 6 类型不符。本次改动文件未产生其他类型错误；不能将整体类型检查记为通过。

## 复现

在 `web` 启动 Vite，监听 `http://127.0.0.1:3033`。使用装有 Python Playwright 和 Google Chrome 的环境，在仓库根目录运行：

```text
python docs/product/ux-review/verify.py
```

脚本创建临时浏览器环境，不读取用户现有浏览器数据。脚本通过真实页面操作创建三份项目，只为本地封面恢复验证插入一张标注「本地预览测试素材」的图片。截图中的该图片不是模型生成结果，也不是产品内置素材。

## 截图

| 界面 | 文件 |
| --- | --- |
| 初次使用工作台 | [workbench-light.png](./workbench-light.png) |
| 最近项目与继续创作 | [workbench-returning.png](./workbench-returning.png) |
| 从需求创建的真实画布 | [canvas-start.png](./canvas-start.png) |
| 项目搜索与管理 | [projects-light.png](./projects-light.png) |
| 深色主题 | [workbench-dark.png](./workbench-dark.png) |
| 英文工作台 | [workbench-english.png](./workbench-english.png) |
| 手机工作台 | [workbench-mobile.png](./workbench-mobile.png) |
| 手机创作表单 | [workbench-mobile-form.png](./workbench-mobile-form.png) |
| 手机项目列表 | [projects-mobile.png](./projects-mobile.png) |

## 验证边界与下一阶段

没有验证真实模型生成、邮件送达、支付、积分扣退、云保存、服务器部署或真实 Agent 连接。现有导入、Agent URL 参数等路径保留，但未在本脚本中做完整端到端验证；人工验收项见 [Pending Tests](../../content/docs/progress/pending-test.zh-CN.mdx)。

现有本地写入有短暂延迟，没有可靠的保存完成提示或关闭页面前立即保存保障。因此这里验证的是写入完成后的刷新恢复，不承诺点击创建后立即关闭浏览器也不会丢失最后修改。后续应将真实保存状态与失败恢复纳入云端项目整合，而不是显示固定的「已保存」标签。

尚未开展目标用户访谈、可用性任务计时、留存或转化实验。本次设计的收益需要用真实用户行为验证，不能据自动化检查声称转化率提升。
