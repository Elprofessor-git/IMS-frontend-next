'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
  FileDown,
  ClipboardList,
  CheckSquare,
  Users,
  UserRound,
  Truck,
  Globe,
  UserCog,
  Shield,
  BarChart2,
  Receipt,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetClose, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useMyPermissions } from '@/hooks/use-permissions'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  module?: string
}

type NavGroup = {
  label: string
  icon: React.ElementType
  children: NavItem[]
}

const NAV: (NavItem | NavGroup)[] = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard, module: 'dashboard' },
  { href: '/articles',    label: 'Articles',     icon: Package,         module: 'articles' },
  { href: '/stock',       label: 'Stock',        icon: Warehouse,       module: 'stock' },
  { href: '/mouvements',  label: 'Mouvements',   icon: ArrowLeftRight,  module: 'mouvements' },
  { href: '/achats',      label: 'Achats',       icon: ShoppingCart,    module: 'achats' },
  { href: '/importations',label: 'Importations', icon: FileDown,        module: 'importations' },
  { href: '/commandes',   label: 'Commandes',    icon: ClipboardList,   module: 'commandes' },
  { href: '/taches',      label: 'Tâches',       icon: CheckSquare,     module: 'taches' },
  {
    label: 'Partenaires',
    icon: Users,
    children: [
      { href: '/partenaires/clients',      label: 'Clients',      icon: UserRound, module: 'clients' },
      { href: '/partenaires/fournisseurs', label: 'Fournisseurs', icon: Truck,     module: 'fournisseurs' },
      { href: '/partenaires/plateformes',  label: 'Plateformes',  icon: Globe,     module: 'fournisseurs' },
    ],
  },
  { href: '/utilisateurs', label: 'Utilisateurs', icon: UserCog, module: 'utilisateurs' },
  { href: '/roles',        label: 'Rôles',        icon: Shield,  module: 'roles' },
  {
    label: 'Rapports',
    icon: BarChart2,
    children: [
      { href: '/rapports/achats',     label: 'Achats',     icon: Receipt },
      { href: '/rapports/analytics',  label: 'Analytics',  icon: TrendingUp },
    ],
  },
]

function isGroup(item: NavItem | NavGroup): item is NavGroup {
  return 'children' in item
}

// ── Contenu nav partagé (desktop + drawer mobile) ────────────────────────────

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { data: permissions } = useMyPermissions()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Partenaires: pathname.startsWith('/partenaires'),
    Rapports:    pathname.startsWith('/rapports'),
  })

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))

  function canAccess(module?: string): boolean {
    if (!module) return true
    if (!permissions) return true
    return permissions.find((p) => p.module === module)?.canAccess ?? false
  }

  const visibleNav = NAV.map((item) => {
    if (isGroup(item)) {
      const visibleChildren = item.children.filter((c) => canAccess(c.module))
      if (!visibleChildren.length) return null
      return { ...item, children: visibleChildren }
    }
    return canAccess(item.module) ? item : null
  }).filter(Boolean) as (NavItem | NavGroup)[]

  return (
    <ul className="space-y-0.5">
      {visibleNav.map((item) => {
        if (isGroup(item)) {
          const isOpen   = openGroups[item.label] ?? false
          const isActive = item.children.some((c) => pathname.startsWith(c.href))
          return (
            <li key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isOpen ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
              {isOpen && (
                <ul className="ml-6 mt-0.5 space-y-0.5 border-l pl-2">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <NavLink
                        href={child.href}
                        label={child.label}
                        icon={child.icon}
                        active={pathname.startsWith(child.href)}
                        onNavigate={onNavigate}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        }

        return (
          <li key={item.href}>
            <NavLink
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href}
              onNavigate={onNavigate}
            />
          </li>
        )
      })}
    </ul>
  )
}

// ── Desktop : sidebar fixe, masquée sous md ───────────────────────────────────

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-full w-56 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-base font-bold tracking-tight text-sidebar-foreground">
          IMS
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <SidebarNav />
      </nav>
    </aside>
  )
}

// ── Mobile : drawer Sheet, trigger monté dans la Topbar ───────────────────────

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden -ml-2">
          <Menu className="size-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <span className="text-base font-bold tracking-tight text-sidebar-foreground">
            IMS
          </span>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm">
              <X className="size-4" />
              <span className="sr-only">Fermer</span>
            </Button>
          </SheetClose>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </nav>
      </SheetContent>
    </Sheet>
  )
}

// ── Lien de navigation ────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  )
}
