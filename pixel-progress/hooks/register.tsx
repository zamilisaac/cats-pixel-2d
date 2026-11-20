import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { AgentRun, Flow } from '../types'
import { COSTUMES } from './cats'
import type { Costume } from './cats'
import { BOWL_ART, FACE_ART, RUNNER_ART, SLEEPER_ART, YARN_ART } from './art'
import type { Art } from './art'
import { OFFICE_BAND_H, officeBandSvg, officeLabel } from './office-band'
import { ROCKET_BAND_H, rocketBandSvg, rocketLabel } from './rocket-band'

// ---------------------------------------------------------------------------
// pixel-progress: an animated progress bar above the prompt (with a pixel
// calico cat running along it) and an agents panel where every subagent gets its own
// animated step bar. Claude reports progress through two small tools:
//   progress  main session: the overall task (title, done/total, note)
//   step      subagents: their own steps (done/total, note)

const PLUGIN = 'pixel-progress'
const TOOL = 'mcp__pixel-progress__progress'
const STEP_TOOL = 'mcp__pixel-progress__step'
const PANE = 'pixel-progress-agents'
const PANE_TITLE = 'Agents'

const flow = atom({ plugin: 'pixel-progress', key: 'flow' } as const, null, { shape: 'flow-1' })
const agents = atom({ plugin: 'pixel-progress', key: 'agents' } as const, [], { shape: 'agents-1' })
const now = atom({ plugin: 'pixel-progress', key: 'now' } as const, 0)
const theme = atom({ plugin: 'pixel-progress', key: 'theme' } as const, 'cat')

const THEMES = ['cat', 'office', 'rocket'] as const
type Theme = (typeof THEMES)[number]
const isTheme = (s: unknown): s is Theme => typeof s === 'string' && (THEMES as readonly string[]).includes(s)

const STEP_BRIEF = `

Progress reporting: before any other work, call \`${STEP_TOOL}\` with \`total\` (your plan in 3-8 steps) and \`done: 0\`. Call it again with \`done\` and a few-word \`note\` each time a step finishes. It only draws a progress bar.`

const GUIDE = `Progress bar: when a task will take 3 or more distinct steps (or uses subagents), call \`${TOOL}\` right after planning with a short \`title\` (2-4 words) and \`total\` steps, then again with \`done\` and a few-word \`note\` as each step finishes, and once with \`finished: true\` at the end. Skip it for quick answers.`

// ---------------------------------------------------------------------------
// Colours and small helpers

const ACCENT = '#E8803A'
const ACCENT_DARK = '#B4532A'
const BROWN = '#5B4136'
const CREAM = '#F7EEDF'
const RAINBOW = ['#FFB3C1', '#FFD6A5', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#BDB2FF', '#FFC6FF']
const DONE = '#22C55E'
const FAIL = '#EF4444'
const FONT = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'

const typeColor = (type: string): string => {
  const t = type.toLowerCase()
  if (t.includes('explore')) return '#22B573'
  if (t.includes('plan')) return '#3B82F6'
  if (t.includes('general')) return '#A855F7'
  if (t.includes('demo-')) return ['#22B573', '#3B82F6', '#E8803A'][t.length % 3] ?? ACCENT
  return '#E8803A'
}

const xml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const clip = (s: string, n: number): string => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s)

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

const ratio = (f: Flow): number => (f.isFinished ? 1 : f.total > 0 ? clamp(f.done / f.total, 0, 1) : 0)

const stepRatio = (a: AgentRun): number | null => {
  if (a.status === 'done') return 1
  if (!a.stepTotal) return null
  return clamp((a.stepDone ?? 0) / a.stepTotal, 0, 1)
}

const fmtTime = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const fmtTokens = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

const windowOf = (model: string): number => (/haiku-4|claude-3/i.test(model) ? 200_000 : 1_000_000)

const modelName = (id: string): string => {
  const m = /(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d{1,2})(?!\d))?/i.exec(id)
  const [, family = '', major = '', minor] = m ?? []
  if (!family) return id.replace(/^claude-/, '') || '—'
  return `${family.charAt(0).toUpperCase()}${family.slice(1).toLowerCase()} ${major}${minor ? '.' + minor : ''}`
}

const typeName = (type: string): string => (type.startsWith('demo-') ? type.slice(5) : type.replace(/^[^:]*:/, ''))

const elapsed = (a: AgentRun, at: number): number => (a.endedAt ?? Math.max(at, a.startedAt)) - a.startedAt

// A sprite from the reference artwork, `h` tall at (x, y), keeping its aspect.
const artW = (a: Art, h: number): number => (h * a.w) / a.h

const sprite = (a: Art, x: number, y: number, h: number, cls = ''): string =>
  `<image${cls ? ` class="${cls}"` : ''} href="${a.uri}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${artW(a, h).toFixed(1)}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`

// A sprite centred in a w x h box.
const spriteIn = (a: Art, x: number, y: number, w: number, h: number, cls = ''): string => {
  const s = Math.min(w / a.w, h / a.h)
  const dw = a.w * s
  const dh = a.h * s
  return `<image${cls ? ` class="${cls}"` : ''} href="${a.uri}" x="${(x + (w - dw) / 2).toFixed(1)}" y="${(y + (h - dh) / 2).toFixed(1)}" width="${dw.toFixed(1)}" height="${dh.toFixed(1)}"/>`
}

// A paw print centred on (x, y).
const paw = (x: number, y: number, s: number, fill: string, opacity: number): string =>
  `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s})" fill="${fill}" opacity="${opacity}"><ellipse cx="0" cy="1.6" rx="2.5" ry="2"/><circle cx="-2.5" cy="-1.5" r="1.05"/><circle cx="-0.85" cy="-2.9" r="1.05"/><circle cx="0.85" cy="-2.9" r="1.05"/><circle cx="2.5" cy="-1.5" r="1.05"/></g>`

// A four-point twinkle centred on (x, y).
const star = (x: number, y: number, s: number, fill: string, cls: string): string =>
  `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s})"><path class="${cls}" d="M0 -3.4 L.9 -.9 3.4 0 .9 .9 0 3.4 -.9 .9 -3.4 0 -.9 -.9z" fill="${fill}"/></g>`

