// office-band.ts: the "Munder Difflin" look for the progress band above the prompt.
// Two office workers at a desk on the left, a jiggling jelly with a stapler in it,
// a mustard fill with sliding stripes, a delivery van that drives along the fill
// trailing loose papers, and a trophy at 100%. Plain SVG, no images.

export type BandFlow = {
  title: string
  total: number
  done: number
  note: string
  isFinished: boolean
}

export const OFFICE_BAND_H = 64

const PIX = `'Press Start 2P','Pixelify Sans',ui-monospace,Consolas,monospace`
const SANS = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif'

const INK = '#2B2118'
const CREAM = '#FBF6EA'
const PAPER = '#F4EBD6'
const SKIN = '#F0C8A0'
const WOOD = '#B9844F'
const WOOD2 = '#8C5C31'
const WOOD3 = '#6B4426'
const WOOD4 = '#3A2414'
const BRICK = '#7A1A2B'
const GREEN = '#788C5D'
const NAVY = '#2F3B52'
const GOLD = '#E3B341'
const GOLD2 = '#C08A1E'
const MUSTARD = '#E9B949'
const MUSTARD2 = '#D49A2A'
const STEEL = '#55514B'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const clip = (s: string, n: number): string => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s)

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

export const officeRatio = (f: BandFlow): number =>
  f.isFinished ? 1 : f.total > 0 ? clamp(f.done / f.total, 0, 1) : 0

export const officeLabel = (f: BandFlow): string => {
  if (f.isFinished) return 'Done! Delivered'
  const base = f.total > 0 ? `Tasks ${f.done}/${f.total}` : 'Working'

  return f.note ? `${base} · ${clip(f.note, 18)}` : base
}

/** Pixel rects on a grid of `u` units from (ox, oy). */
const grid = (ox: number, oy: number, u: number) => (x: number, y: number, w: number, h: number, fill: string, extra = ''): string =>
  `<rect x="${(ox + x * u).toFixed(2)}" y="${(oy + y * u).toFixed(2)}" width="${(w * u).toFixed(2)}" height="${(h * u).toFixed(2)}" fill="${fill}"${extra}/>`

const CSS = `
.t{fill:#3B2A1E}.m{fill:#6B5A4A}
@media (prefers-color-scheme: dark){.t{fill:#F1ECDC}.m{fill:#C9BFA8}}
.stripes{animation:mv .9s linear infinite}@keyframes mv{to{transform:translateX(14px)}}
.bob{animation:bob .9s steps(1) infinite}.bob2{animation:bob .7s steps(1) infinite -.35s}
.drive{animation:bob .26s steps(1) infinite}@keyframes bob{50%{transform:translateY(-1px)}}
.wheel{transform-box:fill-box;transform-origin:50% 50%;animation:rot .45s linear infinite}@keyframes rot{to{transform:rotate(360deg)}}
.jig{transform-box:fill-box;transform-origin:50% 100%;animation:jig 1.8s ease-in-out infinite}
@keyframes jig{0%,100%{transform:scale(1,1)}15%{transform:scale(1.07,.9)}30%{transform:scale(.95,1.06)}45%{transform:scale(1.03,.97)}60%{transform:scale(1,1)}}
.p1,.p2,.p3,.p4{transform-box:fill-box;transform-origin:50% 50%}
.p1{animation:fly 1.9s linear infinite}.p2{animation:fly 1.9s linear infinite -.5s}.p3{animation:fly 1.9s linear infinite -1s}.p4{animation:fly 1.9s linear infinite -1.45s}
@keyframes fly{0%{opacity:0;transform:translate(0,0) rotate(0)}12%{opacity:1}100%{opacity:0;transform:translate(-38px,-9px) rotate(-220deg)}}
.blink{animation:bl 4.2s steps(1) infinite}.blink2{animation:bl 5.1s steps(1) infinite -2s}
@keyframes bl{0%,93%{opacity:0}94%,100%{opacity:1}}
.glow{animation:gl 1.1s ease-in-out infinite}@keyframes gl{50%{opacity:.35}}
.steam{animation:st 2.4s ease-out infinite}.steam2{animation:st 2.4s ease-out infinite -1.2s}
@keyframes st{0%{opacity:0;transform:translateY(2px)}30%{opacity:.85}100%{opacity:0;transform:translateY(-7px)}}
.spark,.spark2,.spark3{transform-box:fill-box;transform-origin:50% 50%}
.spark{animation:tw 1.4s ease-in-out infinite}.spark2{animation:tw 1.4s ease-in-out infinite -.7s}.spark3{animation:tw 1.4s ease-in-out infinite -.35s}
@keyframes tw{0%,100%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1)}}
.wave{transform-box:fill-box;transform-origin:50% 100%;animation:wv .5s ease-in-out infinite alternate}@keyframes wv{to{transform:rotate(-25deg)}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
`

