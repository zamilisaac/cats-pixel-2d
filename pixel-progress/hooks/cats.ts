// Cat pixel art for pixel-progress (cat edition).
// Each sprite is a list of rows; each character is one cell coloured by a
// palette ('.' is empty). The drawing code gives every cell the class
// `p<char>`, so CSS can animate parts (legs `l`/`r`/`L`/`R`).

// ---------------------------------------------------------------------------
// The band: a calico running along the bar, a sleeping cat at the start and a
// food bowl at the end.

// Side view, facing right. `L`/`R` legs trot in turn.
export const RUNNER = [
  '...............o..o.',
  '..............ofoofo',
  '..p..........offfffo',
  '.p...........ofqkfwo',
  '.p..oooooooooofffwwn',
  '..oppffffwwfffffwwo.',
  '..offqqfffwwwfffffo.',
  '..owwwwwwwwwwwwwwo..',
  '...L.R......L.R.....',
  '...L.R......L.R.....',
]
export const RUNNER_PAL: Record<string, string> = {
  o: '#3A2A26', f: '#FFFFFF', w: '#FFF7EE', p: '#F29A4A', q: '#2E2B33',
  k: '#2B1E1A', n: '#EF7A8C', L: '#3A2A26', R: '#3A2A26',
}

// A curled-up orange tabby, asleep.
export const SLEEPER = [
  '..o..o........',
  '.ofooofo......',
  '.offfffooooo..',
  'offkfkfffpffo.',
  'ofcfffcfpffffo',
  '.offfffffffffo',
  '..ooooooooooo.',
]
export const SLEEPER_PAL: Record<string, string> = {
  o: '#7A3E12', f: '#F2A54A', p: '#D27A26', k: '#5A2A0A', c: '#F59CA6',
}

// A bowl of kibble.
export const BOWL = [
  '...bbbbbb...',
  '..bBbbBbbb..',
  'oooooooooooo',
  '.oSSSSSSSSo.',
  '..oSSSSSSo..',
  '...oooooo...',
]
export const BOWL_PAL: Record<string, string> = {
  b: '#9A5B2E', B: '#6B3A1A', o: '#4A4A55', S: '#E6E8EF',
}

// ---------------------------------------------------------------------------
// The agents panel: one cat face per subagent, each in its own outfit.
// The base face is 16x14 and sits at (row 4, col 1) of an 18x18 canvas, so
// hats can go above it and headset cups beside it.

const BASE = [
  '..oo........oo..',
  '.ofeo......oefo.',
  '.ofeeooooooeefo.',
  '.offffffffffffo.',
  'offffffffffffffo',
  'offkhffffffkhffo',
  'offkkffffffkkffo',
  'ofccfffnnfffccfo',
  'offfffmffmfffffo',
  '.offfffmmfffffo.',
  '..oooooooooooo..',
  '...offwwwwffo...',
  '...offwwwwffo...',
  '...ll......rr...',
]

type Patch = readonly [number, number, string]

const SIZE = 18

const canvas = (layers: ReadonlyArray<readonly Patch[]>): string[] => {
  const g: string[][] = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill('.'))
  const put = ([r, c, s]: Patch): void => {
    const row = g[r]
    if (!row) return
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]
      const col = c + i
      if (!ch || ch === '.' || col < 0 || col >= SIZE) continue
      row[col] = ch
    }
  }
  BASE.forEach((row, r) => put([r + 4, 1, row]))
  layers.forEach(layer => layer.forEach(put))
  return g.map(row => row.join(''))
}

// Closed, happy eyes (^ ^) for a cat whose work is done.
const HAPPY: Patch[] = [[9, 4, 'ff'], [9, 12, 'ff'], [10, 4, 'oo'], [10, 12, 'oo']]

