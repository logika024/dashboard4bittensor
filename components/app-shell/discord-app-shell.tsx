"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import {
  HashIcon,
  HomeIcon,
  LogOutIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  WalletIcon,
} from "lucide-react"
import { signOut } from "@/app/login/actions"
import { SubnetIcon } from "@/components/dashboard/subnet-icon"
import { AddSubnetSheet } from "@/components/app-shell/add-subnet-sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SubnetScreenerRow } from "@/lib/taoswap/subnets"
import {
  getSubnetChannel,
  SUBNET_CHANNELS,
  subnetChannelHref,
} from "@/lib/subnet/channels"
import {
  getPortfolioChannel,
  PORTFOLIO_CHANNELS,
  portfolioChannelHref,
} from "@/lib/portfolio/channels"
import { cn } from "@/lib/utils"

/** Discord dark theme palette */
const dc = {
  serverRail: "#121214",
  channelSidebar: "#121214",
  main: "#313338",
  content: "#1a1a1e",
  userPanel: "#232428",
  railIcon: "#313338",
  railIconHover: "#5865f2",
  railAdd: "#23a559",
  textPrimary: "#f2f3f5",
  textMuted: "#b5bac1",
  textFaint: "#949ba4",
  inputBg: "#1e1f22",
  hover: "#35373c",
  active: "#404249",
  border: "#1f2023",
  sidebarBorder: "#222225",
  globalHeader: "#121214",
} as const

const RAIL_ICON_SIZE = "size-10" // 40×40px
const RAIL_ICON_RADIUS = "rounded-[8px]"
const SERVER_RAIL_WIDTH = 72
const CHANNEL_SIDEBAR_WIDTH = 240
const USER_PANEL_HEIGHT = 56
const USER_PANEL_MARGIN = 8
const USER_PANEL_INSET = USER_PANEL_HEIGHT + USER_PANEL_MARGIN * 2
const GLOBAL_HEADER_HEIGHT = 30
const SUBNET_PANEL_RADIUS = 8

export interface AppShellUser {
  displayName: string
  avatarUrl?: string
  initial: string
}

export interface SavedSubnetItem {
  id: string
  netuid: number
  name: string
  logoUrl: string | null
}

interface DiscordAppShellProps {
  user: AppShellUser
  savedSubnets: SavedSubnetItem[]
  allSubnets: SubnetScreenerRow[]
  children: React.ReactNode
}

