import type { CakeStyle } from './types';

export const INITIAL_CAKE_WIDTH = 176;
export const CAKE_HEIGHT = 38;
export const PLATE_WIDTH = 280;
export const COMBO_WIDEN_THRESHOLD = 3;
export const WIDEN_AMOUNT = 14;

export const CAKE_STYLES: CakeStyle[] = [
  {
    id: 'uji_matcha',
    name: '宇治濃抹茶海綿',
    subtitle: '石臼研磨抹茶戚風夾著北海道十勝鮮奶油',
    unlockFloor: 0,
    spongeColor: '#5B8A47',
    spongeShadow: '#426B32',
    spongeSpeckle: '#355827',
    fillingColor: '#FAF5EB',
    glazeColor: '#3D6B35',
    glazeHighlight: '#76A660',
    topping: 'matcha_drizzle',
    accentColor: '#FAF5EB',
  },
  {
    id: 'hokkaido_castella',
    name: '十勝蜂蜜生乳捲',
    subtitle: '長崎蜂蜜蛋糕體與綿密生乳雙層餡',
    unlockFloor: 3,
    spongeColor: '#E5B968',
    spongeShadow: '#C79642',
    spongeSpeckle: '#B17D2D',
    fillingColor: '#FFFDF8',
    glazeColor: '#F6E7C8',
    glazeHighlight: '#FFFFFF',
    topping: 'almond_cream',
    accentColor: '#A97136',
  },
  {
    id: 'ichigo_daifuku',
    name: '草莓大福慕斯',
    subtitle: '酸甜博多草莓慕斯包裹柔滑求肥麻糬層',
    unlockFloor: 6,
    spongeColor: '#F3C1C6',
    spongeShadow: '#D9949C',
    spongeSpeckle: '#C85D6A',
    fillingColor: '#FFF8F8',
    glazeColor: '#D94D5D',
    glazeHighlight: '#F0838F',
    topping: 'strawberry',
    accentColor: '#4E7D41',
  },
  {
    id: 'hojicha_montblanc',
    name: '京都焙茶栗子蒙布朗',
    subtitle: '炭火深焙茶香融合和栗泥波浪細絲',
    unlockFloor: 10,
    spongeColor: '#8B6246',
    spongeShadow: '#694731',
    spongeSpeckle: '#4C3120',
    fillingColor: '#EBD9C3',
    glazeColor: '#B88753',
    glazeHighlight: '#D4A874',
    topping: 'chestnut_swirl',
    accentColor: '#E4B15B',
  },
  {
    id: 'kuromitsu_warabi',
    name: '黑蜜黃豆蕨餅層',
    subtitle: '京番茶蛋糕佐沖繩黑糖蜜與晶瑩蕨餅凍',
    unlockFloor: 14,
    spongeColor: '#D6A665',
    spongeShadow: '#B58444',
    spongeSpeckle: '#7A5121',
    fillingColor: '#F7EBD5',
    glazeColor: '#5B3418',
    glazeHighlight: '#85532B',
    topping: 'warabi_cube',
    accentColor: '#E9C88B',
  },
  {
    id: 'peach_oolong',
    name: '白桃烏龍千層',
    subtitle: '炭焙凍頂烏龍餅皮層層堆疊岡山白桃奶油',
    unlockFloor: 18,
    spongeColor: '#F5D2BF',
    spongeShadow: '#DDA98F',
    spongeSpeckle: '#C6886D',
    fillingColor: '#FFF6F0',
    glazeColor: '#E88B7C',
    glazeHighlight: '#F7B7AC',
    topping: 'peach_blush',
    accentColor: '#A6564B',
  },
  {
    id: 'black_sesame',
    name: '黑芝麻竹炭和菓子',
    subtitle: '九鬼濃郁黑胡麻慕斯襯托金芝麻焦香',
    unlockFloor: 22,
    spongeColor: '#46494C',
    spongeShadow: '#2F3235',
    spongeSpeckle: '#1D1F21',
    fillingColor: '#D9D5CE',
    glazeColor: '#252729',
    glazeHighlight: '#5A5D61',
    topping: 'black_sesame',
    accentColor: '#E5B95C',
  },
  {
    id: 'gold_yuzu_matcha',
    name: '金箔柚子抹茶皇冠',
    subtitle: '手採玉露抹茶與高知柚子凝乳點綴食用金箔',
    unlockFloor: 27,
    spongeColor: '#2F5C30',
    spongeShadow: '#1F4121',
    spongeSpeckle: '#163018',
    fillingColor: '#FCE883',
    glazeColor: '#1E4620',
    glazeHighlight: '#4A7D4A',
    topping: 'gold_yuzu',
    accentColor: '#F6C445',
  },
];

export function getCakeStyleForFloor(floorIndex: number): CakeStyle {
  // Unlocked progression: switch cleanly as floors climb, and cycle smoothly past floor 30
  let unlocked = CAKE_STYLES[0];
  for (const style of CAKE_STYLES) {
    if (floorIndex >= style.unlockFloor) {
      unlocked = style;
    }
  }
  if (floorIndex >= 32) {
    // Rotate through all styles every 2 floors at high altitude for rich visual variety
    const cycleIdx = Math.floor((floorIndex - 32) / 2) % CAKE_STYLES.length;
    return CAKE_STYLES[cycleIdx];
  }
  return unlocked;
}

export function getNewlyUnlockedStyleAtFloor(floorIndex: number): CakeStyle | null {
  if (floorIndex <= 0) return null;
  return CAKE_STYLES.find((s) => s.unlockFloor === floorIndex) ?? null;
}
