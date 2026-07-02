import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  backHref?: string
  action?: React.ReactNode
}

export function PageHeader({ title, backHref, action }: Props) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {backHref && (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={backHref}>
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
