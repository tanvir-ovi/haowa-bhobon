export default function Logo({ size = 44 }: { size?: number }) {
  return <img src="/logo.svg" alt="Haowa Bhobon" width={size} height={size} className="drop-shadow-md" />
}
