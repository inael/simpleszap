"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

interface AuthUser {
  sub: string;
  name: string | null;
  email: string | null;
  picture: string | null;
  roles: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  isAdmin: boolean;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoaded: false,
  isSignedIn: false,
  isAdmin: false,
  getToken: async () => null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const tokenCacheRef = useRef<{ token: string | null; expiry: number }>({ token: null, expiry: 0 });

  useEffect(() => {
    fetch("/api/auth/user")
      .then((res) => {
        if (!res.ok) {
          setUser(null);
          setIsLoaded(true);
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        setUser(null);
        setIsLoaded(true);
      });
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    // Return cached token if still valid (cache for 4 minutes)
    if (tokenCacheRef.current.token && Date.now() < tokenCacheRef.current.expiry) {
      return tokenCacheRef.current.token;
    }
    try {
      const res = await fetch("/api/auth/token");
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.token) {
        tokenCacheRef.current = { token: data.token, expiry: Date.now() + 4 * 60 * 1000 };
        return data.token;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const isSignedIn = !!user;
  const isAdmin = user?.roles?.includes("admin") ?? false;

  return (
    <AuthContext.Provider value={{ user, isLoaded, isSignedIn, isAdmin, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