export function DiscordAppShell({
  user,
  savedSubnets,
  allSubnets,
  children,
}: DiscordAppShellProps) {
  const pathname = usePathname()
  const [addOpen, setAddOpen] = useState(false)
  const [topSearch, setTopSearch] = useState("")

  const isHome = pathname === "/dashboard" || pathname.startsWith("/dashboard?")
  const isPortfolioView = pathname === "/portfolio" || pathname.startsWith("/portfolio/")
  const activeNetuid = useMemo(() => {
    const match = pathname.match(/^\/subnet\/(\d+)/)
    return match ? Number.parseInt(match[1], 10) : null
  }, [pathname])

  const isSubnetView = activeNetuid != null
  const subnetSection = useMemo(() => {
    if (activeNetuid == null) return null
    return getSubnetChannel(pathname, activeNetuid)
  }, [pathname, activeNetuid])

  const portfolioSection = useMemo(() => {
    if (!isPortfolioView) return null
    return getPortfolioChannel(pathname)
  }, [pathname, isPortfolioView])

  const sidebarPanel = useMemo((): "subnet" | "portfolio" | null => {
    if (isSubnetView && activeNetuid != null) return "subnet"
    if (isPortfolioView) return "portfolio"
    return null
  }, [isSubnetView, activeNetuid, isPortfolioView])

  const activeSubnet = useMemo(
    () =>
      savedSubnets.find((s) => s.netuid === activeNetuid) ??
      allSubnets.find((s) => s.netuid === activeNetuid) ??
      null,
    [savedSubnets, allSubnets, activeNetuid],
  )

  const subnetPanelTitle = isSubnetView
    ? activeSubnet?.name ?? `Subnet ${activeNetuid}`
    : null

  const topBarTitle = useMemo(() => {
    if (isHome) return "home"

    if (isPortfolioView && portfolioSection) {
      const channelLabel =
        PORTFOLIO_CHANNELS.find((c) => c.id === portfolioSection)?.label ??
        portfolioSection
      if (portfolioSection === "portfolio") return "portfolio"
      return `portfolio * ${channelLabel}`
    }

    if (isSubnetView && subnetSection && activeNetuid != null) {
      const channelLabel =
        SUBNET_CHANNELS.find((c) => c.id === subnetSection)?.label ??
        subnetSection
      const netuidStr = String(activeNetuid).padStart(3, "0")
      const name = (activeSubnet?.name ?? `Subnet ${activeNetuid}`).toLowerCase()
      const screener = allSubnets.find((s) => s.netuid === activeNetuid)

      if (screener) {
        const price = screener.price.toFixed(6)
        const emission = `${(screener.emission_pct * 100).toFixed(2)}%`
        return `${netuidStr} - ${name} * ${channelLabel} * ${price} * ${emission}`
      }

      return `${netuidStr} - ${name} * ${channelLabel}`
    }

    return "dashboard"
  }, [
    activeNetuid,
    activeSubnet?.name,
    allSubnets,
    isHome,
    isPortfolioView,
    isSubnetView,
    pathname,
    portfolioSection,
    subnetSection,
  ])

  const savedNetuids = useMemo(
    () => new Set(savedSubnets.map((s) => s.netuid)),
    [savedSubnets],
  )

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="flex h-dvh flex-col overflow-hidden"
        style={{ backgroundColor: dc.main }}
      >
        {/* Global header — full width */}
        <header
          className="flex shrink-0 items-center px-3"
          style={{
            height: GLOBAL_HEADER_HEIGHT,
            backgroundColor: dc.globalHeader,
          }}
          aria-label="Application header"
        />

        {/* Main view — sidebar + content */}
        <div
          className="flex min-h-0 flex-1 overflow-hidden"
          style={{ backgroundColor: dc.globalHeader }}
        >
          {/* Left nav — server rail + channel sidebar, user panel spans both */}
          <div
            className="relative flex h-full shrink-0"
            style={{ width: SERVER_RAIL_WIDTH + CHANNEL_SIDEBAR_WIDTH }}
          >
          <aside
            className="flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto py-3"
            style={{
              backgroundColor: dc.serverRail,
              paddingBottom: USER_PANEL_INSET,
            }}
          >
            <ServerRailLink
              href="/dashboard"
              label="Home"
              active={isHome}
              tooltip="Home"
            >
              <HomeIcon className="size-5" />
            </ServerRailLink>

            <div
              className="mx-auto h-0.5 w-8 rounded-full"
              style={{ backgroundColor: dc.hover }}
            />

            {savedSubnets.map((subnet) => (
              <ServerRailLink
                key={subnet.id}
                href={`/subnet/${subnet.netuid}`}
                label={subnet.name}
                active={activeNetuid === subnet.netuid}
                tooltip={subnet.name}
              >
                <SubnetIcon
                  netuid={subnet.netuid}
                  name={subnet.name}
                  logoUrl={subnet.logoUrl}
                  size={RAIL_ICON_SIZE}
                />
              </ServerRailLink>
            ))}

            <ServerRailAdd onClick={() => setAddOpen(true)} />
          </aside>

          <aside
            className="flex h-full w-[240px] shrink-0 flex-col overflow-hidden border-t border-l"
            style={{
              backgroundColor: dc.channelSidebar,
              borderColor: dc.sidebarBorder,
              borderTopLeftRadius: SUBNET_PANEL_RADIUS,
              paddingBottom: USER_PANEL_INSET,
            }}
          >
            {sidebarPanel === "subnet" && activeNetuid != null && subnetSection != null ? (
              <>
                <div
                  className="flex h-11 shrink-0 items-center border-b px-3 shadow-sm"
                  style={{
                    borderColor: dc.sidebarBorder,
                    color: dc.textPrimary,
                    boxShadow: "0 1px 0 rgba(0,0,0,0.2)",
                  }}
                >
                  <span className="truncate text-sm font-semibold">
                    {subnetPanelTitle}
                  </span>
                </div>

                <nav className="flex flex-col gap-px px-1.5 py-1.5">
                  {SUBNET_CHANNELS.map((channel) => (
                    <SubnetNavLink
                      key={channel.id}
                      href={subnetChannelHref(activeNetuid, channel.id)}
                      label={channel.label}
                      active={subnetSection === channel.id}
                    />
                  ))}
                </nav>
              </>
            ) : sidebarPanel === "portfolio" ? (
              <>
                <div
                  className="flex h-11 shrink-0 items-center border-b px-3 shadow-sm"
                  style={{
                    borderColor: dc.sidebarBorder,
                    color: dc.textPrimary,
                    boxShadow: "0 1px 0 rgba(0,0,0,0.2)",
                  }}
                >
                  <span className="truncate text-sm font-semibold">portfolio</span>
                </div>

                <nav className="flex flex-col gap-px px-1.5 py-1.5">
                  {PORTFOLIO_CHANNELS.map((channel) => (
                    <SubnetNavLink
                      key={channel.id}
                      href={portfolioChannelHref(channel.id)}
                      label={channel.label}
                      active={portfolioSection === channel.id}
                    />
                  ))}
                </nav>
              </>
            ) : null}
          </aside>

          <UserPanel user={user} />
        </div>

        {/* Content column — channel top bar + page */}
        <div
          className="flex h-full min-w-0 flex-1 flex-col border-t"
          style={{
            backgroundColor: dc.content,
            borderColor: dc.sidebarBorder,
          }}
        >
          <header
            className="flex h-12 shrink-0 items-center gap-3 border-b px-4"
            style={{
              backgroundColor: dc.content,
              borderColor: dc.sidebarBorder,
            }}
          >
            <HashIcon
              className="size-5 shrink-0"
              style={{ color: dc.textFaint }}
            />
            <span
              className="min-w-0 truncate text-base font-semibold"
              style={{ color: dc.textPrimary }}
            >
              {topBarTitle}
            </span>

            <div className="ml-auto flex max-w-xs flex-1 items-center justify-end">
              <div className="relative w-full max-w-[144px]">
                <input
                  type="search"
                  value={topSearch}
                  onChange={(e) => setTopSearch(e.target.value)}
                  placeholder="Search"
                  className="h-6 w-full rounded-sm pr-2 pl-7 text-xs outline-none focus:ring-1 focus:ring-[#5865f2]/40"
                  style={{
                    backgroundColor: dc.inputBg,
                    color: "#dbdee1",
                  }}
                />
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
                  style={{ color: dc.textFaint }}
                />
              </div>
            </div>
          </header>

          <main
            className="min-h-0 flex-1 overflow-y-auto px-10"
            style={{ backgroundColor: dc.content }}
          >
            {children}
          </main>
        </div>
        </div>

        <AddSubnetSheet
          open={addOpen}
          onOpenChange={setAddOpen}
          allSubnets={allSubnets}
          savedNetuids={savedNetuids}
        />
      </div>
    </TooltipProvider>
  )
}

