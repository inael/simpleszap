"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/dashboard/sidebar";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";

export const Header = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex items-center p-4">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 bg-[#111827] text-white border-r-0 w-72">
          <Sidebar />
        </SheetContent>
      </Sheet>
      <div className="flex w-full justify-end gap-x-4 items-center">
        {user && (
          <div className="flex items-center gap-2">
            {user.picture && (
              <img src={user.picture} alt="Avatar" className="w-8 h-8 rounded-full" />
            )}
            <span className="text-sm text-muted-foreground">{user.name || user.email}</span>
          </div>
        )}
      </div>
    </div>
  );
};
