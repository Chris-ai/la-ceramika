export function ActionWheel({ count }: { count: number }) {
  return (
    <svg
      className="action-wheel"
      viewBox="0 0 50 50"
      role="img"
      aria-label={`${count} z 3 dostępnych ruchów`}
    >
      {[0, 1, 2].map((slot) => (
        <circle
          key={slot}
          cx="25"
          cy="25"
          r="18"
          fill="none"
          stroke={slot < count ? '#4ac697' : '#e5ded7'}
          strokeWidth="9"
          strokeDasharray="34.7 78.4"
          strokeDashoffset={-slot * 37.7}
          transform="rotate(-90 25 25)"
        />
      ))}
    </svg>
  )
}
