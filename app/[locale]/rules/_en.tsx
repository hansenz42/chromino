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
  { key: "R", label: "Red" },
  { key: "Y", label: "Yellow" },
  { key: "G", label: "Green" },
  { key: "B", label: "Blue" },
  { key: "P", label: "Purple" },
  { key: "W", label: "Wild ◎" },
];

const wildTiles = [
  { id: "W1", label: "Blue-◎-Yellow", hex: [C.B, "#fff", C.Y] },
  { id: "W2", label: "Purple-◎-Yellow", hex: [C.P, "#fff", C.Y] },
  { id: "W3", label: "Blue-◎-Green", hex: [C.B, "#fff", C.G] },
  { id: "W4", label: "Purple-◎-Red", hex: [C.P, "#fff", C.R] },
  { id: "W5", label: "Red-◎-Green", hex: [C.R, "#fff", C.G] },
];

export function EnRulesPage({ locale }: { locale: string }) {
  return (
    <div className="min-h-full bg-bg text-fg">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href={`/${locale}`}
          className="text-subtle text-[13px] no-underline hover:text-fg transition-colors flex items-center gap-1"
        >
          ← Home
        </Link>
        <span className="text-border">|</span>
        <h1 className="m-0 text-[15px] font-semibold">Game Rules</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">
        {/* 1. Objective */}
        <Section id="goal" title="1. Objective">
          <p
            className="m-0 text-[14px] text-fg leading-relaxed"
            dangerouslySetInnerHTML={{
              __html:
                "Each player draws <strong>8</strong> tiles from the bag and takes turns placing tiles on the board.",
            }}
          />
          <p className="m-0 text-[14px] text-fg leading-relaxed">
            <strong className="text-primary">
              The first player to play all their tiles wins.
            </strong>
          </p>
          <InfoBox>Recommended age: 6+ · Players: 1–8</InfoBox>
        </Section>

        {/* 2. Components */}
        <Section id="components" title="2. Components">
          <ul className="m-0 p-0 flex flex-col gap-1.5">
            <Rule>
              <strong>Base Chrominos</strong>: 75 tiles, each a 1×3 rectangle
              with 3 colored cells from 5 colors
            </Rule>
            <Rule>
              <strong>Wild Chrominos (Chameleon)</strong>: 5 tiles, normal
              colors on both ends, ◎ mark in the center that can be adjacent to
              any color
            </Rule>
            <Rule>
              <strong>Bag</strong>: 1 bag for storing and randomly drawing tiles
            </Rule>
          </ul>
          <div className="flex flex-col items-start gap-2">
            <span className="text-[12px] text-subtle">Tile Anatomy</span>
            <TileAnatomy
              cellLabel={(n) => `Cell ${n}`}
              tileLabel="1×3 Chromino (example: Red-Green-Blue)"
            />
          </div>
          <InfoBox>
            Each Chromino is a 1×3 rectangle with 3 adjacent colored cells.
            Tiles can be rotated (horizontal or vertical) but not placed
            diagonally.
          </InfoBox>
        </Section>

        {/* 3. Colors */}
        <Section id="colors" title="3. Colors">
          <p className="m-0 text-[14px] text-muted">
            5 standard colors plus 1 wild cell (◎):
          </p>
          <div className="flex justify-start">
            <ColorSwatches
              colorDefs={colorDefs}
              ariaLabel="Chromino color definitions"
            />
          </div>
          <InfoBox>
            Wild cell (◎): white with a ring mark, can be adjacent to any color
            — no color matching required.
          </InfoBox>
        </Section>

        {/* 4. Setup */}
        <Section id="setup" title="4. Setup">
          <ol className="m-0 p-0 flex flex-col gap-2">
            {[
              "Randomly pick 1 Wild Chromino, place it color-side up in the center of the table as the first tile.",
              "Shuffle all remaining tiles (74 base + 4 wild) into the bag.",
              "Each player blindly draws 8 tiles as their hand — only visible to themselves.",
              "The youngest player goes first (or choose randomly), then play clockwise.",
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

        {/* 5. Placement Rules */}
        <Section id="placement" title="5. Placement Rules (Core)">
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[14px] text-fg leading-relaxed font-semibold">
              When placing a tile, both of these must be true:
            </p>
            <ul className="m-0 p-0 flex flex-col gap-2">
              <Rule>
                Adjacent to <strong>at least 2 cells</strong> of tiles already
                on the board
              </Rule>
              <Rule>
                <strong>Every</strong> adjacent cell must be an{" "}
                <strong>exact color match</strong> (Wild ◎ excepted)
              </Rule>
            </ul>
          </div>
          <div className="flex flex-col items-start gap-2">
            <span className="text-[12px] text-subtle">Placement Examples</span>
            <PlacementExamples
              ariaLabel="Placement rule examples: valid and invalid"
              validLabel="✅ Valid"
              validAnnotation="2 adjacent cells match (Green-Green, Blue-Blue)"
              invalidLabel="✗ Invalid"
              invalidAnnotation="Yellow ≠ Red — adjacent cell mismatch"
            />
          </div>
          <InfoBox>
            <strong>Orientation &amp; Rotation</strong>: Tiles can be rotated
            0°, 90°, 180°, or 270°. Only horizontal or vertical placement is
            allowed — no diagonal.
          </InfoBox>
        </Section>

        {/* 6. Wild Chrominos */}
        <Section id="wild" title="6. Wild Chrominos (Chameleon)">
          <ul className="m-0 p-0 flex flex-col gap-1.5">
            <Rule>
              The <strong>center wild cell (◎)</strong> can be adjacent to any
              color — even two different colors at once
            </Rule>
            <Rule>
              The <strong>two end cells</strong> of a Wild Chromino are normal
              colors and must follow standard matching rules
            </Rule>
          </ul>
          <div className="flex flex-col items-start gap-2">
            <span className="text-[12px] text-subtle">Wild Chromino</span>
            <WildTileIllustration
              ariaLabel="Wild Chromino illustration"
              wildLabel="Wild Chromino (example: Blue-◎-Yellow)"
              wildCellNote="◎ can be adjacent to any color"
              neighborLabel="Red"
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

        {/* 7. Turn Flow */}
        <Section id="flow" title="7. Turn Flow">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <h3 className="m-0 text-[13px] font-semibold text-fg-2">
                Each Turn (choose one)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-primary-bg border border-primary/40 rounded-xl p-4 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-primary">
                    Case A · Can Play
                  </span>
                  <span className="text-[13px] text-muted leading-relaxed">
                    Play <strong className="text-fg">exactly 1 tile</strong>{" "}
                    from your hand that satisfies placement rules. Turn ends.
                  </span>
                </div>
                <div className="bg-[#1e1e2e] border border-[#3498DB]/40 rounded-xl p-4 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#3498DB]">
                    Case B · Cannot Play
                  </span>
                  <span className="text-[13px] text-muted leading-relaxed">
                    <strong className="text-fg">Draw 1 tile</strong> from the
                    bag. If it can be played, play it immediately; otherwise
                    keep it. Turn ends.
                  </span>
                </div>
              </div>
              <InfoBox>
                If the bag is empty and you cannot play, your turn is{" "}
                <strong>passed (Pass)</strong>.
              </InfoBox>
            </div>

            <div className="flex justify-start">
              <TurnFlowDiagram
                ariaLabel="Turn action options diagram"
                centerLabel="Your Turn"
                canPlay="Can Play"
                canPlaySub="Place 1 tile"
                cantPlay="Cannot Play"
                cantPlaySub="Draw 1 from bag"
                bagEmpty="Bag empty + can't play"
                bagEmptySub="Pass this turn"
              />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-[13px] font-semibold text-fg-2">
                Special Rules
              </h3>
              <ul className="m-0 p-0 flex flex-col gap-1.5">
                <Rule>
                  When you have only <strong>1 tile</strong> left, you must{" "}
                  <strong>reveal</strong> it so all players can see it
                </Rule>
                <Rule>
                  If your last tile is a <strong>Wild Chromino</strong>, you{" "}
                  <strong>cannot</strong> play it — draw 1 more tile from the
                  bag first
                </Rule>
              </ul>
            </div>
          </div>
        </Section>

        {/* 8. End of Game */}
        <Section id="end" title="8. End of Game">
          <ul className="m-0 p-0 flex flex-col gap-1.5">
            <Rule>
              The <strong>first player to play all their tiles</strong> wins —
              the game does not stop immediately
            </Rule>
            <Rule>
              All other players take <strong>one more turn</strong>
            </Rule>
            <Rule>
              If any other player also finishes on the final round, they{" "}
              <strong>win jointly</strong>
            </Rule>
          </ul>
        </Section>

        {/* 9. Variant Rules */}
        <Section id="variants" title="9. Variant Rules (Optional)">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 mb-2 text-[13px] font-semibold text-fg-2">
                Draw Variants
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  {
                    name: "Basic (default)",
                    desc: "Draw 1 when you cannot play; play immediately if possible, otherwise keep",
                  },
                  {
                    name: "Draw Until You Can",
                    desc: "Keep drawing until you draw a tile you can play",
                  },
                  {
                    name: "Draw Up to 5",
                    desc: "Draw up to 3–5 tiles (set the limit before the game starts)",
                  },
                ].map(({ name, desc }) => (
                  <div
                    key={name}
                    className="flex gap-3 items-start text-[13px] bg-surface-2 border border-border rounded-xl px-3 py-2.5"
                  >
                    <span className="font-semibold text-fg shrink-0 w-28">
                      {name}
                    </span>
                    <span className="text-muted leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="m-0 mb-2 text-[13px] font-semibold text-fg-2">
                Other Variants
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  {
                    name: "Open Hand",
                    desc: "All players reveal their hands — anyone can freely view them",
                  },
                  {
                    name: "Simple Mode",
                    desc: "A tile only needs to be adjacent to at least 1 matching cell (good for teaching or younger players)",
                  },
                ].map(({ name, desc }) => (
                  <div
                    key={name}
                    className="flex gap-3 items-start text-[13px] bg-surface-2 border border-border rounded-xl px-3 py-2.5"
                  >
                    <span className="font-semibold text-fg shrink-0 w-28">
                      {name}
                    </span>
                    <span className="text-muted leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* 10. Quick Reference */}
        <Section id="quickref" title="10. Quick Reference">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <tbody>
                {[
                  ["Starting hand size", "8 tiles per player"],
                  ["Tiles played per turn", "Exactly 1"],
                  ["Min adjacent cells when placing", "2 (Simple Mode: 1)"],
                  ["Adjacent cells must match", "Yes (Wild ◎ excepted)"],
                  ["When you cannot play", "Draw 1 from bag (basic rules)"],
                  ["Reveal last tile", "Yes"],
                  ["Last tile is Wild", "Cannot play it — draw 1 more first"],
                  ["Win condition", "First to empty your hand"],
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
            ← Back to Home, start playing
          </Link>
        </div>
      </main>
    </div>
  );
}
