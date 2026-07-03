export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-ink/6 via-ink/12 to-ink/6
        bg-[length:200%_100%] animate-shimmer ${className}`}
    />
  )
}
