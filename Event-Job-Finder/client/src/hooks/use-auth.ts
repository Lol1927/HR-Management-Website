import { useState, useEffect } from "react";
import { getIdToken, clearTokens, getLoginUrl, getLogoutUrl } from "@/lib/cognito";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
}

function parseJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
}

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setIsLoggedIn(getIdToken() !== null);
  }, []);

  const login = () => {
    window.location.href = getLoginUrl();
  };

  const logout = () => {
    clearTokens();
    window.location.href = getLogoutUrl();
  };

  let user: User | null = null;
  if (isLoggedIn) {
    try {
      const token = getIdToken()!;
      const payload = parseJwtPayload(token);
      user = {
        id: (payload.sub as string) || "",
        email: (payload.email as string) || "",
        firstName: (payload.given_name as string) || (payload.email as string)?.split("@")[0] || "",
        lastName: (payload.family_name as string) || "",
        profileImageUrl: (payload.picture as string) || null,
      };
    } catch {
      user = null;
      clearTokens();
      setIsLoggedIn(false);
    }
  }

  return {
    user: isLoggedIn ? user : null,
    isLoading: isLoggedIn === null,
    isAuthenticated: isLoggedIn === true,
    login,
    logout,
    isLoggingOut: false,
  };
}
