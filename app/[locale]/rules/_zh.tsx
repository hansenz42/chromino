import Link from "next/link";
import {
  C,
  type ColorKey,
  TileAnatomy,
  ColorSwatches,
  PlacementExamples,
  WildTileIllustration,
  TurnFlowDiagram,
  Section,
  Rule,
  InfoBox,
} from "./_shared";

const colorDefs: { key: ColorKey; label: string }[] = [
  { key: "R", label: "红" },
  { key: "Y", label: "黄" },
  { key: "G", label: "绿" },
  { key: "B", label: "蓝" },
  { key: "P", label: "紫" },
  { key: "W", label: "百搭 ◎" },
];

const wildTiles = [
  { id: "W1", label: "蓝-◎-黄", hex: [C.B, "#fff", C.Y] },
  { id: "W2", label: "紫-◎-黄", hex: [C.P, "#fff", C.Y] },
  { id: "W3", label: "蓝-◎-绿", hex: [C.B, "#fff", C.G] },
  { id: "W4", label: "紫-◎-红", hex: [C.P, "#fff", C.R] },
  { id: "W5", label: "红-◎-绿", hex: [C.R, "#fff", C.G] },
];

export function ZhRulesPage({ locale }: { locale: string }) {
  return (
    <div className="min-h-full bg-bg text-fg">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href={`/${locale}`}
          className="text-subtle text-[13px] no-underline hover:text-fg transition-colors flex items-center gap-1"
        >
          ← 首页
        </Link>
        <span className="text-border">|</span>
        <h1 className="m-0 text-[15px] font-semibold">游戏规则</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">
        {/* 1. 游戏目标 */}
        <Section id="goal" title="一、游戏目标">
          <p
            className="m-0 text-[14px] text-fg leading-relaxed"
            dangerouslySetInnerHTML={{
              __html:
                "每位玩家从布袋中随机抽取 <strong>8 块</strong>骨米诺作为手牌，轮流将手牌中的骨米诺放置到棋盘上。",
            }}
          />
          <p className="m-0 text-[14px] text-fg leading-relaxed">
            <strong className="text-primary">
              第一位打出手中所有骨米诺的玩家获胜。
            </strong>
          </p>
          <InfoBox>适合年龄：6 岁以上 · 游戏人数：1–8 人</InfoBox>
        </Section>

        {/* 2. 游戏配件 */}
        <Section id="components" title="二、游戏配件">
          <ul className="m-0 p-0 flex flex-col gap-1.5">
            <Rule>
              <strong>基础骨米诺</strong>：75 块，每块由 3 个色格（1×3
              矩形）组成，颜色取自 5 种颜色
            </Rule>
            <Rule>
              <strong>百搭骨米诺（Chameleon）</strong>：5
              块，两端为普通颜色，中间带有 ◎ 标记，可与任意颜色相邻
            </Rule>
            <Rule>
              <strong>布袋</strong>：1 个，用于存放和随机抽取骨米诺
            </Rule>
          </ul>
          <div className="flex flex-col items-start gap-2">
            <span className="text-[12px] text-subtle">骨米诺牌结构</span>
            <TileAnatomy
              cellLabel={(n) => `色格 ${n}`}
              tileLabel="1×3 骨米诺（示例配色：红-绿-蓝）"
            />
          </div>
          <InfoBox>
            每块骨米诺是 1×3 的矩形，包含 3
            个相邻色格。放置时可任意旋转（横向或纵向），但不能斜放。
          </InfoBox>
        </Section>

        {/* 3. 颜色定义 */}
        <Section id="colors" title="三、颜色定义">
          <p className="m-0 text-[14px] text-muted">
            共 5 种普通颜色，加 1 种百搭色格（◎）：
          </p>
          <div className="flex justify-start">
            <ColorSwatches
              colorDefs={colorDefs}
              ariaLabel="Chromino 颜色定义"
            />
          </div>
          <InfoBox>
            百搭色格（◎）：白底加圆环标记，可与任意颜色相邻，无需颜色匹配。
          </InfoBox>
        </Section>

        {/* 4. 游戏准备 */}
        <Section id="setup" title="四、游戏准备">
          <ol className="m-0 p-0 flex flex-col gap-2">
            {[
              "随机取出 1 块百搭骨米诺，颜色面朝上放于桌面中央，作为第一块骨米诺。",
              "将其余所有骨米诺（74 块基础 + 4 块百搭）放入布袋中充分混洗。",
              "每位玩家从袋中盲抽 8 块骨米诺作为手牌，仅自己可见，不可让其他玩家看到。",
              "年纪最小的玩家先行（或随机选定），之后按顺时针方向轮流。",
            ].map((text, i) => (
              <li
                key={i}
                className="flex gap-3 text-[14px] text-fg leading-relaxed list-none"
              >
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary-bg border border-primary text-primary text-[12px] flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{text}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* 5. 放置规则 */}
        <Section id="placement" title="五、放置规则（核心）">
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[14px] text-fg leading-relaxed font-semibold">
              放置一块骨米诺时，必须同时满足：
            </p>
            <ul className="m-0 p-0 flex flex-col gap-2">
              <Rule>
                与场上已有骨米诺<strong>至少相邻 2 个色格</strong>
              </Rule>
              <Rule>
                <strong>每一个</strong>相邻的色格颜色必须
                <strong>完全一致</strong>（百搭 ◎ 除外）
              </Rule>
            </ul>
          </div>
          <div className="flex flex-col items-start gap-2">
            <span className="text-[12px] text-subtle">放置示例</span>
            <PlacementExamples
              ariaLabel="放置规则示例：合法与非法"
              validLabel="✅ 合法放置"
              validAnnotation="2 个相邻色格颜色一致（绿-绿、蓝-蓝）"
              invalidLabel="✗ 非法放置"
              invalidAnnotation="黄 ≠ 红，相邻色格不一致"
            />
          </div>
          <InfoBox>
            <strong>方向与旋转</strong>：骨米诺可旋转 0°、90°、180°、270°
            后放置，只能横向或纵向，不能斜放。
          </InfoBox>
        </Section>

        {/* 6. 百搭骨米诺 */}
        <Section id="wild" title="六、百搭骨米诺（Chameleon）">
          <ul className="m-0 p-0 flex flex-col gap-1.5">
            <Rule>
              百搭骨米诺的<strong>中央色格（◎）</strong>
              可与任意颜色相邻，甚至可同时与两个不同颜色相邻
            </Rule>
            <Rule>
              百搭骨米诺的<strong>两端色格</strong>
              为普通颜色，须遵循普通匹配规则
            </Rule>
          </ul>
          <div className="flex flex-col items-start gap-2">
            <span className="text-[12px] text-subtle">百搭骨米诺示意</span>
            <WildTileIllustration
              ariaLabel="百搭骨米诺示意图"
              wildLabel="百搭骨米诺（示例：蓝-◎-黄）"
              wildCellNote="◎ 可与任意颜色相邻"
              neighborLabel="红"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {wildTiles.map(({ id, label, hex }) => (
              <div
                key={id}
                className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-3 py-2.5"
              >
                <span className="text-[11px] text-subtle w-6 shrink-0">
                  {id}
                </span>
                <div className="flex gap-1">
                  {hex.map((color, i) => (
                    <div
                      key={i}
                      style={{ background: color }}
                      className="w-6 h-6 rounded flex items-center justify-center"
                    >
                      {i === 1 && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4">
                          <circle
                            cx="12"
                            cy="12"
                            r="5"
                            fill="none"
                            stroke="#555"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-[12px] text-muted">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 7. 游戏流程 */}
        <Section id="flow" title="七、游戏流程">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <h3 className="m-0 text-[13px] font-semibold text-fg-2">
                每回合行动（二选一）
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-primary-bg border border-primary/40 rounded-xl p-4 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-primary">
                    情况 A · 能出牌
                  </span>
                  <span className="text-[13px] text-muted leading-relaxed">
                    从手牌中打出恰好 <strong className="text-fg">1 块</strong>
                    骨米诺，满足放置规则，回合结束。
                  </span>
                </div>
                <div className="bg-[#1e1e2e] border border-[#3498DB]/40 rounded-xl p-4 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#3498DB]">
                    情况 B · 不能出牌
                  </span>
                  <span className="text-[13px] text-muted leading-relaxed">
                    从袋中<strong className="text-fg">抽 1 块</strong>
                    。若可打出则立即打出；若仍不能，保留该牌，回合结束。
                  </span>
                </div>
              </div>
              <InfoBox>
                若袋中已无骨米诺且无法出牌，本回合<strong>跳过（Pass）</strong>
                。
              </InfoBox>
            </div>

            <div className="flex justify-start">
              <TurnFlowDiagram
                ariaLabel="回合行动选项示意图"
                centerLabel="您的回合"
                canPlay="能出牌"
                canPlaySub="打出 1 块骨米诺"
                cantPlay="不能出牌"
                cantPlaySub="从袋中抽 1 块"
                bagEmpty="袋空 + 不能出"
                bagEmptySub="本回合 Pass"
              />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-[13px] font-semibold text-fg-2">
                特殊规则
              </h3>
              <ul className="m-0 p-0 flex flex-col gap-1.5">
                <Rule>
                  手中只剩 <strong>1 块</strong>时，必须
                  <strong>公开展示</strong>该牌，让所有玩家看到
                </Rule>
                <Rule>
                  若最后 1 块恰好是<strong>百搭骨米诺</strong>，则
                  <strong>不能</strong>用它出牌，必须先从袋中再抽 1 块
                </Rule>
              </ul>
            </div>
          </div>
        </Section>

        {/* 8. 游戏结束 */}
        <Section id="end" title="八、游戏结束">
          <ul className="m-0 p-0 flex flex-col gap-1.5">
            <Rule>
              <strong>第一位打出所有骨米诺</strong>的玩家胜出，游戏不立即停止
            </Rule>
            <Rule>
              其他玩家各再进行<strong>一次行动</strong>
            </Rule>
            <Rule>
              若在最后一轮还有玩家也打完手牌，则<strong>共同获胜</strong>
            </Rule>
          </ul>
        </Section>

        {/* 9. 变体规则 */}
        <Section id="variants" title="九、变体规则（可选）">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 mb-2 text-[13px] font-semibold text-fg-2">
                抽牌变体
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  {
                    name: "基础（默认）",
                    desc: "无法出牌时抽 1 张；抽到可打出则立即打出，否则保留",
                  },
                  {
                    name: "一直抽",
                    desc: "无法出牌时持续抽牌，直到抽出一张可以打出的骨米诺",
                  },
                  {
                    name: "限量抽",
                    desc: "无法出牌时持续抽牌，最多抽 3–5 张（开局前自定数值）",
                  },
                ].map(({ name, desc }) => (
                  <div
                    key={name}
                    className="flex gap-3 items-start text-[13px] bg-surface-2 border border-border rounded-xl px-3 py-2.5"
                  >
                    <span className="font-semibold text-fg shrink-0 w-20">
                      {name}
                    </span>
                    <span className="text-muted leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="m-0 mb-2 text-[13px] font-semibold text-fg-2">
                其他变体
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  {
                    name: "公开手牌",
                    desc: "所有玩家公开手牌，任何人都可自由查看",
                  },
                  {
                    name: "简单模式",
                    desc: "放置时只需与场上至少 1 个色格相邻且颜色匹配（适合教学或低龄玩家）",
                  },
                ].map(({ name, desc }) => (
                  <div
                    key={name}
                    className="flex gap-3 items-start text-[13px] bg-surface-2 border border-border rounded-xl px-3 py-2.5"
                  >
                    <span className="font-semibold text-fg shrink-0 w-20">
                      {name}
                    </span>
                    <span className="text-muted leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 10. 规则速查 */}
        <Section id="quickref" title="十、规则速查">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <tbody>
                {[
                  ["手牌初始数量", "每人 8 块"],
                  ["每回合出牌数", "恰好 1 块"],
                  ["放置最少相邻色格数", "2 个（简单模式为 1 个）"],
                  ["相邻色格必须同色", "是（百搭 ◎ 除外）"],
                  ["无法出牌时", "从袋中抽 1 块（基础规则）"],
                  ["最后 1 张须展示", "是"],
                  ["最后 1 张为百搭时", "不能出，必须先再抽 1 块"],
                  ["获胜条件", "率先打完所有手牌"],
                ].map(([key, val], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-surface-2" : ""}>
                    <td className="px-3 py-2 text-muted rounded-l-md border-b border-border">
                      {key}
                    </td>
                    <td className="px-3 py-2 text-fg font-medium rounded-r-md border-b border-border">
                      {val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="flex justify-center pb-4">
          <Link
            href={`/${locale}`}
            className="text-[13px] text-subtle no-underline hover:text-fg transition-colors"
          >
            ← 返回首页，开始游戏
          </Link>
        </div>
      </main>
    </div>
  );
}
