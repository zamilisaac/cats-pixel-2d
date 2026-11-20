// rocket-band.ts: the original look for the progress band above the prompt.
// A purple striped bar with a shimmer and a pixel space shuttle whose flame
// flickers. Taken unchanged from pixel-progress before the cat edition.

export type RocketFlow = {
  title: string
  total: number
  done: number
  note: string
  isFinished: boolean
}

export const ROCKET_BAND_H = 34

const ACCENT = '#8B7CF6'
const DONE = '#22C55E'
const FONT = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'

const xml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const clip = (s: string, n: number): string => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s)
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))
const ratio = (f: RocketFlow): number => (f.isFinished ? 1 : f.total > 0 ? clamp(f.done / f.total, 0, 1) : 0)

const pixels = (rows: readonly string[], pal: Record<string, string>, cell: number, x: number, y: number): string => {
  const out: string[] = []
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c] ?? '.'
      const fill = pal[ch]
      if (ch === '.' || !fill) continue
      out.push(`<rect class="p${ch}" x="${x + c * cell}" y="${y + r * cell}" width="${cell + 0.4}" height="${cell + 0.4}" fill="${fill}" shape-rendering="crispEdges"/>`)
    }
  })
  return out.join('')
}

// A pixel space shuttle pointing right: `D` outline, `W`/`S` white hull and
// its shade, `R`/`r` red engine and nose, `B` blue trim, `b` cockpit glass,
// `G` engine nozzle; `y`/`o`/`F` are the exhaust flame (core to tip).
const ROCKET = [
  '.......DRRD.............',
  '.......DWBRRD...........',
  '.......DWWWBRRD.........',
  '..Fo....GDDDDDDDDDDDD...',
  '.Foyyo.GGrRRWWWWWWbbRD..',
  'FoyyyyoGGrRRWWWWWWWWWRRB',
  '.Foyyo.GGrRRSSSSSSSSRRD.',
  '..Fo....GDDDDDDDDDDDD...',
  '.......DSSSBRRD.........',
  '.......DSBRRD...........',
  '.......DRRD.............',
]

const CSS = `
.t{fill:#1f1f1f}.m{fill:#77777a}.k{fill:#e9e8ef}
@media (prefers-color-scheme: dark){.t{fill:#ededf0}.m{fill:#9a9aa2}.k{fill:#2a2a30}}
.stripes{animation:mv .7s linear infinite}
@keyframes mv{from{transform:translateX(0)}to{transform:translateX(12px)}}
.glow{animation:gl 1.2s ease-in-out infinite}
@keyframes gl{50%{opacity:.25}}
.live{animation:gl 1.4s ease-in-out infinite}
.bob{animation:bob .6s steps(1) infinite}
@keyframes bob{50%{transform:translateY(1px)}}
.py,.po,.pF{animation:fl .2s steps(1) infinite}
.po{animation-delay:-.1s}.pF{animation-duration:.3s}
@keyframes fl{50%{opacity:.45}}
.spark{animation:tw 1.6s ease-in-out infinite}.spark2{animation:tw 1.6s ease-in-out infinite -.8s}
@keyframes tw{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1)}}
.spark,.spark2{transform-box:fill-box;transform-origin:50% 50%}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
`

