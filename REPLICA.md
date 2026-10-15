# 原版网站复刻

本分支在 [jayson2hu/infinite-canvas](https://github.com/jayson2hu/infinite-canvas/tree/replica/original-site) 保留原版网站的完整应用源码，新增本仓库的运行说明和浏览器验收记录。

- 参考网站：[canvas.best](https://canvas.best)
- 上游：[basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas)
- 版本：`v0.20.0`
- 上游提交：`3a6b64b602ad062b29fac66902ed18a7ef5fd9dc`
- 分支：`replica/original-site`
- `web/` Git tree：`f29602789f7337da7306c44e449d0bd877c1564c`

`web/`（含页面、样式、素材及依赖锁文件）、`canvas-agent/`、`canvas-proxy/`、`plugins/`、`VERSION` 和 `LICENSE` 均与上述上游提交一致。此前的创作工作台改版保留在 `feat/creator-workspace`，本分支未合入它的界面调整。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。首次获取：

```sh
git clone --branch replica/original-site https://github.com/jayson2hu/infinite-canvas.git
cd infinite-canvas/web
npm ci
npm run dev -- --host 127.0.0.1 --port 3036 --strictPort
```

访问 <http://127.0.0.1:3036/>。这次交付的本地目录是 `D:\fayun\code\infinite-canvas-replica`，在该目录的 `web/` 中运行最后一条命令即可重新启动。

| 页面 | 路径 |
| --- | --- |
| 原版首页 | `/` |
| 我的画布 / 画布编辑器 | `/canvas` / `/canvas/:id` |
| 生图工作台 | `/image` |
| 视频创作台 | `/video` |
| 提示词中心 | `/prompts` |
| 我的资产 | `/assets` |
| 配置 | `/config` |

实际图片、视频或文本生成需要在配置中填写自己的 Base URL、API Key 和模型。画布、资产、生成记录及密钥主要保存在当前浏览器本地；它们不会随 Git 仓库上传，也不会自动获得原站的账户、密钥或个人数据。提示词列表和示例图片按原站逻辑从外部来源读取，需要相应网络可用。

## 部署自己的实例

仓库已包含上游的 `vercel.json`、`Dockerfile` 和 `nginx.conf`。

- Vercel：导入你的仓库，选择 `replica/original-site` 分支，项目根目录使用仓库根目录；根目录 `vercel.json` 已配置 `web/` 的安装、构建和 SPA 路由。
- Docker：在仓库根目录从当前源码构建，避免使用上游 `docker-compose.yml` 中指向原作者预构建镜像的默认配置。

```sh
docker build -t infinite-canvas-own .
docker run --rm -p 3000:3000 infinite-canvas-own
```

Docker 入口为 <http://localhost:3000/>。本次只实际运行并验收本地 Vite 网站，没有发布公网域名，也没有验证 Docker 或云平台部署。

## 验收

查看 [验收结果](docs/replica/verification.json)、[验收脚本](docs/replica/verify.py) 和同目录截图。脚本使用独立浏览器上下文，不读取用户浏览器中的画布或 API 密钥。

运行中的本地网站可按以下方式复验；需要 Python、Playwright 和 Chrome：

```sh
python -m pip install playwright
python docs/replica/verify.py --base-url http://127.0.0.1:3036 --reference-url https://canvas.best
```

如果访问外部提示词来源或参考网站需要代理，可以为验收脚本增加 `--proxy http://127.0.0.1:代理端口`；该选项只影响测试浏览器。

本次 9 项检查通过，未捕获浏览器运行时异常。首页截图对照范围是 1440 × 825 的顶部导航及首屏区域：1,188,000 个像素中有 56 个不同，具体哈希与像素差异记录在报告中。画布历史由原版代码延迟 180 毫秒合并，撤销/重做测试等待历史提交后进行；快速连续操作未作修复。实际付费生成、Agent、WebDAV、远程插件执行和生产部署未验证。

本次未新增或调整产品功能；已检查原版的 `todo.mdx` 与 `pending-test.mdx`，保留原有功能待办和待测清单。

## 许可证

保留上游 [MIT LICENSE](LICENSE) 和版权声明。MIT 允许使用、复制、修改、分发及商用，分发源码或包含重要源码的副本时需要同时保留版权与许可声明。本分支也保留原站页面标识。
