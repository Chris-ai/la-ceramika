export function TeamAvatar({
  slug,
  color,
  className = 'animal-icon',
}: {
  slug: string
  color: string
  className?: string
}) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        backgroundColor: color,
        maskImage: `url('/team-icons/${slug}.svg')`,
      }}
    />
  )
}
