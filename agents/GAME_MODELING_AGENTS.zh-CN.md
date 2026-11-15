# 游戏建模 Agent 架构

[English](GAME_MODELING_AGENTS.md) | 简体中文

机器可读契约见 [game-modeling-agentment.json](game-modeling-agentment.json)。本项目把 “Agentment” 定义为 Agent 角色与交接规范，而不是另一个独立运行框架。

架构分离四种职责：资产导演规范化意图；DeepSeek 建模者是唯一可修改场景的角色；技术验证者对证据分类；导出协调者负责用户明确授权的产物交付。这样规划、验证和导出都不会成为隐藏的建模通道。

每个角色现在都通过 `pluginId` 绑定到一个受治理的能力插件。依赖、冲突、能力所有权、修改所有权与风险规则见[能力插件治理](../docs/PLUGIN_GOVERNANCE.zh-CN.md)。角色负责决策与交接；插件负责运行时能力和状态边界。

第一版仍运行在一个 DeepSeek Harness 会话中。角色是提示与产物边界，不代表已经并发运行四个 Agent。后续若加入运行时委派，仍必须保持相同的修改权和证据不变量。

## 交接记录

- `asset-brief`：分类、原型、用途、风格、目标引擎、单位、参考、执行模式、目标节点和质量门槛。
- `build-snapshot`：不可变 Illusion 检查点、build ID、步骤、谱系、可见操作和预览计数。
- `validation-report`：每项门槛记录 `pass`、`needs-revision` 或 `not-observable`，并附检查点证据。
- `accepted-checkpoint`：获准导出的精确 build ID 和步骤。
- `export-receipt`：产物格式、来源检查点、文件名和已观察的结构检查。

## 控制流

资产导演选择交互或 Plan 执行；建模者发布检查点；验证者接受、要求一次有边界的修正，或记录当前无法观察的证据。修改历史节点时先开分支。只有已接受检查点才能交给导出，而且导出必须由用户明确触发。
