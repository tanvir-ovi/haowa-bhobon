import { avatarColor, initials } from '../lib/utils'

export default function Avatar({
  name,
  size = 'md',
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const cls =
    size === 'sm'
      ? 'w-7 h-7 text-[10px]'
      : size === 'lg'
        ? 'w-14 h-14 text-lg'
        : 'w-10 h-10 text-sm'
  return (
    <div
      className={`${cls} shrink-0 rounded-full bg-gradient-to-br ${avatarColor(name)}
        flex items-center justify-center font-extrabold text-white shadow-md ring-2 ring-white`}
      title={name}
    >
      {initials(name)}
    </div>
  )
}
