# Chromino Webapp — 开发计划

## 一、项目概述

基于 **Next.js App Router** 构建一个 Chromino（卡米諾）多人对战 Webapp，支持以下两种模式：
- **本地对战**：1–4 名玩家（人类或 AI 机器人）在同一设备上进行 pass-and-play
- **远程联机**：通过 6 位匹配码加入对局，支持人类玩家与 AI 混合，由房主配置；支持断线重连

---

## 二、技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15（App Router） |
| 语言 | TypeScript 5，`strict: true` |
| 样式 | Tailwind CSS v4 |
| 图形渲染 | SVG（内联，所有骨米诺和棋盘均用 SVG 生成） |
| 包管理器 | pnpm |
| React | React 19（Server Components by default） |
| 实时同步 | SSE（Server-Sent Events）+ Vercel KV（Redis）|
| 测试 | Vitest |
| 部署 | Vercel（零配置） |

---

## 三、项目结构

```
chromino/
├── app/
│   ├── layout.tsx              # 根布局，全局 provider
│   ├── page.tsx                # 首页：本地游戏配置 or 远程加入
│   ├── globals.css             # Tailwind + CSS 变量
│   └── game/
│       ├── [code]/
│       │   └── page.tsx        # 远程对战页（匹配码路由）
│       └── local/
│           └── page.tsx        # 本地对战页（pass-and-play）
├── components/
│   ├── Board.tsx               # 棋盘 SVG 渲染
│   ├── Tile.tsx                # 单块骨米诺 SVG 组件
│   ├── Hand.tsx                # 玩家手牌区
│   ├── PlayerPanel.tsx         # 玩家信息栏（名称、牌数、当前回合）
│   ├── GameOverModal.tsx       # 游戏结束弹窗
│   ├── SetupScreen.tsx         # 本地游戏配置界面
│   └── JoinScreen.tsx          # 远程游戏创建/加入界面
├── lib/
│   ├── game-engine.ts          # 核心游戏逻辑（纯函数，无副作用）
│   ├── tile-generator.ts       # 生成全套 80 块骨米诺数据
│   ├── placement-validator.ts  # 放置合法性验证
│   ├── ai-player.ts            # AI 落子逻辑
│   ├── game-store.ts           # Zustand 本地游戏状态管理
│   ├── match-code.ts           # 匹配码生成与验证
│   └── kv.ts                   # Vercel KV 客户端封装（服务端专用）
├── app/api/
│   ├── game/
│   │   ├── create/route.ts     # POST: 创建新对局，返回匹配码
│   │   └── [code]/
│   │       ├── route.ts        # GET: 获取对局状态; POST: 加入对局
│   │       ├── action/route.ts # POST: 提交玩家行动（出牌/抽牌/pass）
│   │       └── events/route.ts # GET: SSE 事件流（实时推送状态变更）
├── data/
│   └── tiles.json              # 完整骨米诺配色数据（静态）
├── public/
└── tests/
    ├── placement-validator.test.ts
    ├── game-engine.test.ts
    └── ai-player.test.ts
```

---

## 四、数据模型

### 4.1 骨米诺 Tile

```typescript
type Color = 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'wild';

interface Tile {
  id: number;           // 0–79
  colors: [Color, Color, Color];  // 三个色格：[左/上, 中, 右/下]
  isWild: boolean;      // 是否为百搭骨米诺（中间色格为 wild）
}
```

### 4.2 棋盘 Board

```typescript
interface PlacedTile {
  tile: Tile;
  x: number;           // 网格坐标（色格级别，非骨米诺级别）
  y: number;
  orientation: 0 | 90 | 180 | 270;  // 旋转角度
}

type Board = Map<string, Color>;  // key: "x,y"，value: 该格颜色
```

### 4.3 游戏状态 GameState

