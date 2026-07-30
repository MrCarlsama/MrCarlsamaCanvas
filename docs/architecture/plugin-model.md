# Card 插件模型

## 当前选择：编译时插件

插件在构建阶段被显式依赖并注册，随应用一起发布：

```ts
registerCards([characterCard, shotCard, referenceBoardCard]);
```

这意味着当前没有插件目录扫描、远程下载、动态 `import()` 任意文件或 WebView 中执行第三方脚本。

这是刻意的产品边界。运行时插件不仅是一个加载器，还会带来签名、沙箱、权限、升级、崩溃隔离和供应链治理。在没有真实需求与安全模型前实现它，只会制造一个不可信代码执行入口。

## 插件契约

一个 Card 插件至少声明：

- 全局唯一且不可随意更改的 `type`；
- 当前数据 `version`；
- 将未知输入解析为当前内容类型的 `schema`；
- 需要兼容旧数据时，提供逐版本、纯函数的 `migrations`；
- 引用素材时，可选提供 `collectAssetIds`。

示意接口：

```ts
interface CardDefinition<TContent> {
  readonly type: string;
  readonly version: number;
  readonly schema: {
    parse(input: unknown): TContent;
  };
  readonly migrations?: readonly {
    fromVersion: number;
    toVersion: number;
    migrate(content: unknown): unknown;
  }[];
  collectAssetIds?(content: TContent): Iterable<string>;
}
```

实际 TypeScript API 以代码为准。M0 的公开源码契约只覆盖注册、校验、迁移和素材引用提取。创建默认值、Vue 渲染器、端口、搜索与导出都还没有经过宿主集成验证，因此不在当前公开契约中。不能因为某张内置卡片需要一个按钮，就把摄影业务塞进所有插件的基础契约。

`prepareCard(definition, node)` 的返回内容类型来自
`CardDefinition<TContent>`，而不是来自旧节点的输入负载。通过
`CardRegistry.prepare(node)` 按运行时字符串查找时，TypeScript 无法凭字符串证明插件类型，因此结果内容诚实地保持为 `unknown`；调用方必须继续校验或收窄。

## 数据所有权

- Canvas core 拥有节点身份、位置、尺寸和连接。
- Card 插件拥有 `content` 的结构与迁移。
- Asset library 拥有素材记录；卡片只保存素材 ID。
- 应用壳拥有窗口和平台能力。

插件不能直接写 SQLite。所有持久化变更通过核心命令完成，避免每个插件发明自己的事务和错误处理。

## 版本与迁移

`contentVersion` 与应用版本分开：

1. 加载时按 `type` 查找插件。
2. 找不到插件：创建只读或有限编辑的未知卡片占位，不修改原始负载。
3. 找到插件且版本相同：校验后呈现。
4. 找到插件且版本较旧：按顺序运行迁移，再由项目事务保存。
5. 项目数据比插件支持的版本更新：停止解释负载，保留原数据并明确提示。

迁移必须确定、无网络、无 UI，并能针对真实旧样本测试。

## 能力边界

当前 Card SDK 提供：

- 卡片定义与显式注册；
- 内容 schema 校验；
- 前向、逐版本迁移；
- 素材 ID 引用提取；
- 未安装卡片原始负载的无损保留。

当前不提供：

- Vue 或 HTML 渲染器公共 API；
- 卡片默认值和创建器公共 API；
- 端口、搜索和序列化导出钩子；
- 任意文件系统访问；
- 任意网络请求；
- shell 或原生命令执行；
- 自定义数据库表；
- 后台常驻任务；
- 绕过核心直接操作 X6 内部状态。

## 许可证

Card SDK 源码使用 `Apache-2.0`，降低未来第三方开发卡片的门槛。主应用、核心、素材库和内置卡片仍使用 `AGPL-3.0-only`。

当前 Card SDK 与内置卡片包均标记为 `private: true`。这表示仓库已经划定许可证边界，但还没有承诺稳定的 npm 包、语义化版本或第三方兼容性；正式发布前必须先冻结并验证宿主渲染 API。

SDK 的宽松许可证不改变主产品的许可证，也不自动决定第三方插件自身的许可证。分发者仍需自行确认依赖组合与发布方式的合规性。
