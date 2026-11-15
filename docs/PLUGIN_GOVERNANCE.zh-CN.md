# 能力插件治理

[English](PLUGIN_GOVERNANCE.md) | 简体中文

Illusion 目前仍以一个 DSH 安装包交付，但内部职责按能力插件治理。这样既保持安装简单，也避免同一个无边界实现同时掌握规划、建模、验证与交付。

## 内置插件

| 插件 | 负责能力 | 修改范围 | 风险级别 |
| --- | --- | --- | --- |
| `illusion.coordinator` | 历史、审阅、Plan 路由 | 无 | 只读 |
| `illusion.deepseek-modeler` | 场景建模、游戏资产分类 | `model-scene`、`model-semantics` | 模型写入 |
| `illusion.game-semantics` | Pivot、Bounds、挂点、碰撞体、槽位、网格、LOD 验证 | 无 | 只读 |
| `illusion.technical-validator` | 可观察质量结论 | 无 | 只读 |
| `illusion.2d-art` | 2D 需求、Style Contract、生产计划 | `art-direction` | 内容写入 |
| `illusion.2d-validator` | 结构与风格契约检查 | 无 | 只读 |
| `illusion.export-coordinator` | Build JSON 与 GLB 交付 | `download-artifact` | 产物写入 |

协调器先解析依赖，再加载依赖方；缺失依赖、依赖环、显式冲突、重复能力提供者和重复修改范围所有者都会被拒绝。运行时提示由解析后的插件计划组合，因此清单会真正影响运行行为，而不是只作为文档存在。

## 不变量

- 一个解析完成的计划中，每项能力只能有一个提供者。
- 每个可修改范围只能有一个所有者。
- 只有 DeepSeek Modeler 插件能修改模型场景或模型语义。
- 验证插件只读，不能暗中修复模型。
- 导出必须由用户动作单独授权，不能把导出成功说成目标引擎验收成功。
- Agent 角色与能力插件有关联，但不是同一概念：Agent 角色负责决策和交接；插件负责运行时能力与状态边界。

## 扩展方式

第三方能力通过 `CapabilityPluginManifest` 注册稳定 ID、语义版本、API 版本、提供能力、依赖、冲突、修改范围、风险级别，以及可选的有边界提示。可以只选择部分插件；它们依赖的插件会被自动引入。

只有当某项能力需要独立发布或独立依赖面时，才拆成单独 npm 包。当前治理契约先提供稳定接缝，不虚构已经存在四个分别安装的 DSH 插件。

后续可能拆出的插件包括各引擎导入适配器、拓扑/UV 生产、动画/变形，以及资产库组合。任何插件获得修改范围前，都必须先有验收套件。