const HARD_HAT: Patch[] = [[2, 7, 'oooo'], [3, 6, 'oYYYYo'], [4, 5, 'oYYYYYYo'], [5, 2, 'oyyyyyyyyyyyyo']]
const TABBY: Patch[] = [[7, 7, 'p..p'], [8, 8, 'pp'], [8, 2, 'p'], [8, 15, 'p']]
const CUPS = (g: string): Patch[] => [
  [8, 0, g + g], [9, 0, g + g], [10, 0, g + g], [11, 0, g + g],
  [8, 16, g + g], [9, 16, g + g], [10, 16, g + g], [11, 16, g + g],
  [12, 2, 'g'], [13, 3, 'gg'], [13, 5, 'M'],
]

const BASE_PAL: Record<string, string> = {
  o: '#2B1E1A', e: '#F4A6B0', w: '#FFFFFF', h: '#FFFFFF', c: '#F59CA6', n: '#EF7A8C',
  m: '#2B1E1A', k: '#2B1E1A', l: '#2B1E1A', r: '#2B1E1A',
}

export type Costume = {
  name: string
  color: string
  pal: Record<string, string>
  patches: Patch[]
  isAlwaysHappy?: boolean
}

export const COSTUMES: Costume[] = [
  {
    name: 'builder', color: '#E8803A',
    pal: { f: '#F0A04B', p: '#C46A1E', Y: '#FFC93C', y: '#E09A12', R: '#E5484D' },
    patches: [...TABBY, ...HARD_HAT, [0, 11, 'oRR'], [1, 11, 'oR']],
  },
  {
    name: 'gamer', color: '#22B573',
    pal: { f: '#34303A', o: '#121015', w: '#45404C', k: '#3DDC84', l: '#121015', r: '#121015', m: '#121015', G: '#3DDC84', g: '#1E9E57', M: '#3DDC84' },
    patches: [[3, 3, 'oGGGGGGGGGGo'], [4, 2, 'oG'], [4, 14, 'Go'], [5, 1, 'G'], [6, 1, 'G'], [7, 1, 'G'], [5, 16, 'G'], [6, 16, 'G'], [7, 16, 'G'], ...CUPS('G')],
  },
  {
    name: 'sleepy', color: '#8B5CF6',
    pal: { f: '#FFFFFF', p: '#F29A4A', q: '#2E2B33', N: '#4B4F9E', W: '#FFFFFF', V: '#5B5FAE' },
    patches: [[7, 3, 'ppp'], [8, 3, 'pp'], [7, 12, 'qqq'], [8, 13, 'qq'],
      [0, 13, 'WW'], [1, 12, 'oNo'], [2, 9, 'oNNNo'], [3, 7, 'oNNNNNo'], [4, 5, 'oNNNNNNNo'], [5, 3, 'WWWWWWWWWWWW'],
      [9, 3, 'oVVVVVVVVVVo'], [10, 3, 'oVVVVVVVVVVo']],
  },
  {
    name: 'engineer', color: '#3B82F6',
    pal: { f: '#9AA0A6', p: '#6B7076', Y: '#FFC93C', y: '#E09A12' },
    patches: [...TABBY, ...HARD_HAT,
      [8, 3, 'oooo'], [8, 11, 'oooo'], [9, 7, 'oooo'],
      [9, 3, 'o'], [9, 6, 'o'], [9, 11, 'o'], [9, 14, 'o'],
      [10, 3, 'o'], [10, 6, 'o'], [10, 11, 'o'], [10, 14, 'o'],
      [11, 3, 'oooo'], [11, 11, 'oooo']],
  },
  {
    name: 'gentleman', color: '#D9483B',
    pal: { f: '#34303A', o: '#121015', l: '#121015', r: '#121015', K: '#26242B', R: '#C0392B' },
    patches: [[7, 8, 'ww'], [8, 7, 'wwww'],
      [1, 6, 'oooooo'], [2, 5, 'oKKKKKKo'], [3, 5, 'oKKKKKKo'], [4, 5, 'oRRRRRRo'], [5, 4, 'oKKKKKKKKo'],
      [15, 8, 'RR'], [16, 8, 'RR']],
  },
  {
    name: 'chef', color: '#0EA5A4',
    pal: { f: '#FFFFFF', o: '#3A3240', k: '#3B82F6', W: '#FFFFFF', S: '#D8D2DC', T: '#FF7B93' },
    patches: [[0, 5, 'oooooooo'], [1, 4, 'oWWWWWWWWo'], [2, 4, 'oWWWWWWWWo'], [3, 5, 'oWWWWWWo'], [4, 5, 'oSSSSSSo'], [13, 8, 'TT']],
  },
  {
    name: 'diver', color: '#3B6FE0',
    pal: { f: '#EADBC4', e: '#5A4036', w: '#8A6A5A', p: '#5A4036', B: '#4FC3F7', b: '#B3E9FF' },
    patches: [[4, 3, 'pp'], [4, 13, 'pp'],
      [8, 2, 'oooooooooooooo'], [9, 2, 'oBbBBBBBBbBBBo'], [10, 2, 'oBBBBBBBBBBBBo'], [11, 2, 'oooooooooooooo'],
      [9, 0, 'oo'], [9, 16, 'oo']],
  },
  {
    name: 'mechanic', color: '#D6336C',
    pal: { f: '#A0703F', p: '#6E4A26', k: '#3A2414', Y: '#FFC93C', y: '#E09A12', P: '#FF8FB1' },
    patches: [...TABBY, ...HARD_HAT, [3, 13, 'PPoPP'], [4, 14, 'P.P']],
  },
  {
    name: 'streamer', color: '#2E9E57',
    pal: { f: '#5A3A28', p: '#C9762B', k: '#3A2414', O: '#F28C28', Q: '#C4651A', G: '#3A3A40', g: '#3DDC84', M: '#3DDC84' },
    patches: [[8, 3, 'pp'], [11, 12, 'ppp'], [12, 13, 'pp'], [7, 10, 'pp'],
      [2, 6, 'oooooo'], [3, 5, 'oOOOOOOo'], [4, 4, 'oOOOOOOOOo'], [5, 3, 'oQQQQQQQQQQo'], ...CUPS('G')],
  },
  {
    name: 'detective', color: '#6B7280', isAlwaysHappy: true,
    pal: { f: '#7D8088', p: '#5E6168', K: '#4A4A52', D: '#2E2E34' },
    patches: [[1, 6, 'oooooo'], [2, 5, 'oKKKKKKo'], [3, 5, 'oDDDDDDo'], [4, 3, 'oKKKKKKKKKKo']],
  },
  {
    name: 'ninja', color: '#F57C1F', isAlwaysHappy: true,
    pal: { f: '#F29A4A', p: '#C96A1E', O: '#F57C1F', Q: '#FFD7A8', T: '#FF7B93' },
    patches: [[5, 2, 'oOOOOOOOOOOOOo'], [6, 3, 'OQOOQOOQOOQO'], [4, 16, 'O'], [5, 16, 'OO'], [6, 16, 'O'], [12, 8, 'oo'], [13, 8, 'TT']],
  },
  {
    name: 'artist', color: '#C0392B',
    pal: { f: '#34303A', o: '#121015', l: '#121015', r: '#121015', R: '#C0392B', G: '#2E9E57' },
    patches: [[7, 8, 'ww'], [8, 7, 'wwww'],
      [1, 8, 'o'], [2, 5, 'oooooo'], [3, 4, 'oRRRRRRRo'], [4, 3, 'oRRRRRRRRRGo'], [5, 4, 'oGGGGGGGGo']],
  },
]

/** The rows and palette for one costume; happy eyes once the cat is done. */
export const catSprite = (c: Costume, isHappy: boolean): { rows: string[]; pal: Record<string, string> } => ({
  rows: canvas([isHappy || c.isAlwaysHappy ? HAPPY : [], c.patches]),
  pal: { ...BASE_PAL, ...c.pal },
})