// A little fish treat facing left (towards the cat), centred on (x, y).
const fish = (x: number, y: number, s: number): string =>
  `<g class="wig" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s})"><path d="M-6 0 q5 -5 10 0 q-5 5 -10 0z" fill="#8EC5FF" stroke="#3A2420" stroke-width=".9"/><path d="M4 0 l3.5 -3.2 v6.4z" fill="#8EC5FF" stroke="#3A2420" stroke-width=".9" stroke-linejoin="round"/><circle cx="-3" cy="-.8" r=".9" fill="#3A2420"/></g>`

const SHARED_CSS = `
.breathe{transform-box:fill-box;transform-origin:50% 100%;animation:br 3s ease-in-out infinite}
@keyframes br{50%{transform:scaleY(1.05)}}
.wig{animation:wg 1.4s ease-in-out infinite}
@keyframes wg{50%{opacity:.75}}
.t{fill:#4A3329}.m{fill:#7A6A62}.k{fill:#efe7dc}.tile{fill:#fbf6ef}
@media (prefers-color-scheme: dark){.t{fill:#f3e6d8}.m{fill:#b8a89c}.k{fill:#3a302c}.tile{fill:#2a2420}}
.stripes{animation:mv .9s linear infinite}
@keyframes mv{from{transform:translateX(0)}to{transform:translateX(14px)}}
.glow{animation:gl 1.2s ease-in-out infinite}
@keyframes gl{50%{opacity:.25}}
.live{animation:gl 1.4s ease-in-out infinite}
.bob{animation:bob .6s steps(1) infinite}
.run{animation:bob .3s steps(1) infinite}
@keyframes bob{50%{transform:translateY(-1px)}}
.pl,.pL{animation:st .3s steps(1) infinite}.pr,.pR{animation:st .3s steps(1) infinite -.15s}
@keyframes st{50%{transform:translateY(-1.2px)}}
.yarn{transform-box:fill-box;transform-origin:50% 50%;animation:rot .9s linear infinite}
.spin{transform-box:fill-box;transform-origin:50% 50%;animation:rot 1s linear infinite}
@keyframes rot{to{transform:rotate(360deg)}}
.zz{animation:zz 2.4s ease-in-out infinite}.zz2{animation:zz 2.4s ease-in-out infinite -1.2s}
@keyframes zz{0%{opacity:0;transform:translate(0,2px)}40%{opacity:1}100%{opacity:0;transform:translate(4px,-6px)}}
.spark{animation:tw 1.6s ease-in-out infinite}.spark2{animation:tw 1.6s ease-in-out infinite -.8s}
@keyframes tw{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1)}}
.spark,.spark2{transform-box:fill-box;transform-origin:50% 50%}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
`