/** A clerk standing beside the desk: cardigan, tie, glasses. 16 by 26 grid. */
const clerk = (x: number, y: number, u: number, isBusy: boolean): string => {
  const p = grid(x, y, u)

  return `<g class="${isBusy ? 'bob' : ''}">` +
    p(4, 0, 8, 3, '#6B4A2E') + p(3, 1, 1, 4, '#6B4A2E') + p(12, 1, 1, 3, '#6B4A2E') +
    p(4, 3, 8, 7, SKIN) +
    p(4, 5, 8, 1, INK) + p(5, 5, 2, 2, '#9EC9E0', ' opacity="0.7"') + p(9, 5, 2, 2, '#9EC9E0', ' opacity="0.7"') +
    p(5, 6, 2, 1, INK) + p(9, 6, 2, 1, INK) +
    `<g class="blink">${p(5, 6, 2, 1, SKIN)}${p(9, 6, 2, 1, SKIN)}</g>` +
    p(6, 8, 4, 1, '#B5536C') +
    p(3, 10, 10, 9, GREEN) + p(6, 10, 4, 2, CREAM) + p(7, 11, 2, 6, BRICK) +
    p(1, 11, 2, 7, GREEN) + p(1, 18, 2, 1, SKIN) +
    `<g class="${isBusy ? 'wave' : ''}">${p(13, 11, 2, 7, GREEN)}${p(13, 18, 2, 1, SKIN)}</g>` +
    p(4, 19, 8, 6, '#4A3F33') + p(7, 21, 2, 4, '#3A3029') +
    p(3, 25, 4, 1, INK) + p(9, 25, 4, 1, INK) +
    '</g>'
}

/** The manager at the desk with a monitor and a mug. 26 by 26 grid. */
const manager = (x: number, y: number, u: number, isBusy: boolean): string => {
  const p = grid(x, y, u)

  return `<g class="${isBusy ? 'bob2' : ''}">` +
    p(9, 2, 10, 3, '#2E2A27') + p(8, 3, 1, 4, '#2E2A27') + p(19, 3, 1, 4, '#2E2A27') +
    p(9, 5, 10, 7, SKIN) +
    p(11, 7, 2, 1, INK) + p(15, 7, 2, 1, INK) +
    `<g class="blink2">${p(11, 7, 2, 1, SKIN)}${p(15, 7, 2, 1, SKIN)}</g>` +
    p(12, 10, 4, 1, '#B5536C') +
    p(7, 12, 14, 6, NAVY) + p(12, 12, 4, 3, CREAM) + p(13, 12, 2, 5, BRICK) +
    '</g>' +
    p(0, 9, 8, 7, '#DDD4BD') + p(1, 10, 6, 5, '#1C2A23') +
    `<g class="${isBusy ? 'glow' : ''}">${p(2, 11, 3, 1, '#8FE3A8')}${p(2, 13, 4, 1, '#8FE3A8')}</g>` +
    p(3, 16, 2, 1, '#B9AF96') +
    p(0, 17, 26, 2, WOOD) + p(0, 17, 26, 1, '#CF9C64') + p(1, 19, 24, 7, WOOD2) +
    p(3, 21, 8, 1, WOOD3) + p(15, 21, 8, 1, WOOD3) + p(6, 22, 2, 1, GOLD) + p(18, 22, 2, 1, GOLD) +
    p(20, 14, 3, 3, CREAM) + p(23, 15, 1, 1, CREAM) + p(20, 14, 3, 1, '#6B3E22') +
    `<g class="steam">${p(21, 11, 1, 2, '#B9AF96')}</g><g class="steam2">${p(22, 10, 1, 2, '#B9AF96')}</g>`
}

