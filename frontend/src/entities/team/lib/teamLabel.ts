import { teamColors, teamIcons } from '../config/teamOptions'

export function teamLabel(team: { color: string; avatar: string }) {
  const color = teamColors.find((item) => item.value === team.color.toLowerCase())?.label ?? team.color
  const icon =
    teamIcons.find((item) => item.id === team.avatar || item.slug === team.avatar)?.label ?? 'ikona'
  return `${color}, ${icon}`
}
