# dsh-illusion

[English](README.md) | 简体中文 | [发布说明](CHANGELOG.zh-CN.md) | [隐私说明](PRIVACY.zh-CN.md)

[游戏建模路线图](docs/GAME_MODELING_ENGINE_ROADMAP.zh-CN.md) | [2D 美术生产线](docs/2D_ART_PIPELINE.zh-CN.md) | [插件治理](docs/PLUGIN_GOVERNANCE.zh-CN.md) | [Agent 架构](agents/GAME_MODELING_AGENTS.zh-CN.md) | [游戏资产 Skill](skills/illusion-game-assets/SKILL.md) | [2D 美术 Skill](skills/illusion-2d-art/SKILL.md)

`dsh-illusion` 是一个 DeepSeek Harness Web 插件。DeepSeek 可以通过 `illusion_build` 搭建物件和高复杂度模块化人偶；对话界面会同步展示当前 3D 场景、构建阶段、骨架预览和可拖动的历史时间线。

插件展示的是可审计的建模操作与中间产物，不读取、保存或伪装成模型的私有思维链。

## 功能

- 原生 DSH 双端插件：Host 工具加 Web `tool.call.toolview` 卡片。
- 受治理的能力图，分别管理协调、DeepSeek 建模、只读验证和显式授权导出；重复能力或重复修改所有者会在运行前失败。
- 检查点游戏语义，覆盖枢轴、边界、挂点、碰撞体、模块网格、材质槽和 LOD 分组，并提供确定性引用校验与 GLB 元数据导出。
- 与图像提供者无关的 2D 美术指导，通过版本化 Style Contract 和分风格生产计划覆盖像素风、日漫风和作者自定义风格。
- 分类化 `game-asset` 档案，覆盖人形、生物、建筑、载具、道具、植被、地形和环境套件。
- 每次工具调用形成一个可回放检查点；交互模式会在一个检查点后停下，Plan 执行模式则可连续发布多个独立节点，运行到指定节点或成品。
- 已发布的检查点卡片会在 DSH 会话历史中保持展开，不再被通用的“已完成工具”折叠隐藏；后续修正产生新卡片，不覆盖旧步骤。
- 工具卡可在英文和简体中文之间切换；偏好保存在当前浏览器，并同步到页面中所有可见的 Illusion 卡片。
- DeepSeek 可为每一步提供 `translations.zh-CN`，让阶段、操作标题、说明、控件、状态及无障碍文本一起切换；旧的单语会话会安全回退到原始文字。
- 每个检查点都可提交纯文字反馈，或提交“文字说明 + 参考文件”；“符合，继续”“提交微调”“按计划运行 / 到指定节点”“完成构建”都会通过 DSH 直接发起一个有边界的下一轮。
- 每一步仍有浏览器本地的“最新想法”输入框，作为尚未发送的私人草稿；只有明确提交审阅后才会送入会话。
- 任意选中的时间线步骤都能创建并打开真实 DSH 会话分支；修改历史步骤时会先自动开分支，子会话通过 `action: "resume"` 恢复那个精确状态，再继续建模。
- 可把当前选中的预览步骤导出为二进制 glTF（`.glb`），也可把完整构建记录连同步骤想法导出为 JSON。
- Three.js 视口支持旋转、缩放、阴影、网格、坐标轴和自动构图。
- 除基础体外，还支持 `capsule`、`ellipsoid`、`plane`、`lathe`、`tube` 和带边界的自定义三角网格。
- 支持带局部变换的部件层级、语义角色、更丰富的材质，以及可让 DeepSeek 原位修订的稳定 ID。
- 支持人偶构建档案、明确的制作阶段、静止姿态关节层级和可见骨架叠层。
- 部件与关节都采用增量操作；协议 v2 的步骤保存增量，长历史压缩时保留可回放检查点。
- 按 Agent 隔离内存状态；快照随工具结果持久化，因此历史回放不依赖当前进程状态。
- 兼容协议 v1 会话回放，因此已有基础体构建仍能打开。
- 对操作数、部件数、关节数、自定义网格、步骤数、文本和数值范围设置边界，避免无限场景数据拖垮 Web UI。
- 内置指导让 DeepSeek 负责建模决策和可观察构建过程，同时不暴露私有推理。

## 从源码安装

需要 Node.js 22+ 和 DeepSeek Harness `0.2.2-rc.1` 或更新版本。

```bash
npm install
npm run check
dsh plugin --profile web add /absolute/path/to/dsh-illusion
dsh web
```

如果使用 `npx` 启动 Harness，请把最后两行替换为对应的 `npx @deepseek-ai/dsh ...` 命令。