// The cat bar: a brown frame, a cream track and a pastel rainbow fill with
// sliding stripes and paw prints. `id` keeps clip and gradient ids apart.
const catBarSvg = (id: string, x: number, y: number, w: number, h: number, r: number, isMoving: boolean): string => {
  const fill = Math.round(w * r)
  const stripes: string[] = []
  for (let sx = -28; sx < fill + 28; sx += 14) {
    stripes.push(`<rect x="${sx}" y="-2" width="6" height="${h + 4}" transform="skewX(-30)"/>`)
  }
  const paws: string[] = []
  for (let px = 14, i = 0; px < fill - 10; px += 24, i++) {
    paws.push(paw(px, h / 2 + (i % 2 ? 3.5 : -3), 1.05, '#3A2420', 0.85))
  }
  const stops = RAINBOW.map((c, i) => `<stop offset="${(i / (RAINBOW.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('')
  const sweep = `@keyframes sh${id}{from{transform:translateX(-50px)}to{transform:translateX(${fill + 50}px)}}.sh${id}{animation:sh${id} ${isMoving ? 2.4 : 4}s ease-in-out infinite}`
  return `<style>${sweep}</style>
<defs>
<clipPath id="c${id}"><rect width="${w}" height="${h}" rx="3"/></clipPath>
<clipPath id="f${id}"><rect width="${fill}" height="${h}"/></clipPath>
<linearGradient id="r${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${Math.max(fill, 40)}" y2="${h}">${stops}</linearGradient>
<linearGradient id="g${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<g transform="translate(${x},${y})">
<rect x="-5" y="-5" width="${w + 10}" height="${h + 10}" rx="6" fill="#2E1C18"/>
<rect x="-3.5" y="-3.5" width="${w + 7}" height="${h + 7}" rx="5" fill="#76574A"/>
<rect x="-3.5" y="-3.5" width="${w + 7}" height="1.6" fill="#A07E6E" opacity=".7"/>
<rect x="-1" y="-1" width="${w + 2}" height="${h + 2}" rx="3" fill="#2E1C18"/>
<rect width="${w}" height="${h}" rx="2" fill="${CREAM}"/>
<g clip-path="url(#c${id})">
<g clip-path="url(#f${id})">
<rect width="${fill}" height="${h}" fill="url(#r${id})"/>
${isMoving ? `<g class="stripes" fill="#fff" opacity=".28">${stripes.join('')}</g>` : ''}
${paws.join('')}
<rect class="sh${id}" width="50" height="${h}" fill="url(#g${id})"/>
</g>
</g>
</g>`
}

// ---------------------------------------------------------------------------
// The band above the prompt

const BAND_H = 64

const pillLabel = (f: Flow): string => {
  if (f.isFinished) return 'Done! Nom nom'
  const base = f.total > 0 ? `Tasks ${f.done}/${f.total}` : 'Working'
  return f.note ? `${base} · ${clip(f.note, 18)}` : base
}

const bandSvg = (f: Flow, W: number): string => {
  const title = clip(f.title || 'Working', 30)
  const barH = 22
  const barY = 26
  // The sleeper curls up against the start of the bar, the bowl waits at its end.
  const sleepH = 30
  const sleepW = artW(SLEEPER_ART, sleepH)
  const sleepY = barY + barH + 6 - sleepH
  const bowlH = 24
  const bowlW = artW(BOWL_ART, bowlH)
  const bowlX = W - bowlW - 2
  const bowlY = barY + barH + 4 - bowlH
  const barX = sleepW - 4
  const barW = Math.max(80, bowlX - barX - 14)
  const r = ratio(f)
  const fillW = Math.round(barW * r)

  // The runner stands in the bar with its nose at the end of the fill.
  const runH = 34
  const runW = artW(RUNNER_ART, runH)
  const catX = barX + clamp(fillW - runW + 6, -6, barW - runW + 6)
  const catY = barY + barH + 3 - runH
  const yarnH = 15
  const yarnW = artW(YARN_ART, yarnH)
  const yarnX = catX + runW + 1
  const showYarn = !f.isFinished && yarnX + yarnW < barX + barW - 2
  const yarnR = yarnW / 2

  // The label goes left of the cat, else right of the yarn, else a short
  // "3/5" squeezed into whichever side has more room.
  const pillH = 14
  const widthOf = (s: string): number => Math.round(16 + s.length * 6.1)
  const leftRoom = catX - (barX + 4) - 4
  const rightStart = showYarn ? yarnX + 2 * yarnR + 4 : catX + runW + 3
  const rightRoom = barX + barW - 4 - rightStart
  const full = pillLabel(f)
  const short = f.isFinished ? 'Done!' : f.total > 0 ? `${f.done}/${f.total}` : '…'
  const label = widthOf(full) <= Math.max(leftRoom, rightRoom) ? full : short
  const pillW = widthOf(label)
  const pillX = leftRoom >= pillW
    ? catX - pillW - 4
    : rightRoom >= pillW || rightRoom >= leftRoom
      ? rightStart
      : barX + 4
  const pillY = barY + (barH - pillH) / 2

  const percent = `${Math.round(r * 100)}%`
  const PIX = `'Press Start 2P', 'Pixelify Sans', ui-monospace, Consolas, monospace`
  const heading = f.isFinished ? `${title.toUpperCase()}!` : `${title.toUpperCase()}...`
  const headX = barX + barW / 2
  // A fixed text width keeps the paws clear of the heading whichever font loads.
  const headW = Math.min(heading.length * 8.6, barW - 40)
  const headHalf = headW / 2 + 12
  // The percent rides under the cat; "100%" sits under the bowl unless they meet.
  const pctX = clamp(catX + runW * 0.55, barX + 14, barX + barW - 6)
  const bowlMid = bowlX + bowlW / 2
  const showGoal = !f.isFinished && bowlMid - pctX > 46
  const hearts = f.isFinished
    ? `<text class="spark" x="${bowlX + 2}" y="${bowlY - 2}" font-size="11" fill="#FF6B8B">♥</text>
<text class="spark2" x="${bowlX + bowlW - 8}" y="${bowlY + 1}" font-size="9" fill="#FF6B8B">♥</text>
<text class="spark2" x="${bowlX - 12}" y="${bowlY + 6}" font-size="8" fill="#FF8FB1">♥</text>
${star(bowlX + bowlW + 1, bowlY + 4, 1, '#FFD54A', 'spark')}${star(bowlX - 4, bowlY - 6, 0.8, '#FFD54A', 'spark2')}`
    : ''
  // v2 extras: twinkles in the rainbow, fish treats waiting ahead of the cat
  // and a soft shadow under the runner.
  const twinkles = fillW > 50
    ? [0.18, 0.42, 0.66, 0.88]
        .map((p, i) => ({ x: barX + fillW * p, y: barY + (i % 2 ? barH - 6 : 6), i }))
        .filter(t => t.x < catX - 4)
        .map(t => star(t.x, t.y, 0.9, '#fff', t.i % 2 ? 'spark2' : 'spark'))
        .join('')
    : ''
  const fishFrom = (showYarn ? yarnX + yarnW : catX + runW) + 18
  const treats: string[] = []
  if (!f.isFinished) {
    for (let fx = fishFrom, i = 0; fx < barX + barW - 12 && i < 12; fx += 46, i++) {
      if (fx > pillX - 12 && fx < pillX + pillW + 12) continue
      treats.push(fish(fx, barY + barH / 2, 1))
    }
  }
  const shadow = `<ellipse cx="${catX + runW * 0.5}" cy="${barY + barH + 1.5}" rx="${runW * 0.36}" ry="2.2" fill="#2E1C18" opacity=".25"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${BAND_H}" viewBox="0 0 ${W} ${BAND_H}">
<style>${SHARED_CSS}</style>
<g class="${f.isFinished ? '' : 'live'}">${paw(headX - headHalf, 11, 1.2, '#3A2420', 1)}${paw(headX + headHalf, 11, 1.2, '#3A2420', 1)}</g>
<text class="t" x="${headX}" y="15.5" text-anchor="middle" font-family="${PIX}" font-size="13" font-weight="800" textLength="${headW.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${xml(heading)}</text>
<text class="zz m" x="${sleepW * 0.62}" y="${sleepY + 2}" font-family="${FONT}" font-size="8" font-weight="700">z</text>
<text class="zz2 m" x="${sleepW * 0.62 + 6}" y="${sleepY - 3}" font-family="${FONT}" font-size="9" font-weight="700">z</text>
${catBarSvg('band', barX, barY, barW, barH, r, !f.isFinished)}
${twinkles}
${treats.join('')}
${shadow}
${sprite(SLEEPER_ART, 0, sleepY, sleepH, 'breathe')}
<g transform="translate(${pillX},${pillY})">
<rect width="${pillW}" height="${pillH}" rx="7" fill="${BROWN}" opacity=".92"/>
<text x="${pillW / 2}" y="${pillH / 2 + 3.6}" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="700" fill="${CREAM}">${xml(label)}</text>
</g>
${showYarn ? sprite(YARN_ART, yarnX, barY + barH - yarnH - 1, yarnH, 'yarn') : ''}
<g class="${f.isFinished ? '' : 'run'}">${sprite(RUNNER_ART, catX, catY, runH)}</g>
<text class="m" x="${pctX}" y="${BAND_H - 2}" text-anchor="middle" font-family="${PIX}" font-size="10.5" font-weight="700" font-variant-numeric="tabular-nums">${percent}</text>
${showGoal ? `<text class="m" x="${bowlMid}" y="${BAND_H - 2}" text-anchor="middle" font-family="${PIX}" font-size="10.5" font-weight="700">100%</text>` : ''}
${sprite(BOWL_ART, bowlX, bowlY, bowlH)}
${hearts}
</svg>`
}

const textBar = (r: number, width: number): string => {
  const filled = Math.round(width * r)
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
}

const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

// ---------------------------------------------------------------------------
// The agents panel: a header with tiles, a coloured section bar, then one
// card per subagent with its own dressed-up cat, its step, its last two
// actions and a thin animated bar.

const CARD_H = 128
const HEAD_H = 104
const SECTION_H = 26

const PANEL_CSS = `
.card{fill:#fbf6ef}.ln{fill:#3b2c25}
@media (prefers-color-scheme: dark){.card{fill:#221d1a}.ln{fill:#e2d6ca}}
`

const headerSvg = (W: number, list: readonly AgentRun[], at: number): string => {
  const tokens = list.reduce((n, a) => n + a.tokens, 0)
  const time = list.reduce((m, a) => Math.max(m, elapsed(a, at)), 0)
  const steps = list.reduce((n, a) => n + (a.status === 'done' ? (a.stepTotal ?? 1) : (a.stepDone ?? 0)), 0)
  const tileW = (W - 16) / 3
  const tile = (i: number, label: string, value: string) => `<g transform="translate(${i * (tileW + 8)},40)">
<rect class="card" width="${tileW}" height="58" rx="10" stroke="${BROWN}" stroke-opacity=".25"/>
${paw(tileW - 14, 16, 0.9, ACCENT, 0.5)}
<text class="m" x="12" y="22" font-family="${FONT}" font-size="12">${label}</text>
<text x="12" y="45" font-family="${FONT}" font-size="17" font-weight="700" fill="${ACCENT_DARK}" font-variant-numeric="tabular-nums">${value}</text>
</g>`
  const n = list.length
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HEAD_H}" viewBox="0 0 ${W} ${HEAD_H}">
<style>${SHARED_CSS}${PANEL_CSS}</style>
${paw(8, 14, 1.3, ACCENT, 1)}
<text x="20" y="20" font-family="${FONT}" font-size="15" font-weight="700" fill="${ACCENT_DARK}">${n} cat${n === 1 ? '' : 's'} on the job</text>
${sprite(SLEEPER_ART, W - artW(SLEEPER_ART, 30) - 2, 2, 30, 'breathe')}
<text class="zz m" x="${W - artW(SLEEPER_ART, 30) * 0.45}" y="8" font-family="${FONT}" font-size="8" font-weight="700">z</text>
${tile(0, 'Cat tokens', fmtTokens(tokens))}
${tile(1, 'Time', fmtTime(time))}
${tile(2, 'Steps done', String(steps))}
</svg>`
}

const sectionSvg = (W: number, label: string, color: string, art?: Art, isMoving = false): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${SECTION_H}" viewBox="0 0 ${W} ${SECTION_H}">
<style>${SHARED_CSS}</style>
<rect width="${W}" height="${SECTION_H}" rx="6" fill="${color}"/>
<rect width="${W}" height="${SECTION_H / 2}" rx="6" fill="#fff" opacity=".12"/>
${paw(13, SECTION_H / 2 + 0.5, 1.15, '#fff', 0.95)}
<text x="26" y="${SECTION_H / 2 + 4.5}" font-family="${FONT}" font-size="13" font-weight="700" fill="#fff">${xml(label)}</text>
${art ? `<g class="${isMoving ? 'run' : 'breathe'}">${sprite(art, W - artW(art, SECTION_H - 4) - 8, 2, SECTION_H - 4)}</g>` : ''}
</svg>`

const agentSvg = (W: number, a: AgentRun, at: number, costume: Costume, i: number): string => {
  const color = a.status === 'failed' ? FAIL : costume.color
  const isRunning = a.status === 'running'
  const face = FACE_ART[costume.name] ?? FACE_ART.builder!
  const x0 = 100
  const right = W - 14
  const title = clip(a.description || typeName(a.type), Math.floor((right - x0 - 30) / 8))
  const stats = `${fmtTokens(a.tokens)} tokens · ${fmtTime(elapsed(a, at))}`
  const total = a.stepTotal ?? 0
  const current = isRunning ? Math.min(total || 1, (a.stepDone ?? 0) + 1) : total
  const step = a.status === 'done'
    ? `Done${total ? ` · ${total} steps` : ''} · purr`
    : a.status === 'failed'
      ? 'Stopped'
      : total
        ? `Step ${current}${a.stepNote ? ' · ' + clip(a.stepNote, 30) : ''}`
        : 'Stretching…'
  const lines = (a.recent ?? []).slice(0, 2)
  const r = stepRatio(a) ?? 0
  const fill = Math.round((right - x0) * r)
  const icon = isRunning
    ? `<g class="spin"><circle cx="${x0 + 6}" cy="68" r="5.5" fill="none" stroke="${color}" stroke-opacity=".3" stroke-width="2"/><path d="M${x0 + 6} 62.5 a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/></g>`
    : paw(x0 + 6, 68, 1.2, a.status === 'done' ? DONE : FAIL, 1)
  const status = isRunning
    ? `<circle class="live" cx="${right - 4}" cy="20" r="5" fill="${DONE}"/>`
    : a.status === 'done'
      ? `<path d="M${right - 10} 20 l4 4 7 -8" stroke="${DONE}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="M${right - 9} 15 l8 8 M${right - 1} 15 l-8 8" stroke="${FAIL}" stroke-width="2.4" stroke-linecap="round"/>`
  const AV = 72
  const avX = 13
  const avY = 17
  // v2: the avatar sits in a cat-head window (two ears on top) with a name tag.
  const R = 12
  const head = `<path d="M${avX + R},${avY} H${avX + AV - R} Q${avX + AV},${avY} ${avX + AV},${avY + R} V${avY + AV - R} Q${avX + AV},${avY + AV} ${avX + AV - R},${avY + AV} H${avX + R} Q${avX},${avY + AV} ${avX},${avY + AV - R} V${avY + R} Q${avX},${avY} ${avX + R},${avY}Z M${avX + 3},${avY + 9} L${avX + 9},${avY - 10} L${avX + 28},${avY + 1}Z M${avX + AV - 3},${avY + 9} L${avX + AV - 9},${avY - 10} L${avX + AV - 28},${avY + 1}Z" fill="${color}" opacity=".17"/>
<path d="M${avX + 9},${avY + 3} L${avX + 11},${avY - 4} L${avX + 19},${avY + 1}Z M${avX + AV - 9},${avY + 3} L${avX + AV - 11},${avY - 4} L${avX + AV - 19},${avY + 1}Z" fill="#F4A6B0" opacity=".8"/>`
  const tagText = `${costume.name.charAt(0).toUpperCase()}${costume.name.slice(1)} cat`
  const tagW = Math.round(tagText.length * 5.9 + 14)
  const tag = `<g transform="translate(${avX + AV / 2 - tagW / 2},${avY + AV + 4})"><rect width="${tagW}" height="15" rx="7.5" fill="${color}"/><text x="${tagW / 2}" y="11" text-anchor="middle" font-family="${FONT}" font-size="10" font-weight="700" fill="#fff">${xml(tagText)}</text></g>`
  // v2: one segment per planned step, the current one pulsing.
  const segN = a.stepTotal ?? 0
  const segDone = a.status === 'done' ? segN : (a.stepDone ?? 0)
  const gap = 3
  const segW = segN > 0 ? (right - x0 - gap * (segN - 1)) / segN : 0
  const segments = segN > 0 && segN <= 16 && segW >= 6
    ? Array.from({ length: segN }, (_, s) => {
        const sx = (x0 + s * (segW + gap)).toFixed(1)
        if (s < segDone) return `<rect x="${sx}" y="${CARD_H - 17}" width="${segW.toFixed(1)}" height="6" rx="3" fill="${color}"/>`
        if (s === segDone && isRunning) return `<rect class="live" x="${sx}" y="${CARD_H - 17}" width="${segW.toFixed(1)}" height="6" rx="3" fill="${color}" opacity=".55"/>`
        return `<rect class="k" x="${sx}" y="${CARD_H - 17}" width="${segW.toFixed(1)}" height="6" rx="3"/>`
      }).join('')
    : ''
  const badge = a.status === 'done'
    ? `<g transform="translate(${avX + AV - 8},${avY + AV - 8})"><circle r="9" fill="${DONE}" stroke="#fff" stroke-width="2"/><path d="M-4 0 l3 3 5 -6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`
    : a.status === 'failed'
      ? `<g transform="translate(${avX + AV - 8},${avY + AV - 8})"><circle r="9" fill="${FAIL}" stroke="#fff" stroke-width="2"/><path d="M-3.5 -3.5 l7 7 M3.5 -3.5 l-7 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></g>`
      : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${CARD_H}" viewBox="0 0 ${W} ${CARD_H}">
<style>${SHARED_CSS}${PANEL_CSS}
@keyframes fillin${i}{from{width:0}to{width:${fill}px}}.fi${i}{animation:fillin${i} .8s ease-out}</style>
<rect class="card" x="1" y="1" width="${W - 2}" height="${CARD_H - 4}" rx="10" stroke="${color}" stroke-width="1.8"/>
${head}
<g opacity="${a.status === 'failed' ? 0.6 : 1}">
<g class="${isRunning ? 'bob' : ''}">${spriteIn(face, avX + 4, avY + 4, AV - 8, AV - 8)}</g>
${badge}
${tag}
<text class="t" x="${x0}" y="25" font-family="${FONT}" font-size="14.5" font-weight="700">${xml(title)}</text>
<text class="m" x="${x0}" y="44" font-family="${FONT}" font-size="12.5">${xml(clip(`${typeName(a.type)} · ${modelName(a.model)}`, Math.max(8, Math.floor((right - 14 - x0 - stats.length * 6.3 - 14) / 6.6))))}</text>
<text class="m" x="${right - 14}" y="44" text-anchor="end" font-family="${FONT}" font-size="12" font-variant-numeric="tabular-nums">${xml(stats)}</text>
${icon}
<text x="${x0 + 18}" y="72.5" font-family="${FONT}" font-size="13" font-weight="600" fill="${color}">${xml(step)}</text>
${lines.map((t, j) => `<text class="ln" x="${x0}" y="${91 + j * 15}" font-family="${FONT}" font-size="12">${xml(clip(t, Math.floor((right - x0) / 6.6)))}</text>`).join('')}
${segments || `<rect class="k" x="${x0}" y="${CARD_H - 15}" width="${right - x0}" height="4" rx="2"/>
<rect class="fi${i}" x="${x0}" y="${CARD_H - 15}" width="${fill}" height="4" rx="2" fill="${color}"/>
${isRunning && fill > 6 ? paw(x0 + fill, CARD_H - 21, 0.8, color, 0.9) : ''}`}
${status}
</g>
</svg>`
}

// What a subagent is doing, from its tool call, in a few words.
const describeCall = (tool: string, input: Record<string, unknown>): string | null => {
  const s = (k: string): string => (typeof input[k] === 'string' ? (input[k] as string) : '')
  const base = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p
  switch (tool) {
    case 'Read':
      return `Reading ${base(s('file_path'))}`
    case 'Write':
      return `Writing ${base(s('file_path'))}`
    case 'Edit':
    case 'MultiEdit':
      return `Editing ${base(s('file_path'))}`
    case 'Grep':
    case 'Glob':
      return `Searching files for ${clip(s('pattern'), 28)}`
    case 'WebSearch':
      return `Searching "${clip(s('query'), 32)}"`
    case 'WebFetch': {
      const m = /^https?:\/\/([^/]+)/.exec(s('url'))
      return `Reading ${m?.[1] ?? 'a web page'}`
    }
    case 'Bash':
      return s('description') ? clip(s('description'), 48) : 'Running a command'
    case 'Skill':
      return `Reading the ${s('skill').replace(/^.*:/, '')} skill`
    default:
      return tool.startsWith('mcp__') || tool === 'ToolSearch' ? null : `Using ${tool}`
  }
}

// ---------------------------------------------------------------------------
// The demo: a fake task with five fake agents, so the animation can be seen
// without starting real work. [title, type, step notes, activity lines]

const DEMO_AGENTS: ReadonlyArray<[string, string, string[], string[]]> = [
  ['Thumbnails', 'demo-general-purpose', ['Collecting references', 'Sketching layouts', 'Drawing 3 thumbnail ideas', 'Picking the best'],
    ['Reading the thumbnail style guide', 'Looking at 5 top thumbnails', 'Sketching 3 layouts', 'Comparing contrast']],
  ['Research', 'demo-Explore', ['Finding sources', 'Reading threads', 'Pulling transcripts', 'Writing research.md', 'Checking facts'],
    ['Searching "Claude tips 2026"', 'Reading r/ClaudeAI threads', 'Pulling 12 transcripts', 'Writing research.md']],
  ['Pre-outline', 'demo-general-purpose', ['Reading research', 'Listing angles', 'Ranking 10 angles', 'Writing outline'],
    ['Reading the pre-outline format', 'Reading research.md', 'Listing 10 angles', 'Scoring each angle']],
  ['Motion graphics', 'demo-general-purpose', ['Reading the brief', 'Listing 8 scenes', 'Timing scenes', 'Exporting'],
    ['Reading the motion graphics skill', 'Listing 8 scenes', 'Timing the intro']],
  ['Script', 'demo-general-purpose', ['Reading the voice guide', 'Reading pre-outline.md', 'Drafting', 'Tightening', 'Final pass'],
    ["Reading the voice guide", 'Reading pre-outline.md', 'Drafting the hook', 'Cutting filler']],
]
// ---------------------------------------------------------------------------

export const register: Register = on => {
  let openedFor = ''
  let demo: { cancel: () => void } | null = null

  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.tool.register({
      name: 'progress',
      description:
        'Show the overall task in the animated progress bar above the prompt. Call it after planning (title, total), ' +
        'each time a step finishes (done, note) and once at the end with finished: true. Fields left out keep their value. ' +
        'Main session only; subagents report with `step`.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short name of the whole task, 2-4 words.' },
          total: { type: 'integer', minimum: 0, description: 'Number of planned steps.' },
          done: { type: 'integer', minimum: 0, description: 'Steps finished so far.' },
          note: { type: 'string', description: 'The step in progress, a few words.' },
          finished: { type: 'boolean', description: 'True once the whole task is done.' },
        },
      },
    })
    await $.tool.register({
      name: 'step',
      description:
        'For subagents: report progress on your own task to the agents panel. Right after reading the brief, call it with ' +
        '`total` (your plan in 3-8 steps) and `done: 0`; call it again as each step finishes. Cheap and silent: it only draws a bar.',
      inputSchema: {
        type: 'object',
        properties: {
          done: { type: 'integer', minimum: 0, description: 'Steps finished so far.' },
          total: { type: 'integer', minimum: 1, description: 'Steps planned; may change if the plan changes.' },
          note: { type: 'string', description: 'The step in progress, a few words.' },
        },
        required: ['done'],
      },
      isDeferred: false,
    })
    await $.command.register({ name: 'progress-panel', description: 'Show or hide the animated agents panel' })
    await $.command.register({ name: 'progress-demo', description: 'Play a demo of the animated progress bar and agents panel' })
    await $.command.register({ name: 'progress-clear', description: 'Clear the progress bar and the agents list' })
    await $.command.register({ name: 'progress-theme', description: 'Change the progress bar look: cat, office or rocket' })

    // The chosen look is kept across sessions.
    const saved = await $.store.get('theme').catch(() => undefined)
    await update($, theme, () => (isTheme(saved) ? saved : 'cat'))

    // Ticks the clocks shown on the band and panel while something runs.
    $.clock.every(1000, () => {
      void (async () => {
        const f = await read($, flow)
        const list = await read($, agents)
        if (!(f && !f.isFinished) && !list.some(a => a.status === 'running')) return
        const at = await $.clock.now()
        await update($, now, () => at)
      })()
    })
    return started
  })

  // Ask the main model to report progress on multi-step work.
  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    if (!e.tools.includes(TOOL)) return composed
    return { sections: [...composed.sections, { id: `${PLUGIN}:guide`, text: GUIDE, scope: 'session' as const }] }
  })

  on('command.run', { command: 'progress-panel' }, async $ => {
    const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
    if (isOpen) {
      await $.ui.close({ id: PANE })
      return { text: 'Agents panel closed.' }
    }
    await update($, now, () => Date.now())
    await $.ui.open({ id: PANE, title: PANE_TITLE })
    return { text: 'Agents panel opened.' }
  })

  on('command.run', { command: 'progress-theme' }, async ($, e) => {
    const current = await read($, theme)
    const asked = (e.args ?? '').trim().toLowerCase()
    // No argument: step to the next look.
    const next: Theme = asked
      ? (isTheme(asked) ? asked : (current as Theme))
      : (THEMES[(THEMES.indexOf(current as Theme) + 1) % THEMES.length] ?? 'cat')
    if (asked && !isTheme(asked)) return { text: `Unknown theme "${asked}". Choose: ${THEMES.join(', ')}.` }
    await update($, theme, () => next)
    await $.store.set('theme', next)
    const shown = await read($, flow)
    if (!shown) {
      const at = await $.clock.now()
      await update($, flow, () => ({ title: 'Theme preview', total: 5, done: 3, note: next, isFinished: false, startedAt: at }))
    }
    return { text: `Progress bar look: ${next}. (Options: ${THEMES.join(', ')}; /progress-clear hides the preview.)` }
  })

  on('command.run', { command: 'progress-clear' }, async $ => {
    demo?.cancel()
    demo = null
    await update($, flow, () => null)
    await update($, agents, list => list.filter(a => a.status === 'running' && !a.type.startsWith('demo-')))
    return { text: 'Progress cleared.' }
  })

  on('command.run', { command: 'progress-demo' }, async $ => {
    demo?.cancel()
    const start = await $.clock.now()
    await update($, flow, () => ({ title: 'Launch kit', total: DEMO_AGENTS.length, done: 0, note: '', isFinished: false, startedAt: start }))
    await update($, agents, () =>
      DEMO_AGENTS.map(([description, type, notes, lines], i) => ({
        id: `demo-${i}`,
        type,
        description,
        model: 'claude-opus-5-5',
        status: 'running' as const,
        startedAt: start,
        contextTokens: 8000,
        tokens: 8000,
        stepDone: i % 3,
        stepTotal: notes.length,
        stepNote: notes[i % 3],
        recent: lines.slice(0, (i % 3) + 1).reverse().slice(0, 2),
      })),
    )
    await update($, now, () => start)
    openedFor = 'demo'
    await $.ui.open({ id: PANE, title: PANE_TITLE })

    let tick = 0
    demo = $.clock.every(1100, () => {
      void (async () => {
        tick += 1
        const at = await $.clock.now()
        const list = await update($, agents, prev => {
          const running = prev.filter(a => a.status === 'running' && a.type.startsWith('demo-'))
          const pick = running[tick % Math.max(1, running.length)]
          return prev.map(a => {
            if (!pick || a.id !== pick.id) return a
            const done = (a.stepDone ?? 0) + 1
            const spec = DEMO_AGENTS[Number(a.id.slice(5))]
            const notes = spec?.[2] ?? []
            const lines = spec?.[3] ?? []
            const total = a.stepTotal ?? 1
            const isDone = done >= total
            const line = lines[done % Math.max(1, lines.length)] ?? 'Working'
            return {
              ...a,
              stepDone: Math.min(done, total),
              stepNote: isDone ? undefined : notes[done],
              recent: [line, ...(a.recent ?? [])].slice(0, 2),
              tokens: a.tokens + 6000 + (tick % 5) * 1500,
              contextTokens: a.contextTokens + 5000,
              ...(isDone ? { status: 'done' as const, endedAt: at } : {}),
            }
          })
        })
        const finished = list.filter(a => a.type.startsWith('demo-') && a.status === 'done').length
        const current = list.find(a => a.type.startsWith('demo-') && a.status === 'running')
        const isAllDone = finished >= DEMO_AGENTS.length
        await update($, flow, f =>
          f ? { ...f, done: finished, note: current?.description ?? '', isFinished: isAllDone } : f,
        )
        await update($, now, () => at)
        if (isAllDone) {
          demo?.cancel()
          demo = null
          $.ui.toast('Demo finished — run /progress-clear to hide the bar')
        }
      })()
    })
    return { text: 'Demo started: watch the bar above the prompt and the Agents panel.' }
  })

  // The main session's overall progress.
  on('tool.call', { tool: TOOL }, async ($, e) => {
    if (e.agentId) return { result: 'ignored: subagents report with step' }
    const input = e as unknown as { title?: string; total?: number; done?: number; note?: string; finished?: boolean }
    demo?.cancel()
    demo = null
    const at = await $.clock.now()
    const prev = await read($, flow)
    const isNew = !prev || prev.isFinished || (input.title !== undefined && input.title.trim() !== prev.title)
    if (isNew) await update($, agents, list => list.filter(a => a.status === 'running' && !a.type.startsWith('demo-')))
    const next = await update($, flow, p => {
      const base: Flow = !isNew && p ? p : { title: 'Working', total: 0, done: 0, note: '', isFinished: false, startedAt: at }
      const total = input.total !== undefined ? clamp(Math.round(input.total), 0, 500) : base.total
      const done = input.done !== undefined ? clamp(Math.round(input.done), 0, Math.max(total, 0) || 500) : base.done
      return {
        ...base,
        title: input.title?.trim() ? clip(input.title.trim(), 60) : base.title,
        total,
        done,
        note: input.note !== undefined ? clip(input.note.trim(), 40) : base.note,
        isFinished: input.finished ?? base.isFinished,
      }
    })
    await update($, now, () => at)
    return { result: next ? `ok: ${pillLabel(next)}` : 'ok' }
  })

  // A subagent's own steps: the call runs in its loop, so agentId names it.
  on('tool.call', { tool: STEP_TOOL }, async ($, e) => {
    const input = e as unknown as { done?: number; total?: number; note?: string }
    const agentId = e.agentId
    if (!agentId) return { result: 'ignored: only subagents report steps' }
    let matched = false
    await update($, agents, list =>
      list.map(a => {
        if (a.agentId !== agentId) return a
        matched = true
        const total = clamp(Math.round(input.total ?? a.stepTotal ?? 0), 0, 50)
        const done = clamp(Math.round(input.done ?? a.stepDone ?? 0), 0, total || 50)
        return { ...a, stepTotal: total, stepDone: done, stepNote: input.note?.trim() ? clip(input.note.trim(), 40) : undefined }
      }),
    )
    return { result: matched ? 'ok' : 'ok (no panel row for this agent)' }
  })

  // A subagent's tool calls become the two activity lines on its card.
  on('tool.call', async ($, e, next) => {
    const agentId = e.agentId
    const line = agentId ? describeCall(e.tool, e as unknown as Record<string, unknown>) : null
    if (agentId && line) {
      // Drawing only: a failed write never holds up the agent's tool call.
      await update($, agents, list =>
        list.map(a => (a.agentId !== agentId ? a : { ...a, recent: [line, ...(a.recent ?? []).filter(l => l !== line)].slice(0, 2) })),
      ).catch(() => undefined)
    }
    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const brief = e.prompt.includes(STEP_TOOL) ? e : { ...e, prompt: e.prompt + STEP_BRIEF }
    const started = await next(brief)
    if (started.deny !== undefined) return started
    const at = await $.clock.now()
    const run: AgentRun = {
      id: started.agentId ?? e.tool_use_id,
      agentId: started.agentId,
      type: e.subagentType || 'agent',
      description: e.description,
      model: started.model,
      status: 'running',
      startedAt: at,
      contextTokens: 0,
      tokens: 0,
    }
    await update($, agents, list => [...list.filter(a => a.id !== run.id && !a.type.startsWith('demo-')), run].slice(-100))
    await update($, now, () => at)
    const f = await read($, flow)
    const key = f && !f.isFinished ? f.title : 'agents'
    if (openedFor !== key) {
      openedFor = key
      await $.ui.open({ id: PANE, title: PANE_TITLE })
    }
    return started
  })

  // Each model request of a subagent: live context and tokens.
  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    const agentId = e.agentId
    const usage = result.usage
    if (!agentId || !usage) return result
    const seen =
      (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.output_tokens || 0)
    await update($, agents, list =>
      list.map(a =>
        a.agentId !== agentId
          ? a
          : { ...a, model: usage.model || a.model, contextTokens: seen, tokens: a.tokens + seen },
      ),
    )
    return result
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      const at = await $.clock.now()
      await update($, agents, list =>
        list.map(a =>
          a.agentId !== e.agentId
            ? a
            : { ...a, status: e.reason === 'answer' ? ('done' as const) : ('failed' as const), endedAt: at },
        ),
      )
      await update($, now, () => at)
    }
    return next(e)
  })

  // ---- The panel
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const list = await read($, agents)
    const f = await read($, flow)
    const at = Math.max(await read($, now), ...list.map(a => a.startedAt), f?.startedAt ?? 0)
    const ordered = [...list.filter(a => a.status === 'running'), ...list.filter(a => a.status !== 'running').reverse()]

    if (e.surface !== 'terminal' && 'Svg' in ui) {
      const { Svg, Button } = ui
      const W = clamp((e.props.bodyColumns || 40) * 8 - 8, 240, 900)
      const running = ordered.filter(a => a.status === 'running')
      const finished = ordered.filter(a => a.status !== 'running')
      // Each agent keeps its cat: the order it started in picks the outfit.
      const byStart = [...list].sort((x, y) => x.startedAt - y.startedAt || x.id.localeCompare(y.id))
      const catOf = (a: AgentRun): Costume => COSTUMES[byStart.indexOf(a) % COSTUMES.length] ?? COSTUMES[0]!
      const card = (a: AgentRun, i: number) => (
        <Svg
          key={a.id}
          source={agentSvg(W, a, at, catOf(a), i)}
          alt={`${a.description}: ${a.status}${a.stepTotal ? `, step ${a.stepDone ?? 0} of ${a.stepTotal}` : ''}${a.recent?.[0] ? `, ${a.recent[0]}` : ''}`}
          width={W}
          height={CARD_H}
        />
      )
      return (
        <Box flexDirection="column" gap={1}>
          <Box flexDirection="row" justifyContent="flex-end">
            <Button key="pp-hide" label="Hide" onPress={() => $.ui.close({ id: PANE })} />
          </Box>
          <Svg source={headerSvg(W, list, at)} alt={`${list.length} cats on the job`} width={W} height={HEAD_H} />
          {ordered.length === 0 && <Text dimColor>No cats working yet. Try /progress-demo.</Text>}
          {running.length > 0 && (
            <Svg key="sec-run" source={sectionSvg(W, `Running · ${running.length}`, '#16A34A', RUNNER_ART, true)} alt={`Running: ${running.length}`} width={W} height={SECTION_H} />
          )}
          {running.map(card)}
          {finished.length > 0 && (
            <Svg key="sec-done" source={sectionSvg(W, `Finished · ${finished.length}`, '#8A8A8F', SLEEPER_ART)} alt={`Finished: ${finished.length}`} width={W} height={SECTION_H} />
          )}
          {finished.map((a, i) => card(a, running.length + i))}
        </Box>
      )
    }

    // Terminal: the same in text rows.
    const cols = Math.max(24, e.props.bodyColumns || 40)
    const barW = clamp(cols - 24, 6, 24)
    const spin = SPIN[Math.floor(at / 1000) % SPIN.length]
    return (
      <Box flexDirection="column">
        <Text bold wrap="truncate-end">
          {f ? f.title : 'No task yet'}
        </Text>
        <Text dimColor>
          {fmtTokens(list.reduce((n, a) => n + a.tokens, 0))} tokens · {list.length} agents
        </Text>
        {ordered.length === 0 && <Text dimColor>No agents yet. Try /progress-demo.</Text>}
        {ordered.map(a => {
          const color = a.status === 'failed' ? FAIL : typeColor(a.type)
          const r = stepRatio(a)
          return (
            <Box key={a.id} flexDirection="column" marginTop={1}>
              <Text wrap="truncate-end">
                <Text color={color}>{a.status === 'running' ? spin : a.status === 'done' ? '✓' : '✗'} </Text>
                <Text bold>{a.description || typeName(a.type)}</Text>
              </Text>
              <Text dimColor wrap="truncate-end">
                {'  '}
                {typeName(a.type)} · {modelName(a.model)} · {fmtTime(elapsed(a, at))}
              </Text>
              <Text wrap="truncate-end">
                {'  '}
                <Text color={color}>{textBar(r ?? 0, barW)}</Text>
                <Text dimColor> {a.stepTotal ? `${a.stepDone ?? 0}/${a.stepTotal}${a.stepNote ? ' · ' + a.stepNote : ''}` : ''}</Text>
              </Text>
            </Box>
          )
        })}
      </Box>
    )
  })

  // ---- The band above the prompt
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const f = await read($, flow)
    if (f === null || e.props.hasSurvey) return next(e)
    const drawn = await Promise.resolve(next(e)).catch(() => null)
    const below = drawn && typeof drawn === 'object' && (drawn as { type?: string }).type !== 'engine' ? drawn : null

    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const list = await read($, agents)
    const crew = (
      <Button
        key="pp-agents"
        label={`×${list.length}`}
        plain
        onPress={async () => {
          const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
          if (isOpen) await $.ui.close({ id: PANE })
          else await $.ui.open({ id: PANE, title: PANE_TITLE })
        }}
      />
    )
    const dismiss = (
      <Button
        key="pp-dismiss"
        label="✕"
        plain
        role="dismiss"
        onPress={() => {
          demo?.cancel()
          demo = null
          return update($, flow, () => null)
        }}
      />
    )

    if (e.surface !== 'terminal' && 'Svg' in ui) {
      const { Svg } = ui
      const width = clamp((e.props.bodyColumns || 100) * 8 - 96, 220, 1600)
      const look = await read($, theme)
      const pct = `${Math.round(ratio(f) * 100)}%`
      const band =
        look === 'office'
          ? { source: officeBandSvg(f, width), h: OFFICE_BAND_H, label: officeLabel(f) }
          : look === 'rocket'
            ? { source: rocketBandSvg(f, width), h: ROCKET_BAND_H, label: rocketLabel(f) }
            : { source: bandSvg(f, width), h: BAND_H, label: pillLabel(f) }
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" alignItems="center" gap={1}>
            <Svg source={band.source} alt={`${f.title}: ${band.label}, ${pct}`} width={width} height={band.h} />
            {crew}
            {dismiss}
          </Box>
          {below}
        </Box>
      )
    }

    const at = await read($, now)
    const cols = e.props.bodyColumns
    const titleW = clamp(f.title.length + 3, 8, Math.min(30, Math.floor(cols / 3)))
    const width = clamp(cols - titleW - 34, 6, 40)
    const color = f.isFinished ? DONE : ACCENT
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1}>
          <Box width={titleW} flexShrink={0}>
            <Text color={color}>{f.isFinished ? '✓' : SPIN[Math.floor(at / 1000) % SPIN.length]} </Text>
            <Text wrap="truncate-end">{f.title}</Text>
          </Box>
          <Text color={color}>{textBar(ratio(f), width)}</Text>
          <Text bold>{pillLabel(f)}</Text>
          <Text dimColor>{Math.round(ratio(f) * 100)}%</Text>
          {crew}
          {dismiss}
        </Box>
        {below}
      </Box>
    )
  })
}
