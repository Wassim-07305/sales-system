"use client";

import { createContext, useContext } from "react";
import type { Profile, UserRole } from "@/lib/types/database";

interface UserContextValue {
  userId: string;
  role: UserRole;
  userName: string;
  email: string;
  avatarUrl: string | null;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: UserContextValue;
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  return useContext(UserContext);
}
