import type { Metadata } from "next";
import { ZhRulesPage } from "./_zh";
import { EnRulesPage } from "./_en";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale === "zh") {
    return {
      title: "游戏规则 · Chromino",
      description:
        "Chromino 彩色骨牌游戏完整规则说明，包含放置规则、回合流程、变体玩法等图文说明。",
    };
  }
  return {
    title: "Game Rules · Chromino",
    description:
      "Complete Chromino rules including tile placement, turn flow, wild tiles, and variant modes.",
  };
}

export default async function RulesPage({ params }: Props) {
  const { locale } = await params;
  if (locale === "zh") return <ZhRulesPage locale={locale} />;
  return <EnRulesPage locale={locale} />;
}