const barSvg = (id: string, x: number, y: number, w: number, h: number, r: number, color: string, isMoving: boolean): string => {
  const fill = Math.round(w * r)
  const stripes: string[] = []
  for (let sx = -24; sx < fill + 24; sx += 12) {
    stripes.push(`<rect x="${sx}" y="-2" width="5" height="${h + 4}" transform="skewX(-28)"/>`)
  }
  const sweep = `@keyframes sh${id}{from{transform:translateX(-50px)}to{transform:translateX(${fill + 50}px)}}.sh${id}{animation:sh${id} ${isMoving ? 2 : 4}s ease-in-out infinite}`
  return `<style>${sweep}</style>
<defs>
<clipPath id="c${id}"><rect width="${w}" height="${h}" rx="${h / 2}"/></clipPath>
<clipPath id="f${id}"><rect width="${fill}" height="${h}" rx="${h / 2}"/></clipPath>
<linearGradient id="g${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<g transform="translate(${x},${y})">
<rect class="k" width="${w}" height="${h}" rx="${h / 2}"/>
<g clip-path="url(#c${id})">
<rect width="${fill}" height="${h}" fill="${color}"/>
<g clip-path="url(#f${id})">
${isMoving ? `<g class="stripes" fill="#fff" opacity=".18">${stripes.join('')}</g>` : ''}
<rect class="sh${id}" width="50" height="${h}" fill="url(#g${id})"/>
</g>
</g>
${fill > h && isMoving ? `<circle class="glow" cx="${fill - h / 2}" cy="${h / 2}" r="${h / 2}" fill="#fff" opacity=".45"/>` : ''}
</g>`
}

export const rocketLabel = (f: RocketFlow): string => {
  if (f.isFinished) return 'Done!'
  const base = f.total > 0 ? `Tasks ${f.done}/${f.total}` : 'Working'
  return f.note ? `${base} · ${clip(f.note, 18)}` : base
}

export const rocketBandSvg = (f: RocketFlow, W: number): string => {
  const H = ROCKET_BAND_H
  const color = f.isFinished ? DONE : ACCENT
  const title = clip(f.title || 'Working', 22)
  const titleW = 22 + title.length * 7.4
  const CELL = 3
  const ROCKET_W = (ROCKET[0]?.length ?? 24) * CELL
  const percentW = 42
  const barX = titleW + 8
  const barW = Math.max(60, W - barX - percentW - ROCKET_W - 18)
  const barH = 20
  const r = ratio(f)
  const label = rocketLabel(f)
  const pillW = Math.round(20 + label.length * 6.4)
  const fillW = Math.round(barW * r)
  const pillX = barX + clamp(fillW - pillW, 0, barW - pillW)
  const percent = `${Math.round(r * 100)}%`
  const rocketX = W - ROCKET_W - 4
  const rocketY = (H - ROCKET.length * CELL) / 2
  const flame: Record<string, string> = f.isFinished ? {} : { y: '#FFE27A', o: '#FF9F1C', F: '#FF5A1F' }
  const rocketPal = {
    D: '#2A2440', W: '#F4F6FB', S: '#B8C2D6', R: '#E0383E', r: '#A4232C',
    B: '#3B82F6', b: '#9FD8FF', G: '#6B7280', ...flame,
  }
  const sparks = f.isFinished
    ? `<path class="spark" d="M${rocketX - 4} 6 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" fill="#FFD54A"/>
<path class="spark2" d="M${rocketX + ROCKET_W - 2} ${H - 12} l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill="#FFD54A"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<style>${CSS}</style>
<circle class="${f.isFinished ? '' : 'live'}" cx="7" cy="${H / 2}" r="4.5" fill="${color}"/>
<text class="t" x="18" y="${H / 2 + 4.5}" font-family="${FONT}" font-size="13" font-weight="600">${xml(title)}</text>
${barSvg('rk', barX, (H - barH) / 2, barW, barH, r, color, !f.isFinished)}
<g transform="translate(${pillX},${(H - barH) / 2})">
<rect width="${pillW}" height="${barH}" rx="${barH / 2}" fill="${color}"/>
<text x="${pillW / 2}" y="${barH / 2 + 4}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="700" fill="#fff">${xml(label)}</text>
</g>
<text class="m" x="${rocketX - 8}" y="${H / 2 + 4.5}" text-anchor="end" font-family="${FONT}" font-size="12.5" font-variant-numeric="tabular-nums">${percent}</text>
<g class="${f.isFinished ? '' : 'bob'}">${pixels(ROCKET, rocketPal, CELL, rocketX, rocketY)}</g>
${sparks}
</svg>`
}
