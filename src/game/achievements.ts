import type { AchievementDef, AchievementEvalContext } from './types';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_stack',
    title: '茶屋學徒',
    subtitle: '掌握竹夾釋放節奏，穩穩疊起五層和菓子塔',
    conditionLabel: '單場堆疊達到 5 層',
    rank: 'matcha',
    icon: 'sprout',
    priority: 1,
    check: (ctx) => ctx.floors >= 5,
  },
  {
    id: 'perfect_3',
    title: '精準茶筅',
    subtitle: '如點茶般精準落點，觸發蛋糕寬度回復獎勵',
    conditionLabel: '單場連續 3 次完美對齊',
    rank: 'matcha',
    icon: 'whisk',
    priority: 2,
    check: (ctx) => ctx.maxComboInRun >= 3,
  },
  {
    id: 'score_500',
    title: '茶席名匠',
    subtitle: '層層累積高分，贏得京都茶客一致好評',
    conditionLabel: '單場總分達到 500 分',
    rank: 'matcha',
    icon: 'seal',
    priority: 3,
    check: (ctx) => ctx.score >= 500,
  },
  {
    id: 'perfect_5',
    title: '匠心職人',
    subtitle: '毫釐不差的專注力，連續五層完美無瑕',
    conditionLabel: '單場連續 5 次完美對齊',
    rank: 'sakura',
    icon: 'craft',
    priority: 4,
    check: (ctx) => ctx.maxComboInRun >= 5,
  },
  {
    id: 'floor_15',
    title: '月見糕點師',
    subtitle: '高塔躍出屋簷，在暮色提燈下堆砌夢幻甜點',
    conditionLabel: '單場堆疊達到 15 層',
    rank: 'sakura',
    icon: 'moon',
    priority: 5,
    check: (ctx) => ctx.floors >= 15,
  },
  {
    id: 'precision_survivor',
    title: '針尖上的抹茶',
    subtitle: '於極細邊緣化險為夷，展現驚人平衡工藝',
    conditionLabel: '寬度低於 30% 時成功再疊 1 層',
    rank: 'sakura',
    icon: 'needle',
    priority: 6,
    check: (ctx) => ctx.floors >= 2 && ctx.landedWidthRatio < 0.3,
  },
  {
    id: 'floor_20',
    title: '京都甜點宗師',
    subtitle: '直入京都星夜的二十層御菓子高塔傳奇',
    conditionLabel: '單場堆疊達到 20 層',
    rank: 'gold',
    icon: 'torii',
    priority: 7,
    check: (ctx) => ctx.floors >= 20,
  },
  {
    id: 'perfect_10',
    title: '神乎其技',
    subtitle: '十連完美對齊，宛若和菓子名匠化身',
    conditionLabel: '單場連續 10 次完美對齊',
    rank: 'gold',
    icon: 'star',
    priority: 8,
    check: (ctx) => ctx.maxComboInRun >= 10,
  },
  {
    id: 'floor_30',
    title: '金箔御菓子傳人',
    subtitle: '三十層無上工藝，摘下抹茶屋最高榮譽印綬',
    conditionLabel: '單場堆疊達到 30 層',
    rank: 'gold',
    icon: 'crown',
    priority: 9,
    check: (ctx) => ctx.floors >= 30,
  },
];

export function evaluateAchievements(ctx: AchievementEvalContext): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => a.check(ctx));
}

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getTopAchievement(ids: string[]): AchievementDef | null {
  let top: AchievementDef | null = null;
  for (const id of ids) {
    const def = getAchievementById(id);
    if (def && (!top || def.priority > top.priority)) {
      top = def;
    }
  }
  return top;
}
