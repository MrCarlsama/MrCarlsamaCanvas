# MrCarlsama Canvas

MrCarlsama Canvas 是一个面向二次元摄影策划的 Desktop-first 无限画布应用。

它希望把角色理解、拍摄构思、参考素材、分镜、场景与灯光信息放在同一个可自由组织的工作空间中，而不是把摄影策划压进一张固定表单。

> 当前状态：**walking skeleton（可行走骨架）**。仓库首先验证桌面壳、前端、持久化和画布之间的最小贯通，不代表功能已经可用于正式生产。路线图中的功能不能视为已经实现。

## 产品边界

- 一个项目只有一张无限画布。
- 一张画布可以有多个根节点，而不是强制一棵树。
- Frame 用于空间分组，Saved View 用于保存视口与导航位置。
- 素材库是独立于项目的全局能力；导入时创建受管副本，项目只引用素材。
- 素材按 SHA-256 内容哈希去重，集合是虚拟组织，不重复复制或搬动受管文件。
- 导出以 Eagle 风格的“源文件 + 可读目录 + 清单”为目标。
- AI 是可选增强能力，采用用户自带密钥（BYOK），不进入首阶段关键路径。
- Card SDK 采用编译时插件模型；当前不加载来源不明的运行时代码。

## 技术栈

- Tauri 2
- Vue 3
- Vite
- TypeScript
- AntV X6
- SQLite
- pnpm workspace

更完整的系统边界见 [架构总览](docs/architecture/overview.md)。

## 仓库结构

仓库按以下方向组织；walking skeleton 阶段的实际目录可能仍在逐步补齐：

```text
apps/
  desktop/              Tauri 桌面应用与 Vue 前端
packages/
  core/                 领域中立的画布核心
  card-sdk/             卡片类型与插件契约
  assets/               素材库领域能力
  cards-built-in/       使用公共 SDK 注册的内置卡片
  editor-x6/            AntV X6 渲染与交互适配
  studio/               产品工作流与状态编排
  ui-newsprint/         Newsprint 视觉 token
docs/
  architecture/         架构与数据边界
```

## 本地开发

需要 Node.js 24、pnpm 10、Rust 1.88，以及 Tauri 2 对应平台的系统依赖。仓库提供 `.nvmrc` 和 `rust-toolchain.toml`；开始前先确认当前 shell 真的使用了这两个版本，不能只看“已经安装”。

```bash
nvm use
export PATH="$HOME/.cargo/bin:$PATH"
node --version
cargo --version
pnpm install
pnpm dev
```

`node --version` 应为 `v24.x`，`cargo --version` 应来自 Rust 1.88。若系统包管理器安装的旧版 `cargo` 排在 rustup 前面，Tauri 会无视仓库的 toolchain 文件并直接构建失败。

以根目录 `package.json` 中的脚本为准。walking skeleton 尚未承诺所有平台都具备相同完成度；提交问题时请附操作系统、架构、Node/pnpm/Rust 版本和完整错误日志。

## 设计原则

1. **先保证本地工作流完整。** 没有网络、没有 AI，核心画布和素材仍应可用。
2. **数据比界面更稳定。** UI 可以重做，项目文件和插件数据不能随意破坏。
3. **消除特殊情况。** 根节点、Frame、Saved View 都使用明确的数据关系，不把屏幕状态偷偷当领域数据。
4. **不声称未完成的能力。** 每个里程碑以可验证结果为准。

## 文档

- [架构总览](docs/architecture/overview.md)
- [数据模型](docs/architecture/data-model.md)
- [插件模型](docs/architecture/plugin-model.md)
- [素材库](docs/architecture/asset-library.md)
- [路线图](docs/roadmap.md)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)

## 许可证

本仓库采用分层许可证：

- 主应用、核心画布、素材库和内置卡片：[`AGPL-3.0-only`](LICENSE)
- Card SDK 与官方插件模板：[`Apache-2.0`](LICENSES/Apache-2.0.txt)

具体文件边界见 [LICENSES/README.md](LICENSES/README.md)。不能仅因为依赖 Apache-2.0 的 SDK，就把 AGPL 主产品改造成闭源网络服务。
