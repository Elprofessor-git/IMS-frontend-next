import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  description?: string
  backHref?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, backHref, action }: Props) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {backHref && (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={backHref}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
        )}
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}
