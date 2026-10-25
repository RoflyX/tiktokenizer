# Tiktokenizer（ChatGPT 中文网版）

在线分词器：粘贴文本，查看 OpenAI 编码（`o200k_base`、`cl100k_base` 等）和部分开源模型的 token 数与切分结果。分词完全在浏览器里完成，输入的文本不会上传。

本项目基于 [dqbd/tiktokenizer](https://github.com/dqbd/tiktokenizer)（MIT 许可）修改，独立部署，与原作者无隶属关系。原始版权声明与许可见 [`LICENSE`](LICENSE)。

## 与上游的差异

- 纯静态站（`next build && next export`），没有服务端渲染、API 路由和运行时密钥；去掉 tRPC、i18n 与 `@vercel/analytics`。
- 统计用 GA4：测量 ID 来自构建时的 `NEXT_PUBLIC_GA_ID`（公开标识，非密钥，默认写在 `.env.production`），只在生产构建加载；除页面访问外只上报 `select_model`（所选模型）和 `start_typing`（每次访问首次编辑，不带内容），不读取也不上传输入文本。没有该变量的构建产物不含任何统计代码。
- 开源模型的分词库用 [`@huggingface/tokenizers`](https://github.com/huggingface/tokenizers.js)（零依赖，约 8 kB gzip），替换了 `@xenova/transformers`：后者无法加载 Qwen3、GLM-4.5 的 `tokenizer.json`。片段切分（页面上的彩色分段与 token 计数）已重写，线性时间，且每个 token 恰好属于一个片段。
- `tiktoken` 固定为 1.0.21：1.0.22 的 wasm 带有 Next 13.0.6 自带的 webpack 无法解析的段，构建会失败。1.0.21 不认识 `gpt-5*` 和 `gpt-oss-*`，由 `src/models/tokenizer.ts` 按官方名称表映射到 `o200k_base`（`openai-models.test.ts` 与官方表对照）。升级 Next 后可改用新版。
- 开源模型分词器由 [`tokenizers.json`](tokenizers.json) 固定：每个模型记录 Hugging Face 的 `revision`（40 位 commit）、许可证、文件大小和 `sha256`。构建时 `scripts/tokenizers.mjs fetch` 按清单下载并校验，不需要 `HF_API_KEY`；哈希不符则构建失败。
- 只收录无门槛、许可证为 MIT 或 Apache-2.0 的分词器。需要授权或许可证非宽松的模型（Llama、CodeLlama、Gemma、Qwen2.5-72B 等）不在站内分发。

## 开发

需要 Node 20（见 `.nvmrc`）和 yarn 1.22。

```bash
yarn install
yarn dev        # 先按清单下载分词器到 public/hf，再启动开发服务器
yarn test       # 单元测试（含模型枚举与清单一致性）
yarn build      # 生成静态站点到 out/
```

`public/hf/` 与 `out/` 是构建产物，已被 `.gitignore` 忽略。

### 与 Python 对照

`src/models/parity.test.ts` 把页面实际使用的分词器与 Python 的 `tiktoken`、`tokenizers` 逐条比对：token id 完全一致，页面显示的计数等于 token 数，片段能还原输入，并限制 20,000 个汉字的耗时。语料不入库，需要自己抽样生成：

```bash
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install tiktoken tokenizers
yarn tokenizers
/tmp/venv/bin/python scripts/parity.py --out /tmp/parity --src <含中英文与代码的目录...>
PARITY_DIR=/tmp/parity yarn test src/models
```

未设置 `PARITY_DIR` 时这些对照自动跳过。`src/models/openai-models.test.ts` 另外保证：列出的每个 OpenAI 模型名都能分词，并且与官方 `tiktoken` 的模型名表（先精确匹配，再按前缀）解析到同一个编码。`gpt-oss-*` 官方用 `o200k_harmony`，JS 版 `tiktoken` 没有该编码，这里用 `o200k_base`：二者对普通文本的 token id 完全相同（1229 条样本 0 差异），只有 `<|start|>`、`<|channel|>` 等特殊 token 不同。

## 增加或更新开源模型

```bash
node scripts/tokenizers.mjs pin <组织>/<仓库>   # 写入 tokenizers.json；门槛模型或非宽松许可证会被拒绝
```

随后把仓库名加入 `src/models/index.ts` 的 `openSourceModels`，`yarn test` 会检查两处是否一致。

## 收录页面（SEO）

`src/seo/pages.ts` 登记要被收录的编码页（`/encoding/<slug>`）和模型页（`/model/<slug>`），每页有唯一的 `title`、`description`。页面里的示例 token 数与 FAQ 事实在构建时由页面实际使用的分词器算出（`src/seo/facts.ts`），不手写数字；开源模型页的出处、revision、许可证来自 `tokenizers.json`。增加页面只需在 `LANDING_PAGES` 加一项（slug 不含点号）。

`yarn build` 最后运行 `scripts/seo-postbuild.mjs`：检查每页 `title`、`description` 存在且不重复，`canonical` 与路径一致，站内链接都有对应文件，通过后写出 `out/sitemap.xml`；任一项不满足则构建失败。`public/robots.txt` 指向该站点地图。

## 部署

产物是 `out/` 目录，可用 [Workers 静态资源](https://developers.cloudflare.com/workers/static-assets/)托管，配置见 [`wrangler.jsonc`](wrangler.jsonc)。本地预览：`npx wrangler dev`（wrangler 需要 Node 22 及以上，与构建所用的 Node 20 无关）。

## 致谢

- [dqbd/tiktokenizer](https://github.com/dqbd/tiktokenizer)
- [T3 Stack](https://create.t3.gg/)
- [shadcn/ui](https://github.com/shadcn/ui)
- [openai/tiktoken](https://github.com/openai/tiktoken)