也可以直接从 GitHub 安装同一个插件：

```bash
dsh plugin --profile web add github:lazyalexander/dsh-illusion
```

## 使用

构建游戏资产时，给出玩法分类和预期生产语境：

> Build a stylized modular harbor warehouse as a Godot game asset using `illusion_build`. Use profile kind game-asset, category building, archetype industrial harbor warehouse, usage modular, target godot, and unit m. Publish separate structure, details, collision-intent, and validation checkpoints.

需要搭建复杂人偶时，对 DeepSeek 说：

> Build a stylized high-complexity humanoid character as a live 3D assembly using `illusion_build`. You own all modeling decisions. Work through blockout, anatomy, face, hair, clothing, accessories, materials, rig, and validation. Use stable semantic IDs and parent-child hierarchy, and complete only after a visible validation step.

DeepSeek 会在两种可见工作流中作出建模判断：

1. `action: "start"`：清空旧场景并创建第一步。
2. 交互模式下，DeepSeek 在下一个有意义的检查点停下，询问是否符合预期。
3. Plan 执行模式下，DeepSeek 把任务拆成语义节点，并为每个节点分别调用一次 `illusion_build`，连续运行到指定节点或成品；节点之间无需暂停，但每个节点都是独立历史卡片。
4. 文字或带参考文件的反馈只产生一次 `action: "apply"` 修正；“符合，继续”前进一个节点，“按计划运行 / 到指定节点”允许 DeepSeek 判断并执行更长的有边界路线。
5. 验证通过后，`action: "complete"` 标记构建完成；后续反馈仍可用 `action: "apply"` 重新打开并再次验证。`action: "resume"` 在新建的 DSH 分支中恢复所选的精确检查点。

人偶参数示例：

```json
{
  "action": "start",
  "title": "Character blockout",
  "note": "Establish the global proportions before identity features",
  "translations": {
    "zh-CN": {
      "title": "人偶大形",
      "note": "先建立整体比例，再处理身份特征"
    }
  },
  "phase": "blockout",
  "profile": {
    "kind": "character",
    "style": "stylized",
    "target": "interactive",
    "unit": "m",
    "height": 1.7
  },
  "operations": [
    {
      "type": "upsert",
      "object": {
        "id": "torso",
        "label": "Torso blockout",
        "role": "anatomy.torso",
        "geometry": { "kind": "capsule", "radius": 0.18, "height": 0.55 },
        "position": [0, 0, 1.12],
        "scale": [1, 0.72, 1],
        "color": "#d7b79f",
        "material": { "roughness": 0.8, "metalness": 0 }
      }
    }
  ]
}
```

坐标使用右手系 `[x, y, z]`，Z 轴向上。长方体的 `width`、`depth`、`height` 分别对应 X、Y、Z；圆柱、圆锥、胶囊体、旋转体和管道在旋转前沿局部 Z 轴。子部件的变换相对于 `parentId`。旋转使用角度制欧拉角 `[x, y, z]`，不接受弧度；颜色必须是六位十六进制 RGB 值。

### 高复杂度人偶工作流

DeepSeek 负责决定搭建顺序，并可通过稳定 ID 修订已有部件。建议的可见流程是：参考与大形、解剖和比例、面部及身份特征、头发、服装、配饰与材质、静止骨架、验证、完成。每个成功调用都会成为可检查的增量，而不是隐藏的建模跳跃。

协议限制为每次调用最多 64 个操作、整场最多 256 个部件、256 个关节和 96 个回放步骤；自定义网格同样有明确上限。这些边界足以支持细致的模块化人偶，同时避免把浏览器预览器误作雕刻或拓扑重建引擎。

### 检查、批注与导出

使用卡片顶部的 **EN / 中文** 开关，即可同时切换界面和带翻译的步骤标题、说明；语言偏好刷新后仍会保留。选择任意时间线步骤即可检查当时的场景。**Your latest thought / 你在这一步的最新想法** 会为每个构建步骤保存一条当前浏览器本地备注，刷新页面后仍会恢复。它适合写入最新的人类方向，例如需要调整的比例，或下一步必须保留的特征。

每个选中的时间线步骤都带有交互式审阅区。若从旧步骤提交修改，插件会自动创建子会话、恢复该检查点，并只在分支里执行请求，因此不会覆盖后来的历史：