/** A jelly mould with a stapler set inside it. 30 by 18 grid. */
const jelly = (x: number, y: number, u: number): string => {
  const p = grid(x, y, u)

  return `<ellipse cx="${(x + 15 * u).toFixed(1)}" cy="${(y + 16.5 * u).toFixed(1)}" rx="${(15 * u).toFixed(1)}" ry="${(2.3 * u).toFixed(1)}" fill="${CREAM}" stroke="#B9AF96" stroke-width="0.8"/>` +
    '<g class="jig">' +
    p(7, 2, 16, 2, '#F2B13D', ' opacity="0.9"') + p(4, 4, 22, 2, '#F2B13D', ' opacity="0.9"') + p(3, 6, 24, 10, '#EFA52F', ' opacity="0.88"') +
    p(9, 9, 13, 3, '#3A3631') + p(9, 8, 10, 1, STEEL) + p(19, 11, 3, 1, '#A3A8AD') + p(10, 12, 12, 1, '#24211E') +
    p(6, 5, 2, 7, '#FFFFFF', ' opacity="0.45"') + p(9, 3, 4, 1, '#FFFFFF', ' opacity="0.5"') +
    '</g>'
}

/** The delivery van. 32 by 19 grid; the logo is drawn in plain units. */
const van = (x: number, y: number, u: number, isMoving: boolean): string => {
  const p = grid(x, y, u)
  const wheel = (gx: number): string => {
    const cx = (x + gx * u).toFixed(1)
    const cy = (y + 17 * u).toFixed(1)

    return `<g class="${isMoving ? 'wheel' : ''}"><circle cx="${cx}" cy="${cy}" r="${(2.7 * u).toFixed(1)}" fill="${INK}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${(1.2 * u).toFixed(1)}" fill="#A3A8AD"/>` +
      `<rect x="${(x + gx * u - 0.4).toFixed(1)}" y="${(y + 17 * u - 2.4 * u).toFixed(1)}" width="0.8" height="${(4.8 * u).toFixed(1)}" fill="#6B6F73"/></g>`
  }
  const lx = x + 4 * u
  const lw = 15 * u

  return `<g class="${isMoving ? 'drive' : ''}">` +
    p(0, 2, 22, 13, '#EFE8D6') + p(0, 2, 22, 1, '#FFFDF7') + p(1, 3, 1, 11, '#D6CDB6') +
    p(22, 6, 9, 9, '#E4DCC6') + p(22, 6, 9, 1, '#F4EEDD') + p(24, 7, 6, 4, '#9EC9E0') + p(25, 7, 2, 4, '#C9E2EF') +
    p(31, 10, 1, 2, '#F2B84B') + p(30, 13, 2, 2, STEEL) + p(22, 12, 2, 1, STEEL) +
    p(3, 4, 17, 9, NAVY) + p(4, 5, 15, 7, '#FFFFFF') +
    `<text x="${(lx + lw / 2).toFixed(1)}" y="${(y + 8.1 * u).toFixed(1)}" text-anchor="middle" font-family="${SANS}" font-size="${(2.9 * u).toFixed(1)}" font-weight="900" fill="${NAVY}">MUNDER</text>` +
    `<text x="${(lx + lw / 2).toFixed(1)}" y="${(y + 11.2 * u).toFixed(1)}" text-anchor="middle" font-family="${SANS}" font-size="${(2.9 * u).toFixed(1)}" font-weight="900" fill="${NAVY}">DIFFLIN</text>` +
    p(0, 15, 32, 2, '#4A443E') +
    wheel(6) + wheel(25) +
    '</g>'
}

/** Loose papers blowing off the back of the van. */
const papers = (x: number, y: number): string =>
  [
    [0, 0, 'p1', -12],
    [-6, 6, 'p2', 18],
    [-2, 11, 'p3', -6],
    [-9, 2, 'p4', 30],
  ]
    .map(([dx, dy, cls, deg]) =>
      `<g class="${cls}"><g transform="rotate(${deg} ${x + Number(dx) + 3} ${y + Number(dy) + 3.5})">` +
      `<rect x="${x + Number(dx)}" y="${y + Number(dy)}" width="6" height="7" fill="${CREAM}" stroke="#9C8F72" stroke-width="0.5"/>` +
      `<rect x="${x + Number(dx) + 1}" y="${y + Number(dy) + 2}" width="4" height="0.6" fill="#9C8F72"/>` +
      `<rect x="${x + Number(dx) + 1}" y="${y + Number(dy) + 4}" width="3" height="0.6" fill="#9C8F72"/></g></g>`,
    )
    .join('')

