import { Inbox } from 'lucide-react'

type Props = {
  title?: string
  description?: string
  icon?: React.ElementType
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="text-[15px] font-semibold text-foreground">
        {title ?? 'Aucune donnée'}
      </p>
      {description && (
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}