```typescript
interface Player {
  id: string;          // UUID，加入时分配
  name: string;        // 昵称（来自 localStorage）
  isAI: boolean;
  isHost: boolean;     // 是否为房主（仅远程模式有效）
  connected: boolean;  // 是否在线（远程模式）
  hand: Tile[];
}

interface GameState {
  code: string;        // 6 位匹配码（本地模式为空字符串）
  players: Player[];
  board: Board;
  bag: Tile[];         // 剩余未抽骨米诺
  currentPlayerIndex: number;
  phase: 'lobby' | 'playing' | 'ended';  // lobby: 等待玩家加入
  winners: string[];   // 获胜玩家 id 列表（共同获胜）
  lastFinishedPlayerId: string | null;   // 第一个打完的玩家
  finalRoundDone: Record<string, boolean>; // 最终回合各玩家是否已行动
}
```

---

## 五、核心模块设计

### 5.1 游戏引擎 `lib/game-engine.ts`

纯函数，输入当前状态，输出新状态：

- `initGame(config)` — 初始化：洗牌、发牌、放置初始百搭牌
- `playTile(state, playerId, tile, x, y, orientation)` — 出牌，返回新状态
- `drawTile(state, playerId)` — 抽牌
- `passTurn(state, playerId)` — 跳过回合（袋空且无牌可出）
- `checkWin(state)` — 检查获胜条件

### 5.2 放置验证 `lib/placement-validator.ts`

- `getValidPlacements(board, tile)` — 返回该骨米诺在当前棋盘上的所有合法放置位置（位置 + 旋转）
- `isValidPlacement(board, tile, x, y, orientation)` — 验证单个放置是否合法
- 规则：相邻至少 2 个色格，每组相邻色格颜色匹配（◎ 百搭可匹配任意色）

### 5.3 AI 落子 `lib/ai-player.ts`

单一难度，策略：

1. 调用 `getValidPlacements` 获取所有合法落点
2. 优先选择**相邻色格最多**的位置（贪心策略）
3. 若有相同相邻数，随机选一个
4. 若无合法落点，执行抽牌

### 5.4 状态管理 `lib/game-store.ts`

使用 **Zustand**，Client Component 中共享游戏状态：

- `useGameStore()` — 获取完整游戏状态和 actions
- AI 回合由状态变更的 side effect 驱动（`useEffect` 监听 `currentPlayerIndex`）

---

## 六、远程联机架构

### 6.1 匹配码机制

- 创建对局时，服务端生成 **6 位大写字母+数字**的匹配码（e.g. `A3K7PQ`）
- 对局状态序列化后存入 **Vercel KV**，key 为 `game:{code}`
- 匹配码有效期 **24 小时**（KV TTL）
- 每位玩家加入时分配一个 `playerId`（UUID），**同时存入 localStorage**（key: `chromino_player_id`）
- 昵称存入 localStorage（key: `chromino_nickname`），进入首页即可编辑，后续对局自动使用

### 6.2 房主权限

- 创建对局的玩家自动成为 **房主（host）**
- 房主在 lobby 阶段可：
  - 为每个玩家槽位切换「真人 / AI 机器人」
  - **踢出**已加入的真人玩家（SSE 推送 `player_kicked` 事件）
  - 点击「开始游戏」启动对局
- 若房间内**只剩房主一人**（其他玩家未加入或已被踢），房主可**解散房间**（DEL KV，推送 `room_dissolved`）
- 房主离线超过 30 秒且对局尚未开始，房间自动解散

### 6.3 断线重连

- 进入游戏页时，客户端将 `{ code, playerId }` 写入 localStorage（key: `chromino_last_game`）
- 用户重新打开浏览器后，首页自动读取 localStorage，若检测到有效对局（向服务端查询 `GET /api/game/{code}`），则**立即弹出重连提示**
- 重连时以 `playerId` + `code` 向服务端验证身份，恢复手牌和游戏状态
- 服务端维护每个玩家的 `connected` 标志；断线玩家的回合由其他玩家等待（可设 60 秒超时后自动 pass）

### 6.4 实时推送（SSE）

```
客户端                               服务端
  |                                    |
  |--- GET /api/game/{code}/events --> |  建立 SSE 连接
  |                                    |  
  |<-- event: state_update ----------- |  任何状态变更后广播
  |<-- event: player_joined ---------- |  新玩家加入
  |<-- event: player_kicked ---------- |  玩家被踢（附带 playerId）
  |<-- event: room_dissolved ----------|  房间解散
  |<-- event: game_started ----------- |  游戏开始
  |<-- event: player_disconnected ---- |  玩家断线
  |<-- event: player_reconnected ----- |  玩家重连
  |<-- event: game_over --------------- |  游戏结束
```