/** The trophy at the end. 18 by 20 grid. */
const trophy = (x: number, y: number, u: number, isWon: boolean): string => {
  const p = grid(x, y, u)
  let o =
    p(3, 0, 12, 2, '#F6D776') + p(3, 2, 12, 7, GOLD) + p(4, 9, 10, 2, GOLD) + p(6, 11, 6, 1, GOLD2) +
    p(0, 2, 3, 1, GOLD2) + p(0, 3, 1, 4, GOLD2) + p(1, 6, 2, 1, GOLD2) +
    p(15, 2, 3, 1, GOLD2) + p(17, 3, 1, 4, GOLD2) + p(15, 6, 2, 1, GOLD2) +
    p(8, 12, 2, 3, GOLD2) + p(5, 15, 8, 2, WOOD2) + p(4, 17, 10, 3, WOOD3) + p(6, 18, 6, 1, GOLD) +
    p(5, 3, 1, 5, '#FFFFFF', ' opacity="0.6"') + p(7, 3, 1, 2, '#FFFFFF', ' opacity="0.4"')
  if (isWon) {
    const star = (sx: number, sy: number, cls: string, size: number): string =>
      `<text class="${cls}" x="${(x + sx * u).toFixed(1)}" y="${(y + sy * u).toFixed(1)}" font-size="${size}" fill="${GOLD}">✦</text>`
    o += star(-3, 2, 'spark', 9) + star(17, 0, 'spark2', 8) + star(14, 12, 'spark3', 7)
  }

  return o
}

const docIcon = (x: number, y: number): string =>
  `<path d="M${x} ${y} h7 l3 3 v10 h-10 z" fill="${CREAM}" stroke="${NAVY}" stroke-width="1"/>` +
  `<path d="M${x + 7} ${y} v3 h3" fill="none" stroke="${NAVY}" stroke-width="1"/>` +
  `<rect x="${x + 2}" y="${y + 5}" width="6" height="1" fill="${NAVY}"/><rect x="${x + 2}" y="${y + 7.5}" width="6" height="1" fill="${NAVY}"/><rect x="${x + 2}" y="${y + 10}" width="4" height="1" fill="${NAVY}"/>`

const paperclip = (x: number, y: number): string =>
  `<path d="M${x} ${y + 12} l7 -9 a2.6 2.6 0 0 0 -4 -3.2 l-8 10 a1.6 1.6 0 0 0 2.5 2 l6.5 -8" transform="translate(4 0)" fill="none" stroke="#6B6F73" stroke-width="1.4" stroke-linecap="round"/>`