interface SubnetNavLinkProps {
  href: string
  label: string
  active?: boolean
}

function SubnetNavLink({ href, label, active }: SubnetNavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-1 text-sm transition-colors uppercase",
        !active && "hover:text-[#dbdee1]",
      )}
      style={{
        backgroundColor: active ? dc.active : undefined,
        color: active ? dc.textPrimary : dc.textMuted,
      }}
    >
      <HashIcon className="size-3.5 shrink-0 opacity-70" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

interface ServerRailLinkProps {
  href: string
  label: string
  tooltip: string
  active?: boolean
  children: React.ReactNode
}

function ServerRailLink({
  href,
  label,
  tooltip,
  active,
  children,
}: ServerRailLinkProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn("group relative flex items-center justify-center", RAIL_ICON_SIZE)}
        >
          {active && (
            <span className="absolute -left-3 h-8 w-1 rounded-r-full bg-white" />
          )}
          <span
            className={cn(
              "flex items-center justify-center overflow-hidden transition-colors",
              RAIL_ICON_SIZE,
              RAIL_ICON_RADIUS,
              active
                ? "bg-[#5865f2] text-white"
                : "bg-[#313338] text-[#dbdee1] hover:bg-[#5865f2] hover:text-white",
            )}
          >
            {children}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

function ServerRailAdd({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label="Add subnet"
          className={cn(
            "flex cursor-pointer items-center justify-center transition-colors",
            RAIL_ICON_SIZE,
            RAIL_ICON_RADIUS,
            "bg-[#313338] text-[#23a559] hover:bg-[#23a559] hover:text-white",
          )}
        >
          <PlusIcon className="size-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">Add a subnet</TooltipContent>
    </Tooltip>
  )
}

const USER_PANEL_BG_VIDEO = "/user-panel-background.webm"
const USER_PANEL_BG_GRADIENT =
  "linear-gradient(90deg, rgba(115, 11, 200, 0.1) 0%, rgba(115, 11, 200, 0.4) 100%)"

function UserPanel({ user }: { user: AppShellUser }) {
  return (
    <div
      className="absolute right-2 bottom-2 left-2 z-20 overflow-hidden rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
      style={{
        height: USER_PANEL_HEIGHT,
        backgroundColor: dc.userPanel,
        border: `1px solid ${dc.sidebarBorder}`,
      }}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full object-cover"
      >
        <source src={USER_PANEL_BG_VIDEO} type="video/webm" />
      </video>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: USER_PANEL_BG_GRADIENT }}
      />
      <div className="relative z-10 flex h-full items-center gap-1.5 px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[6px] px-1 py-1 text-left transition-colors hover:bg-white/5"
            >
              <Avatar className="size-8">
                {user.avatarUrl && (
                  <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                )}
                <AvatarFallback className="bg-[#5865f2] text-xs text-white">
                  {user.initial}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: dc.textPrimary }}
                >
                  {user.displayName}
                </p>
                <p className="truncate text-xs" style={{ color: dc.textFaint }}>
                  Online
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/portfolio">
                <WalletIcon className="size-4" />
                Portfolio
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
              <LogOutIcon className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex shrink-0 items-center gap-0.5">
          <Link
            href="/portfolio"
            className="rounded p-1.5 transition-colors hover:text-[#dbdee1]"
            style={{ color: dc.textMuted }}
            aria-label="Portfolio"
          >
            <WalletIcon className="size-5" />
          </Link>
          <button
            type="button"
            className="cursor-pointer rounded p-1.5 transition-colors hover:text-[#dbdee1]"
            style={{ color: dc.textMuted }}
            aria-label="Settings"
          >
            <SettingsIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