- 服务端 Route Handler 使用 `ReadableStream` + `text/event-stream`
- **必须声明 Edge Runtime**（`export const runtime = 'edge'`）避免 Serverless 函数 10s 超时
- 通过 **短轮询 KV**（每 500ms `kv.get('game:{code}:version')`）检测状态版本号变更后向所有连接广播；对局中更新 KV 时同步递增 `version` 字段
- 客户端收到事件后更新本地状态
- SSE 连接本身设置 **25 秒心跳**（空注释 `:\n\n`），Edge Runtime 单连接上限 15 分钟后需客户端自动重连

### 6.5 行动验证

- 所有行动通过 `POST /api/game/{code}/action` 提交
- 请求体携带 `playerId`；服务端验证该玩家是否为当前回合玩家
- 服务端调用 `placement-validator` / `game-engine` 验证行动合法性
- 合法则更新 KV 并广播 `state_update`；非法则返回 400
- AI 玩家的行动由**服务端** `action/route.ts` 在上一位真人玩家行动结束后自动触发

### 6.6 API 路由汇总

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/game/create` | 创建对局，返回 `{ code, playerId }` |
| GET | `/api/game/[code]` | 获取对局公开状态（phase、玩家列表）|
| POST | `/api/game/[code]` | 加入对局，返回 `{ playerId }` |
| DELETE | `/api/game/[code]` | 房主解散房间 |
| POST | `/api/game/[code]/kick` | 房主踢出玩家 |
| POST | `/api/game/[code]/start` | 房主开始游戏 |
| POST | `/api/game/[code]/action` | 提交行动（出牌/抽牌/pass）|
| GET | `/api/game/[code]/events` | SSE 事件流 |

---

## 七、SVG 渲染设计

### 7.1 单块骨米诺 `Tile.tsx`

- 渲染为 3 个相邻正方形（SVG `<rect>`）
- 百搭中央色格在普通底色上叠加 **◎ 圆圈**符号（`<circle>` + `<text>`）
- 支持旋转（`transform="rotate(deg, cx, cy)"`）

### 7.2 棋盘 `Board.tsx`

- 棋盘以格坐标系渲染，每格 = 1 个色格（40px × 40px）
- 使用 SVG `<svg>` + `viewBox`，支持缩放和平移（`wheel` 滚轮缩放 + `drag` 拖拽）
- 待放置牌高亮显示合法落点
- 拖拽骨米诺到棋盘进行放置

---

## 八、界面流程

```
首页（/ ）
  ├── 昵称编辑框（读写 localStorage chromino_nickname，默认「玩家」）
  ├── 若 localStorage 有 chromino_last_game → 弹出「重新连接对局 A3K7PQ？」提示
  │
  ├── [本地对战]
  │     → SetupScreen：选择玩家数（1–4），每个位置选「人类」或「AI 机器人」
  │     → 进入 /game/local
  │
  └── [远程对战]
        ├── [创建房间]
        │     → POST /api/game/create → 进入 /game/[code]（lobby 阶段）
        │     → 显示匹配码 + 玩家列表 + 每槽位「真人/AI」切换
        │     → 等待玩家加入后点击「开始游戏」
        └── [加入对局]
              → 输入 6 位匹配码 → POST /api/game/[code] → 进入 /game/[code]

Lobby 页（/game/[code]，phase=lobby）
  → 显示匹配码（带复制按钮）
  → 玩家列表：已加入的玩家昵称、AI 槽位
  → 房主：每槽可切换真人/AI，可踢人，可解散房间，可开始游戏
  → 非房主：等待房主开始

