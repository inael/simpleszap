"use client";

import Link from "next/link";
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
  LogOut
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";

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
    label: "Configurações",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14">
          <div className="relative w-8 h-8 mr-4">
            {/* Logo placeholder - replace with Image if available */}
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center font-bold text-white">
              S
            </div>
          </div>
          <h1 className="text-2xl font-bold">SimplesZap</h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400"
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <Button 
          onClick={() => signOut()}
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
