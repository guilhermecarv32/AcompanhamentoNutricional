type Props = {
  className?: string
}

export function ArrowDoodle({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 80"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 52C28 20 58 10 96 18"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M82 8l22 12-18 18"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function HashDoodle({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      <path
        d="M22 10l-6 44M42 10l-6 44M10 24h44M8 40h44"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SparkDoodle({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
    >
      <path
        d="M24 4l3.2 16.8L44 24l-16.8 3.2L24 44l-3.2-16.8L4 24l16.8-3.2L24 4z"
        fill="currentColor"
      />
    </svg>
  )
}

export function StampDoodle({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden
    >
      <circle
        cx="80"
        cy="80"
        r="70"
        stroke="currentColor"
        strokeWidth="4"
        strokeDasharray="8 10"
      />
      <circle cx="80" cy="80" r="54" stroke="currentColor" strokeWidth="3" />
    </svg>
  )
}
