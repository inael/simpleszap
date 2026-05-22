"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Smartphone,
  MessageSquare,
  Users,
  Siren,
  Settings,
  HelpCircle,
  Key,
  CreditCard,
  LogOut,
  Shield,
  FileBarChart,
  ScrollText,
  Wrench,
  SlidersHorizontal,
  BookOpen,
  Package,
  Lock,
  Phone,
  Ticket,
  ChevronDown,
  ChevronRight,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Separator } from "@/components/ui/separator";

type RouteItem = {
  label: string;
  icon: any;
  href: string;
  color?: string;
};

const routes: RouteItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard", color: "text-sky-500" },
  { label: "Instâncias", icon: Smartphone, href: "/dashboard/instances", color: "text-violet-500" },
  { label: "Mensagens", icon: MessageSquare, href: "/dashboard/messages", color: "text-pink-700" },
  { label: "Contatos", icon: Users, href: "/dashboard/contacts", color: "text-blue-600" },
  { label: "Webhooks", icon: Siren, href: "/dashboard/webhooks", color: "text-red-600" },
  { label: "Campanhas", icon: HelpCircle, href: "/dashboard/campaigns", color: "text-fuchsia-600" },
  { label: "Assinatura", icon: CreditCard, href: "/dashboard/subscription", color: "text-emerald-500" },
];

const settingsSubRoutes: RouteItem[] = [
  { label: "Perfil", icon: User, href: "/dashboard/settings", color: "text-slate-400" },
  { label: "Chaves de API", icon: Key, href: "/dashboard/api-keys", color: "text-orange-700" },
  { label: "Configurações de envio", icon: SlidersHorizontal, href: "/dashboard/campaigns/settings", color: "text-teal-500" },
  { label: "Segurança", icon: Lock, href: "/dashboard/security", color: "text-slate-300" },
];

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.simpleszap.com";
const waNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511999999999";

type HelpLink = { label: string; href: string; icon: any; external?: boolean; download?: boolean };

const helpLinks: HelpLink[] = [
  { label: "WhatsApp", href: `https://wa.me/${waNumber}`, icon: Phone, external: true },
  { label: "Documentação", href: docsUrl, icon: BookOpen, external: true },
  { label: "Postman Collection", href: "/simpleszap-postman.zip", icon: Package, download: true },
];

const adminRoutes: RouteItem[] = [
  { label: "Painel Admin", icon: Shield, href: "/dashboard/admin", color: "text-red-500" },
  { label: "Planos", icon: FileBarChart, href: "/dashboard/admin/plans", color: "text-red-400" },
  { label: "Usuários", icon: Users, href: "/dashboard/admin/users", color: "text-red-400" },
  { label: "Cupons", icon: Ticket, href: "/dashboard/admin/coupons", color: "text-red-400" },
  { label: "Logs de Auditoria", icon: ScrollText, href: "/dashboard/admin/audit-logs", color: "text-red-400" },
  { label: "Config. Sistema", icon: Wrench, href: "/dashboard/admin/settings", color: "text-red-400" },
];

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

