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
  Receipt,
  TrendingUp,
  BarChart2,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Shirt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetClose, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useMyPermissions } from '@/hooks/use-permissions'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  iconColor: string
  module?: string
}

type NavGroup = {
  label: string
  icon: React.ElementType
  iconColor: string
  children: NavItem[]
}

const NAV: (NavItem | NavGroup)[] = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard, iconColor: 'text-sky-600 group-data-[active=true]:text-white dark:text-sky-400', module: 'dashboard' },
  { href: '/articles',    label: 'Articles',     icon: Package,         iconColor: 'text-rose-600 group-data-[active=true]:text-white dark:text-rose-400', module: 'articles' },
  { href: '/stock',       label: 'Stock',        icon: Warehouse,       iconColor: 'text-amber-600 group-data-[active=true]:text-white dark:text-amber-400', module: 'stock' },
  { href: '/mouvements',  label: 'Mouvements',   icon: ArrowLeftRight,  iconColor: 'text-violet-600 group-data-[active=true]:text-white dark:text-violet-400', module: 'mouvements' },
  { href: '/achats',      label: 'Achats',       icon: ShoppingCart,    iconColor: 'text-teal-600 group-data-[active=true]:text-white dark:text-teal-400', module: 'achats' },
  { href: '/importations',label: 'Importations', icon: FileDown,        iconColor: 'text-blue-600 group-data-[active=true]:text-white dark:text-blue-400', module: 'importations' },
  { href: '/commandes',   label: 'Commandes',    icon: ClipboardList,   iconColor: 'text-pink-600 group-data-[active=true]:text-white dark:text-pink-400', module: 'commandes' },
  { href: '/taches',      label: 'Tâches',       icon: CheckSquare,     iconColor: 'text-emerald-600 group-data-[active=true]:text-white dark:text-emerald-400', module: 'taches' },
  {
    label: 'Partenaires',
    icon: Users,
    iconColor: 'text-cyan-600 group-data-[active=true]:text-white dark:text-cyan-400',
    children: [
      { href: '/partenaires/clients',      label: 'Clients',      icon: UserRound, iconColor: 'text-emerald-700 group-data-[active=true]:text-white dark:text-emerald-400', module: 'clients' },
      { href: '/partenaires/fournisseurs', label: 'Fournisseurs', icon: Truck,     iconColor: 'text-orange-600 group-data-[active=true]:text-white dark:text-orange-400', module: 'fournisseurs' },
      { href: '/partenaires/plateformes',  label: 'Plateformes',  icon: Globe,     iconColor: 'text-indigo-600 group-data-[active=true]:text-white dark:text-indigo-400', module: 'plateformes' },
    ],
  },
  { href: '/utilisateurs', label: 'Utilisateurs', icon: UserCog, iconColor: 'text-slate-700 group-data-[active=true]:text-white dark:text-slate-300', module: 'utilisateurs' },
  { href: '/roles',        label: 'Rôles',        icon: Shield,  iconColor: 'text-purple-600 group-data-[active=true]:text-white dark:text-purple-400', module: 'roles' },
  {
    label: 'Rapports',
    icon: BarChart2,
    iconColor: 'text-blue-600 group-data-[active=true]:text-white dark:text-blue-400',
    children: [
      { href: '/rapports/achats',     label: 'Achats',     icon: Receipt,     iconColor: 'text-cyan-700 group-data-[active=true]:text-white dark:text-cyan-400' },
      { href: '/rapports/analytics',  label: 'Analytics',  icon: TrendingUp,  iconColor: 'text-fuchsia-600 group-data-[active=true]:text-white dark:text-fuchsia-400' },
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
    <ul className="space-y-1">
      {visibleNav.map((item) => {
        if (isGroup(item)) {
          const isOpen   = openGroups[item.label] ?? false
          const isActive = item.children.some((c) => pathname.startsWith(c.href))
          return (
            <li key={item.label}>
              <div className="my-2 h-px bg-sidebar-border/80" />
              <button
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[15px] font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
                )}
              >
                <item.icon className={cn('size-4.5 shrink-0', item.iconColor)} />
                <span className="flex-1 text-left">
                  {item.label}
                  {isActive && (
                    <span className="ml-1.5 rounded-full bg-sidebar-primary/10 px-1.5 py-0 text-[11px] font-semibold text-sidebar-accent-foreground">
                      {item.children.filter((c) => pathname.startsWith(c.href)).length} actif
                    </span>
                  )}
                </span>
                {isOpen ? (
                  <ChevronDown className="size-4 text-sidebar-foreground/60" />
                ) : (
                  <ChevronRight className="size-4 text-sidebar-foreground/60" />
                )}
              </button>
              {isOpen && (
                <ul className="ml-3 mt-1 space-y-1 border-l-2 border-sidebar-accent pl-2.5">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <NavLink
                        href={child.href}
                        label={child.label}
                        icon={child.icon}
                        iconColor={child.iconColor}
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
              iconColor={item.iconColor}
              active={pathname === item.href || pathname.startsWith(item.href + '/')}
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
    <aside className="hidden md:flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Shirt className="size-4.5" />
        </span>
        <div className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-bold tracking-tight text-sidebar-foreground">
            IMS · Gestion Textile
          </span>
          <span className="block truncate text-xs text-sidebar-foreground/60">
            Production &amp; Stock
          </span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
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
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-2 text-white hover:bg-white/15 hover:text-white"
        >
          <Menu className="size-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Shirt className="size-4.5" />
            </span>
            <div className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-sidebar-foreground">
                IMS · Gestion Textile
              </span>
              <span className="block text-xs text-sidebar-foreground/60">
                Production &amp; Stock
              </span>
            </div>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <X className="size-4" />
              <span className="sr-only">Fermer</span>
            </Button>
          </SheetClose>
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
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
  iconColor,
  active,
  onNavigate,
}: {
  href: string
  label: string
  icon: React.ElementType
  iconColor: string
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[15px] font-medium transition-colors data-[active=true]:font-semibold',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
      )}
      data-active={active}
    >
      <Icon className={cn('size-4.5 shrink-0 transition-colors', iconColor)} />
      {label}
    </Link>
  )
}