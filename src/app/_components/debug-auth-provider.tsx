"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { loggers } from "~/utils/logger";

interface DebugUser {
  id: string;
  name: string;
  email: string;
  image: string;
}

interface DebugAuthContextType {
  debugUser: DebugUser | null;
  isDebugMode: boolean;
  loginAsDebugUser: () => void;
  logoutDebugUser: () => void;
}

const DebugAuthContext = createContext<DebugAuthContextType | null>(null);

export function DebugAuthProvider({ children }: { children: ReactNode }) {
  const [debugUser, setDebugUser] = useState<DebugUser | null>(null);
  const isDebugMode = process.env.NODE_ENV === "development";

  // Load debug user from localStorage on mount
  useEffect(() => {
    if (isDebugMode) {
      const savedDebugUser = localStorage.getItem("debugUser");
      if (savedDebugUser) {        try {
          const parsedUser = JSON.parse(savedDebugUser) as DebugUser;
          setDebugUser(parsedUser);
        } catch (error) {
          loggers.auth.error("Failed to parse debug user from localStorage", {
            error: error instanceof Error ? error.message : String(error),
            savedDebugUser: savedDebugUser.substring(0, 100) + "..." // Truncate for security
          });
          localStorage.removeItem("debugUser");
        }
      }
    }
  }, [isDebugMode]);

  const loginAsDebugUser = () => {
    if (!isDebugMode) return;

    const debugUserData: DebugUser = {
      id: "debug-user-123",
      name: "Debug User",
      email: "debug@example.com",
      image: "https://avatar.vercel.sh/debug",
    };

    // Create debug user in database
    void fetch("/api/debug-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          setDebugUser(debugUserData);
          localStorage.setItem("debugUser", JSON.stringify(debugUserData));
        }      })
      .catch((error) => {
        loggers.auth.error("Failed to create debug user", {
          error: error instanceof Error ? error.message : String(error),
          debugUserId: debugUserData.id
        });
      });
  };

  const logoutDebugUser = () => {
    setDebugUser(null);
    localStorage.removeItem("debugUser");
  };

  return (
    <DebugAuthContext.Provider
      value={{
        debugUser,
        isDebugMode,
        loginAsDebugUser,
        logoutDebugUser,
      }}
    >
      {children}
    </DebugAuthContext.Provider>
  );
}

export function useDebugAuth() {
  const context = useContext(DebugAuthContext);
  if (!context) {
    throw new Error("useDebugAuth must be used within DebugAuthProvider");
  }
  return context;
}