游戏页（/game/[code] 或 /game/local，phase=playing）
  → 棋盘（中央，SVG，支持缩放/平移）
  → 当前玩家手牌（底部）
  → 玩家面板（侧边）：昵称、剩余牌数、当前回合标记、断线标记
  → 操作按钮：「出牌」「抽牌」「跳过」「旋转」
  → 最后 1 张牌时弹出「最后一张！」提示
  → AI 回合：自动执行，显示「AI 正在思考…」提示
  → 等待其他玩家时：显示「等待 [昵称] 行动…」

游戏结束（phase=ended）
  → GameOverModal：展示获胜者昵称
  → 「再来一局」按钮（房主可发起，重置对局）
```

## 九、localStorage 规范

| Key | 值 | 说明 |
|-----|----|------|
| `chromino_nickname` | string | 玩家昵称，首页可编辑 |
| `chromino_player_id` | UUID string | 本设备的玩家 ID，加入/创建对局时由服务端分配 |
| `chromino_last_game` | `{ code: string, playerId: string }` JSON | 最近一次参与的对局，用于断线重连 |

---

## 十、开发阶段计划

### Phase 1：脚手架 + 数据层（~1天）
- [ ] `pnpm create next-app` 初始化项目
- [ ] 配置 TypeScript strict、Tailwind、路径别名
- [ ] 编写 `tile-generator.ts`，生成 80 块骨米诺完整数据写入 `data/tiles.json`
- [ ] 编写 Vitest 配置，为数据层写单测

### Phase 2：游戏引擎（~2天）
- [ ] 实现 `placement-validator.ts`（含百搭规则）
- [ ] 实现 `game-engine.ts`（初始化、出牌、抽牌、获胜判断）
- [ ] 为引擎编写集成测试（覆盖边界情况：百搭、最后一张、共同获胜）

### Phase 3：AI（~0.5天）
- [ ] 实现 `ai-player.ts`（贪心选最多相邻色格落点）
- [ ] 为 AI 编写测试

### Phase 4：本地对战 UI（~2天）
- [ ] 实现 `game-store.ts`（Zustand）
- [ ] 搭建首页（SetupScreen + JoinScreen）
- [ ] 实现 `Tile.tsx` SVG 组件（各旋转方向、百搭标记）
- [ ] 实现 `Board.tsx`（格坐标渲染、缩放、平移）
- [ ] 拖拽放牌交互（drag-and-drop 或点选+点位）
- [ ] 高亮合法落点
- [ ] 接入 AI 自动行动，游戏结束判断 + GameOverModal

### Phase 5：远程联机（~2.5天）
- [ ] 配置 Vercel KV（本地 `.env.local` + Vercel Dashboard）
- [ ] 实现 `match-code.ts`：生成/验证 6 位匹配码
- [ ] 实现 `POST /api/game/create`：创建对局（含昵称、房主标记），写入 KV
- [ ] 实现 `GET/POST /api/game/[code]`：获取 lobby 状态 / 加入对局
- [ ] 实现 `DELETE /api/game/[code]`：解散房间
- [ ] 实现 `POST /api/game/[code]/kick`：踢出玩家
- [ ] 实现 `POST /api/game/[code]/start`：开始游戏
- [ ] 实现 `POST /api/game/[code]/action`：行动提交（含 AI 自动触发）
- [ ] 实现 `GET /api/game/[code]/events`：SSE 实时推送
- [ ] 断线重连：`chromino_last_game` localStorage 读写 + 首页重连提示
- [ ] 接入 Lobby 页 + 远程游戏页（`/game/[code]`）

### Phase 6：打磨与部署（~1天）
- [ ] 响应式适配（移动端触控）
- [ ] 全流程手动测试（本地 1P AI、2P、3P、4P；远程 2P）
- [ ] `pnpm audit` 安全检查
- [ ] 部署到 Vercel，配置 KV 环境变量

---

---

## 十一、不在范围内（Out of Scope，当前版本）

- 用户账号 / 登录 / 排行榜
- 多 AI 难度
- 变体规则（抽牌变体、亮牌变体、专家模式）— 后续可扩展
- 音效 / 动画特效
- 移动端原生 App（仅 PWA-friendly 响应式网页）
- 游戏大厅 / 公开对局列表
- 断线超过 60 秒后的 AI 托管（当前版本等待或 pass，不接管）