export const Sidebar = ({ collapsed = false, onToggle }: SidebarProps) => {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const showAdmin = isAdmin || pathname.startsWith("/dashboard/admin");

  const settingsActive =
    pathname === "/dashboard/settings" ||
    pathname.startsWith("/dashboard/api-keys") ||
    pathname.startsWith("/dashboard/campaigns/settings") ||
    pathname.startsWith("/dashboard/security");
  const [settingsOpen, setSettingsOpen] = useState(settingsActive);

  const handleSignOut = () => {
    window.location.href = "/api/logto/sign-out";
  };

  const renderRoute = (route: RouteItem) => {
    const isActive =
      route.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(route.href);
    return (
      <Link
        key={route.href}
        href={route.href}
        title={collapsed ? route.label : undefined}
        className={cn(
          "text-sm group flex w-full font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
          collapsed ? "p-3 justify-center" : "p-3 justify-start",
          isActive ? "text-white bg-white/10" : "text-zinc-400"
        )}
      >
        <route.icon className={cn("h-5 w-5 shrink-0", route.color, !collapsed && "mr-3")} />
        {!collapsed && <span>{route.label}</span>}
      </Link>
    );
  };

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
      <div className={cn("flex-1 overflow-y-auto", collapsed ? "px-2" : "px-3 py-2")}>
        {/* Topo: logo + botão toggle */}
        <div
          className={cn(
            "flex items-center mb-10",
            collapsed ? "flex-col gap-3" : "justify-between pl-3 pr-1"
          )}
        >
          <Link
            href="/dashboard"
            className={cn("flex items-center", collapsed ? "justify-center" : "")}
            title={collapsed ? "SimplesZap" : undefined}
          >
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src="/icon-simpleszap.svg"
                alt="SimplesZap"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </div>
            {!collapsed && <h1 className="text-2xl font-bold ml-3">SimplesZap</h1>}
          </Link>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expandir menu" : "Encolher menu"}
              title={collapsed ? "Expandir menu" : "Encolher menu"}
              className="hidden md:inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        <div className="space-y-1">
          {routes.map(renderRoute)}

          {/* Configurações expansível com sub-itens (vira link direto quando collapsed) */}
          <div>
            {collapsed ? (
              <Link
                href="/dashboard/settings"
                title="Configurações"
                className={cn(
                  "text-sm group flex items-center w-full font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition p-3 justify-center",
                  settingsActive ? "text-white bg-white/10" : "text-zinc-400"
                )}
              >
                <Settings className="h-5 w-5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                aria-expanded={settingsOpen ? "true" : "false"}
                className={cn(
                  "text-sm group flex items-center w-full font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition p-3",
                  settingsActive ? "text-white bg-white/10" : "text-zinc-400"
                )}
              >
                <div className="flex items-center flex-1">
                  <Settings className="h-5 w-5 mr-3" />
                  Configurações
                </div>
                {settingsOpen ? (
                  <ChevronDown className="h-4 w-4 opacity-60" />
                ) : (
                  <ChevronRight className="h-4 w-4 opacity-60" />
                )}
              </button>
            )}
            {!collapsed && settingsOpen && (
              <div className="ml-6 mt-1 space-y-1 border-l border-zinc-700 pl-2">
                {settingsSubRoutes.map((sub) => {
                  const isActive =
                    pathname === sub.href ||
                    (sub.href !== "/dashboard/settings" && pathname.startsWith(sub.href));
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        "text-xs group flex items-center p-2 w-full font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-md transition",
                        isActive ? "text-white bg-white/10" : "text-zinc-400"
                      )}
                    >
                      <sub.icon className={cn("h-4 w-4 mr-2", sub.color)} />
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {!collapsed && (
          <>
            <Separator className="my-4 bg-zinc-700" />
            <p className="text-xs text-zinc-500 uppercase tracking-wider px-3 mb-2">
              Ajuda
            </p>
            <div className="space-y-1">
              {helpLinks.map((item) => (
                <a
                  key={item.href + item.label}
                  href={item.href}
                  {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  {...(item.download ? { download: true } : {})}
                  className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition text-zinc-400"
                >
                  <item.icon className="h-5 w-5 mr-3 text-zinc-400 group-hover:text-white" />
                  {item.label}
                </a>
              ))}
            </div>
          </>
        )}

        {!collapsed && showAdmin && (
          <>
            <Separator className="my-4 bg-zinc-700" />
            <p className="text-xs text-zinc-500 uppercase tracking-wider px-3 mb-2">
              Administração
            </p>
            <div className="space-y-1">{adminRoutes.map(renderRoute)}</div>
          </>
        )}

        {collapsed && showAdmin && (
          <>
            <Separator className="my-4 bg-zinc-700" />
            <div className="space-y-1">{adminRoutes.map(renderRoute)}</div>
          </>
        )}
      </div>
      <div className={cn(collapsed ? "px-2 py-2" : "px-3 py-2")}>
        <Button
          onClick={handleSignOut}
          variant="ghost"
          title={collapsed ? "Sair" : undefined}
          className={cn(
            "w-full text-zinc-400 hover:text-white hover:bg-white/10",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && "Sair"}
        </Button>
      </div>
    </div>
  );
};
