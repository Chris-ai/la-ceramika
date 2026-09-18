import type { Hex } from '@/entities/game'

export const HEX_RADIUS = 34
export const HEX_TILT = 0.84
const horizontal = Math.sqrt(3) * HEX_RADIUS
const vertical = HEX_RADIUS * 1.5
const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
]

export const hexCenter = (q: number, r: number) => ({
  x: horizontal * (q + r / 2),
  y: vertical * r * HEX_TILT,
})
export const hexVertices = (x: number, y: number) =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2
    return { x: x + (HEX_RADIUS - 2) * Math.cos(angle), y: y + (HEX_RADIUS - 2) * Math.sin(angle) * HEX_TILT }
  })
export const polygonPoints = (corners: { x: number; y: number }[]) =>
  corners.map((corner) => `${corner.x},${corner.y}`).join(' ')
export const hexDepth = (q: number, r: number) => 10 + (Math.abs(q * 13 + r * 7) % 3) * 3
export const shadeColor = (hexColor: string, factor: number) => {
  const channels = [1, 3, 5].map((start) =>
    Math.round(parseInt(hexColor.slice(start, start + 2), 16) * factor),
  )
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}
export const hexKey = (hex: Hex) => `${hex.q},${hex.r}`
export const areAdjacent = (first: Hex, second: Hex) =>
  directions.some(([dq, dr]) => first.q + dq === second.q && first.r + dr === second.r)
