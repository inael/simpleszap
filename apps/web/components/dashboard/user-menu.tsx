"use client";

import Link from "next/link";
import {
  Settings,
  CreditCard,
  LifeBuoy,
  BookOpen,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.simpleszap.com";
const waNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "5511999999999";

export function UserMenu() {
  const { user } = useAuth();

  const handleSignOut = () => {
    window.location.href = "/api/logto/sign-out";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full px-1 py-0.5 outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
        {user?.picture ? (
          <img src={user.picture} alt="Avatar" className="h-8 w-8 rounded-full" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
            {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">
            {user?.name || "Minha conta"}
          </span>
          {user?.email && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings" className="cursor-pointer">
            <Settings className="text-muted-foreground" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/subscription" className="cursor-pointer">
            <CreditCard className="text-muted-foreground" />
            Assinatura
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <LifeBuoy className="text-muted-foreground" />
            Central de Ajuda
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <BookOpen className="text-muted-foreground" />
            Documentação
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="text-red-600" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
