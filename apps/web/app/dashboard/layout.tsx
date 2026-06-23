"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "simpleszap_sidebar_collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  // Antes da hidratação, renderiza expandido (matches SSR) pra evitar flicker visível.
  const isCollapsed = hydrated && collapsed;

  return (
    <div className="h-full relative">
      <div
        className={cn(
          "hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900 transition-[width] duration-200",
          isCollapsed ? "md:w-20" : "md:w-72"
        )}
      >
        <Sidebar collapsed={isCollapsed} onToggle={toggle} />
      </div>
      <main
        className={cn(
          "transition-[padding-left] duration-200",
          isCollapsed ? "md:pl-20" : "md:pl-72"
        )}
      >
        <Header />
        <div className="p-8 pt-0">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