/** The whole band, `W` wide and OFFICE_BAND_H tall. */
export const officeBandSvg = (f: BandFlow, W: number): string => {
  const H = OFFICE_BAND_H
  const isMoving = !f.isFinished
  const r = officeRatio(f)

  // Left: the clerk and the manager at the desk.
  const u = 1.55
  const crew = clerk(1, 22, u, isMoving) + manager(1 + 17 * u, 22, u, isMoving)
  const crewW = 1 + 17 * u + 26 * u

  // Right: the trophy.
  const tu = 1.45
  const trophyW = 18 * tu
  const trophyX = W - trophyW - 4
  const trophyY = 18

  // The bar.
  const barX = Math.round(crewW + 8)
  const barY = 27
  const barH = 22
  const barW = Math.max(120, Math.round(trophyX - barX - 12))

  // The jelly sits at the start. The van's nose and the end of the fill are the
  // same point, and that point moves along the road from just past the jelly
  // (0%) to the end of the bar (100%), so the van never runs ahead of the fill.
  const ju = 1.3
  const jellyW = 30 * ju
  const jellyX = barX + 4
  const jellyY = barY + barH - 17.5 * ju
  const vu = 1.45
  const vanW = 32 * vu
  const vanH = 19 * vu
  const roadStart = Math.round(jellyX - barX + jellyW + 6 + vanW)
  const roadEnd = barW
  const fillW = Math.round(roadStart + (roadEnd - roadStart) * r)
  const vanX = barX + fillW - vanW
  const vanY = barY + barH + 3 - vanH

  // The pill goes between the jelly and the van, else right of the van, else short.
  // The gap left of the van leaves room for the papers blowing off its back.
  const pillH = 15
  const widthOf = (s: string): number => Math.round(20 + s.length * 5.4)
  const leftStart = jellyX + jellyW + 4
  const leftRoom = vanX - 20 - leftStart
  const rightStart = vanX + vanW + 4
  const rightRoom = barX + barW - 4 - rightStart
  const full = officeLabel(f)
  const short = f.isFinished ? 'Done!' : f.total > 0 ? `${f.done}/${f.total}` : '…'
  const label = widthOf(full) <= Math.max(leftRoom, rightRoom) ? full : short
  const pillW = widthOf(label)
  // Centre the pill in whichever gap it fits; it never covers the jelly or the van.
  const pillX = leftRoom >= pillW
    ? leftStart + Math.round((leftRoom - pillW) / 2)
    : rightRoom >= pillW
      ? rightStart + Math.round((rightRoom - pillW) / 2)
      : rightRoom >= leftRoom ? rightStart : leftStart
  const pillY = barY + (barH - pillH) / 2

  // Stripes in the fill.
  const stripes: string[] = []
  for (let sx = -28; sx < fillW + 28; sx += 14) {
    stripes.push(`<rect x="${sx}" y="-2" width="6" height="${barH + 4}" transform="skewX(-30)"/>`)
  }

  const title = clip(f.title || 'Working', 30).toUpperCase()
  const heading = f.isFinished ? `${title}!` : `${title}...`
  const headX = barX + barW / 2
  const headHalf = heading.length * 4.7 + 10
  const percent = `${Math.round(r * 100)}%`
  const pctX = clamp(vanX + vanW / 2, barX + 14, barX + barW - 14)
  const trophyMid = trophyX + trophyW / 2
  const showGoal = !f.isFinished && r < 1 && trophyMid - pctX > 46

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
<style>${CSS}</style>
<defs>
<clipPath id="obc"><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="3"/></clipPath>
<linearGradient id="obf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${MUSTARD}"/><stop offset="1" stop-color="${MUSTARD2}"/></linearGradient>
<linearGradient id="obs" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<style>@keyframes obsh{from{transform:translateX(-50px)}to{transform:translateX(${fillW + 50}px)}}.obsh{animation:obsh ${isMoving ? 2.4 : 4}s ease-in-out infinite}</style>
</defs>
<g shape-rendering="geometricPrecision">${docIcon(headX - headHalf - 8, 3)}${paperclip(headX + headHalf - 2, 3)}</g>
<text class="t" x="${headX}" y="16" text-anchor="middle" font-family="${PIX}" font-size="13" font-weight="800" letter-spacing="1">${esc(heading)}</text>
${crew}
<rect x="${barX - 5}" y="${barY - 5}" width="${barW + 10}" height="${barH + 10}" rx="6" fill="${WOOD4}"/>
<rect x="${barX - 3.5}" y="${barY - 3.5}" width="${barW + 7}" height="${barH + 7}" rx="5" fill="${WOOD3}"/>
<rect x="${barX - 3.5}" y="${barY - 3.5}" width="${barW + 7}" height="1.6" fill="#A07E6E" opacity=".7"/>
<rect x="${barX - 1}" y="${barY - 1}" width="${barW + 2}" height="${barH + 2}" rx="3" fill="${WOOD4}"/>
<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="2" fill="${PAPER}"/>
<g clip-path="url(#obc)">
<rect x="${barX}" y="${barY + 7}" width="${barW}" height="0.7" fill="#D9CCAE"/><rect x="${barX}" y="${barY + 14}" width="${barW}" height="0.7" fill="#D9CCAE"/>
<rect x="${barX}" y="${barY}" width="${fillW}" height="${barH}" fill="url(#obf)"/>
<rect x="${barX}" y="${barY}" width="${fillW}" height="2" fill="#F6D776" opacity=".8"/>
<svg x="${barX}" y="${barY}" width="${fillW}" height="${barH}" overflow="hidden">
${isMoving ? `<g class="stripes" fill="#fff" opacity=".22">${stripes.join('')}</g>` : ''}
<rect class="obsh" x="0" y="0" width="50" height="${barH}" fill="url(#obs)"/>
</svg>
</g>
<g shape-rendering="geometricPrecision">${jelly(jellyX, jellyY, ju)}</g>
<g transform="translate(${pillX},${pillY})" shape-rendering="geometricPrecision">
<rect width="${pillW}" height="${pillH}" rx="7.5" fill="${WOOD4}" opacity=".92"/>
<text x="${pillW / 2}" y="${pillH / 2 + 3.7}" text-anchor="middle" font-family="${SANS}" font-size="10" font-weight="700" fill="${CREAM}">${esc(label)}</text>
</g>
${isMoving ? `<g shape-rendering="geometricPrecision">${papers(vanX - 8, barY + 2)}</g>` : ''}
${van(vanX, vanY, vu, isMoving)}
<text class="m" x="${pctX}" y="${H - 2}" text-anchor="middle" font-family="${PIX}" font-size="10" font-weight="700">${percent}</text>
${showGoal ? `<text class="m" x="${trophyMid}" y="${H - 2}" text-anchor="middle" font-family="${PIX}" font-size="10" font-weight="700">100%</text>` : ''}
${trophy(trophyX, trophyY, tu, f.isFinished)}
</svg>`
}
