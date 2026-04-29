"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
  Github,
  BookOpen,
  Package,
  Lock,
  Phone,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Separator } from "@/components/ui/separator";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Instâncias",
    icon: Smartphone,
    href: "/dashboard/instances",
    color: "text-violet-500",
  },
  {
    label: "Mensagens",
    icon: MessageSquare,
    href: "/dashboard/messages",
    color: "text-pink-700",
  },
  {
    label: "Contatos",
    icon: Users,
    href: "/dashboard/contacts",
    color: "text-blue-600",
  },
  {
    label: "Templates",
    icon: HelpCircle,
    href: "/dashboard/templates",
    color: "text-indigo-600",
  },
  {
    label: "Webhooks",
    icon: Siren,
    href: "/dashboard/webhooks",
    color: "text-red-600",
  },
  {
    label: "Campanhas",
    icon: HelpCircle,
    href: "/dashboard/campaigns",
    color: "text-fuchsia-600",
  },
  {
    label: "Envio em massa (config)",
    icon: SlidersHorizontal,
    href: "/dashboard/campaigns/settings",
    color: "text-teal-500",
  },
  {
    label: "Chaves de API",
    icon: Key,
    href: "/dashboard/api-keys",
    color: "text-orange-700",
  },
  {
    label: "Assinatura",
    icon: CreditCard,
    href: "/dashboard/subscription",
    color: "text-emerald-500",
  },
  {
    label: "Segurança",
    icon: Lock,
    href: "/dashboard/security",
    color: "text-slate-300",
  },
  {
    label: "Configurações",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || "https://github.com/inael/simpleszap";
const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/inael/simpleszap";
const postmanUrl = process.env.NEXT_PUBLIC_POSTMAN_URL || docsUrl;
const waNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511999999999";

const helpLinks = [
  { label: "WhatsApp", href: `https://wa.me/${waNumber}`, icon: Phone },
  { label: "Github", href: githubUrl, icon: Github },
  { label: "Documentação", href: docsUrl, icon: BookOpen },
  { label: "Postman Collection", href: postmanUrl, icon: Package },
];

const adminRoutes = [
  {
    label: "Painel Admin",
    icon: Shield,
    href: "/dashboard/admin",
    color: "text-red-500",
  },
  {
    label: "Planos",
    icon: FileBarChart,
    href: "/dashboard/admin/plans",
    color: "text-red-400",
  },
  {
    label: "Usuários",
    icon: Users,
    href: "/dashboard/admin/users",
    color: "text-red-400",
  },
  {
    label: "Cupons",
    icon: Ticket,
    href: "/dashboard/admin/coupons",
    color: "text-red-400",
  },
  {
    label: "Logs de Auditoria",
    icon: ScrollText,
    href: "/dashboard/admin/audit-logs",
    color: "text-red-400",
  },
  {
    label: "Config. Sistema",
    icon: Wrench,
    href: "/dashboard/admin/settings",
    color: "text-red-400",
  },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const showAdmin = isAdmin || pathname.startsWith("/dashboard/admin");

  const handleSignOut = () => {
    window.location.href = "/api/logto/sign-out";
  };

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
      <div className="px-3 py-2 flex-1 overflow-y-auto">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14">
          <div className="relative w-8 h-8 mr-4 shrink-0">
            <Image
              src="/icon-simpleszap.svg"
              alt="SimplesZap"
              width={32}
              height={32}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold">SimplesZap</h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => {
            const isActive = route.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(route.href);
            return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                isActive ? "text-white bg-white/10" : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
            );
          })}
        </div>
        <Separator className="my-4 bg-zinc-700" />
        <p className="text-xs text-zinc-500 uppercase tracking-wider px-3 mb-2">
          Ajuda
        </p>
        <div className="space-y-1">
          {helpLinks.map((item) => (
            <a
              key={item.href + item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition text-zinc-400"
            >
              <item.icon className="h-5 w-5 mr-3 text-zinc-400 group-hover:text-white" />
              {item.label}
            </a>
          ))}
        </div>

        {showAdmin && (
          <>
            <Separator className="my-4 bg-zinc-700" />
            <p className="text-xs text-zinc-500 uppercase tracking-wider px-3 mb-2">
              Administração
            </p>
            <div className="space-y-1">
              {adminRoutes.map((route) => {
                const isActive = route.href === "/dashboard/admin"
                  ? pathname === "/dashboard/admin"
                  : pathname.startsWith(route.href);
                return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                    isActive ? "text-white bg-white/10" : "text-zinc-400"
                  )}
                >
                  <div className="flex items-center flex-1">
                    <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                    {route.label}
                  </div>
                </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="px-3 py-2">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/10"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sair
        </Button>
      </div>
    </div>
  );
};