- **符合，继续**：确认当前检查点，并只允许 DeepSeek 再发布一个可见步骤。
- **提交微调**：把文字方向和选中的参考文件通过 DSH 发送给 DeepSeek，要求复用稳定 ID 原位修订，并只发布一个修正步骤。
- **按计划运行 / 到指定节点**：允许 DeepSeek 为每个语义计划节点分别发布一张卡片，并自动运行到“最新想法”中写明的目标，或下一个适合审阅的节点。
- **完成构建**：允许 DeepSeek 发布一个最终验证或完成步骤。
- **从此步骤创建分支**：fork DSH 会话、打开子会话，并提交限定范围的 `resume` 请求以恢复当前选中的时间线状态。

每个新步骤都是独立工具调用和历史卡片；即使 Plan 模式在同一轮连续发布多个节点，Illusion 也会自动保持这些卡片展开。在较新卡片内拖动时间线不会修改旧卡片。

- **Export step GLB**：把当前选中的预览场景下载为二进制 glTF 文件；网格会保留 Illusion 对象 ID 和协议变换元数据。
- **Export build JSON**：下载完整、不可变的构建快照，以及当前选中步骤和全部浏览器本地步骤想法；这是用于审阅或转移的可携带记录。

## 与 CAD 和 Blender 的边界

Illusion 支持高复杂度模块化搭建，但不是 BRep 内核、雕刻系统、网格布尔引擎或完整 DCC 执行器。真实建模插件可在每次权威操作完成后，将代理几何同步到 `illusion_build`。后续适配层可以把 `dsh-cad`、Blender 或自有建模工具的事件转换成同一协议。

关节层级是可检查的静止骨架，不代表已经具备蒙皮权重、IK、形态键、变形质量或动作验收。导出的 GLB 是带部件与关节元数据的可编辑预览装配；需要高密度雕刻、拓扑重建、UV、蒙皮或生产级动画时，外部 DCC 仍是权威来源。

这条边界是有意的：DeepSeek 负责建模决策并调用构建协议；Illusion 负责有边界的场景状态、校验、回放、人的逐步想法和导出。

## 游戏建模引擎方向

当前版本实现了[游戏建模引擎路线图](docs/GAME_MODELING_ENGINE_ROADMAP.zh-CN.md)的阶段 1：统一资产分类、跨分类基准目录、可复用 Skill，以及机器可读的 Agentment 角色契约。基准包含人形与生物、四种建筑原型，以及代表性的载具、道具、植被、地形和环境案例。

[Illusion Game Assets Skill](skills/illusion-game-assets/SKILL.md) 定义可复用的建模与证据流程；[Agent 架构](agents/GAME_MODELING_AGENTS.zh-CN.md)分离需求规范化、DeepSeek 独占的场景修改、技术验证和显式导出。目前这些是同一 Harness 工作流中的角色与交接边界，并不声称已经部署四个并发运行的 Agent。

[能力插件治理契约](docs/PLUGIN_GOVERNANCE.zh-CN.md)让当前版本仍保持一个可安装 DSH 包，同时强制分离能力所有权与修改所有权。只有某项能力确实需要独立依赖或独立发布时，才会拆成单独 npm 包。

阶段 2 现在已经记录并校验检查点游戏语义，但目标引擎导入探针仍待完成。阶段 3–6 将依次加入网格/材质生产、变形与动画、目标引擎适配器、版本化资产库和世界组合。玩法碰撞、UV、生产拓扑、蒙皮、运行时 LOD 切换和引擎导入仍属于明确的证据缺口，而不是默认已有能力。

## 2D 美术方向

[2D 美术生产线](docs/2D_ART_PIPELINE.zh-CN.md)把风格视为作者拥有、由版本化契约承载的意图。Illusion 可以补全缺失特征，但不能自行接受自己的提案。像素风、日漫风和自定义风格共享审阅历史，同时保留不同的生产与验证门槛。本版本提供契约、规划、治理、Agentment 和夹具；真正生成或编辑栅格图仍需要连接图像提供者适配器。

### DSH 原生像素演示

[海岸信使 SVG](examples/dsh-2d-demo/coastal-courier.svg)与[渲染 PNG](examples/dsh-2d-demo/coastal-courier.png)演示不依赖图像提供者的 DSH 路径：DeepSeek 生成由 40 个矩形、12 色组成的 64×64 有边界布局，Illusion 再进行验证和渲染。[运行证据](examples/dsh-2d-demo/run-evidence.json)保留了重要限制：两次 DSH 尝试都在确定性布局已经出现在运行流、但模型仍持续过度细化且没有返回 final 时被终止。这证明像素结构可以由 DSH 生成，不证明已有生产级栅格提供者，也不代表当前交互足够顺畅。

