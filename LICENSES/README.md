# 许可证边界

本仓库不是所有文件统一使用同一许可证。

## `AGPL-3.0-only`

根目录 [`LICENSE`](../LICENSE) 适用于：

- 桌面主应用；
- 画布核心与 X6 适配；
- 素材库；
- 内置卡片；
- 未被下述 Apache-2.0 边界明确覆盖的其他源代码。

SPDX 标识：

```text
SPDX-License-Identifier: AGPL-3.0-only
```

## `Apache-2.0`

[`Apache-2.0.txt`](Apache-2.0.txt) 仅适用于仓库中明确标记为 Card SDK 或官方插件模板的包/目录。每个适用包应在自己的 `package.json`、README 或文件头中明确写出 `Apache-2.0`；不能仅凭目录名猜测。

SPDX 标识：

```text
SPDX-License-Identifier: Apache-2.0
```

## 默认规则

如果一个文件或包没有独立的许可证声明，则按根目录 `AGPL-3.0-only` 处理。

Apache-2.0 的 Card SDK 源码允许第三方更容易开发扩展，但不把主应用重新许可为 Apache-2.0，也不取消主应用在 AGPL-3.0 下的义务。当前 Card SDK 包仍为 `private: true`；源码许可证边界不等于已经发布或承诺稳定的 npm API。

第三方依赖仍保留各自许可证。发行构建应生成并随包分发第三方许可证清单；本文件不替代该清单或法律审核。
