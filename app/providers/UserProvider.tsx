"use client";

import { createContext, useContext } from "react";

interface User {
  email: string;
  name?: string;
}

const UserContext = createContext<User | null>(null);

export function ClientUserProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
  <UserContext.Provider value={user}>{children}</UserContext.Provider>
  );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a ClientUserProvider");
    }
    return context;
}