2D 审查卡会以像素级放大逐帧展示，并暴露语义构图对象以及本地画笔、橡皮、取色、撤销和重做。编辑内容在用户点击“保存并作为迭代参照”前只作为浏览器本地覆盖层存在；之后点击“微调所选区域”时，插件会自动附上编辑后的 PNG 和确定性的 `dsh-illusion/editor-patch@1` JSON，并在提示中将它们标记为权威参照，同时保留原始检查点。

DSH Web 输入框工具栏还会显示 **Illusion · 绘画创作** 开关。开启时会提交一条明确可见的会话指令，使后续视觉请求优先使用 `illusion_art`；关闭时会提交对应的退出指令。该开关不会隐藏工具或暗中改写模型请求，也不会把无关的非视觉提示误判为绘画任务。

## 隐私

插件自身不包含遥测，也不会直接请求第三方服务。构建快照会成为 DSH 工具结果元数据的一部分；逐步想法和语言偏好保存在浏览器 `localStorage` 中；只有用户明确点击导出后才会生成 JSON 或 GLB 文件。用户点击“提交微调”时，所选文件和审阅文字会有意交给 DSH 的会话上传与提示服务，并可能发送到已配置的模型服务商。完整边界请参阅[隐私说明](PRIVACY.zh-CN.md)。

`npm run audit:public` 会检查仓库当前文件和可达 Git 历史中的常见凭据、个人主目录路径、敏感本地文件及 PNG 内嵌元数据。预构建客户端包含 Three.js，详见[第三方许可说明](THIRD_PARTY_NOTICES.md)。

## 开发

```bash
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

关键文件：

- `src/protocol.ts`：稳定事件协议和运行时校验。
- `src/scene.ts`：增量回放、层级校验和场景物化。
- `src/store.ts`：逐 Agent 构建状态和历史快照。
- `src/index.ts`：DSH Host 工具和提示指导注册。
- `src/plugins/`：能力清单、依赖解析、冲突检查和独占修改所有权。
- `src/art/style.ts`：与提供者无关的 Style Contract 解析和分风格 2D 生产规划。
- `src/client/index.tsx`：Web 工具视图插槽注册。
- `src/client/SceneViewport.tsx`：Three.js 场景投影。
- `src/client/sceneObjects.ts`：供视口和 GLB 导出共用的预览网格构建。
- `src/client/thoughts.ts`：按构建和步骤索引、带长度边界的浏览器本地批注。
- `src/client/review.ts`：确定性的审阅、调整、完成与分支提示生成。
- `src/client/export.ts`：Build JSON 和当前步骤 GLB 导出。
- `benchmarks/game-asset-catalog.json`：跨分类游戏资产验收目录。
- `skills/illusion-game-assets/`：可复用建模 Skill 及中英双语分类/质量参考。
- `agents/game-modeling-agentment.json`：机器可读的角色与交接不变量。
- `agents/2d-art-agentment.json`：机器可读的作者、提供者、验证和验收边界。

## 端到端验收

最终验收于 2026-11-14 完成，使用 DeepSeek Harness `0.2.2-rc.1`、真实 Web 客户端，以及 High 推理强度的 `DeepSeek-V4.1-Flash`。验收使用隔离 profile，避免结果受其他已安装插件影响：

```bash
export ILLUSION_E2E_HOME="$(mktemp -d)"
DSH_HOME="$ILLUSION_E2E_HOME" dsh plugin --profile illusion-test add /absolute/path/to/dsh-illusion
DSH_HOME="$ILLUSION_E2E_HOME" dsh --profile illusion-test --no-open --host 127.0.0.1 --port 0
```

打开命令输出的本地 URL，提交以下提示：

> Build a stylized high-complexity humanoid character as a live 3D assembly using illusion_build. You own all modeling decisions. Do not use any other tools and do not modify files. Start with profile kind character, style anime, target interactive, unit m, height 1.7, and phase blockout. Use at least six separate apply steps covering anatomy, face, hair, clothing, accessories or materials, and rig or validation. Use stable semantic IDs and parentId hierarchy. Across the build use capsule, ellipsoid, tube, plane, lathe, and one small custom mesh, with distinct materials. Add a humanoid rest-pose joint hierarchy including hips, spine, chest, neck, head, arms, and legs. Complete only after a visible validation step. Keep every step within the tool schema.

实测证据：

- DeepSeek 是唯一建模者，在 2 分 7 秒内完成了 11 个成功接受且可回放的步骤：大形、解剖、面部、头发、服装、配饰/材质、骨架、验证、一次面部贴合修正，以及完成。
- 最终人偶身高 1.70 m，包含 100 个可见部件和 21 关节的人形静止骨架；场景实际使用了胶囊体、椭球体、管道、平面、旋转体和一个带边界的自定义网格。
- 在验证阶段，DeepSeek 发现面部表面部件悬浮，并在调用 `complete` 前主动插入修正步骤。
- 浏览器实际显示了完整的动漫风格人偶、骨架叠层、分阶段时间线和逐步“最新想法”输入框。这是模块化装配的视觉检查，不是变形或动画质量验收。
- 下载的 Build JSON 使用 `dsh-illusion/build-export@1` Schema 和协议 v2，包含 11 个增量步骤、128 个操作和人偶档案，没有重复保存旧协议的完整对象列表。
- 下载的 GLB 具有有效 glTF 2.0 二进制头，包含 100 个网格、100 个部件节点、21 个关节节点，以及构建档案和骨架元数据。
- 第一次操作使用了缺少 `#` 的非法颜色。运行时校验原子拒绝了该调用，DeepSeek 随后自行修正，失败尝试没有生成成功快照。
- 检查点交互验收使用坦克大形来测试工作流，而不是测试模型质量。DeepSeek 在 13 秒内只发布了一个含 3 个部件的步骤并停下确认；从卡片提交文字调整后，9 秒内只生成了一个修正步骤，稳定 ID 和原始历史卡片均保留；从步骤 1 开分支后，DSH 创建了子会话，在 3 秒内精确恢复 3 个部件的检查点，并在继续前再次询问确认。
- 随后用潜艇完成 Plan 模式验收，用时 1 分 54 秒。DeepSeek 自行拆出五个语义构建节点：耐压壳体、指挥塔与观察窗、潜水舵与推进、压载与科研载荷、细节与验证，之后另发一张完成封印卡。同一轮中的六张潜艇卡片全部保持展开，每张都保留导出、审阅、按计划到目标和分支控件；成品包含 58 个可见模块化部件，无骨架。
- 跨分类游戏资产 smoke 用时 2 分 53 秒。DeepSeek 分别完成了人形、生物、建筑、载具、道具、植被、地形和环境构建，部件数依次为 19、19、14、15、15、15、13、19；会话保留 24 张游戏资产卡片，每张都有审阅、Plan、分支和导出控件。
- 单独的建筑多样性测试在 1 分 50 秒内完成公共钟楼、工业港口仓库和幻想山地神殿。每项包含 19 个结构部件、1 个验证部件，并保留四张历史卡片；连同前一轮的联排住宅，实跑证据现已覆盖四种不同建筑原型。
- 这次 24 卡压力测试发现：若所有历史预览都立即渲染，会耗尽浏览器 WebGL 上下文。客户端现只挂载距离可见区域 600 px 内的预览。浏览器复验观察到 2 个活动视口、22 张延迟卡片，滚动到可见位置后人形模型正常恢复，同时全部卡片控件仍然存在。
- `npm run check` 通过 9 个测试文件、35 个测试，验证 11 个目录案例、八类 smoke、三项追加建筑 smoke 和 4 个 Agentment 角色，再完成 Host/Client 构建。

## 已知限制

- 新快照会在一次工具调用完成后出现；单次调用内部不会逐 token 改写场景。交互模式每轮发布一个检查点，Plan 模式可在同一轮发布多个彼此独立的工具调用和卡片。
- 历史卡片始终保留完整交互，但 WebGL 预览只在卡片接近浏览器可见区域时挂载；滚动到附近即可恢复实时视口。
- 当前的“高复杂度”是模块化程序装配，不是高密度雕刻成品网格。
- 静止骨架尚无蒙皮权重、IK、形态键、变形验证或动作测试。
- GLB 是预览装配，不是可直接使用的 VRM/MMD 人偶，也不是权威 DCC 产物。
- 高密度雕刻、拓扑重建、UV、贴图绘制、蒙皮和生产级动画仍需外部 DCC 工作流。
- 步骤想法保存在当前浏览器中，不会写入 DSH 会话，也不会跨浏览器或设备同步；需要转移时请导出 Build JSON。
- 实时分支恢复依赖当前运行进程中的检查点注册表。历史卡片和导出文件可跨 Harness 重启保留，但自动 `resume` 到新分支目前要求源进程仍在运行。
- 提供方验收使用隔离 profile，不能证明与所有第三方插件组合都兼容。
- 本次视觉验收只覆盖桌面 Chrome 和一个风格化人偶；移动端布局、其他 WebGL 实现及权威 CAD/DCC 适配器不在本次验收范围内。
