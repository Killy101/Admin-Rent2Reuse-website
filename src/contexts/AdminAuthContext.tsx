"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/app/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

interface AdminAuthContextType {
  isAuthenticated: boolean;
  adminRole: string | null;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  adminRole: null,
  loading: true,
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setIsAuthenticated(false);
        setAdminRole(null);
        setLoading(false);
        return;
      }

      try {
        const adminQuery = query(
          collection(db, "admin"),
          where("email", "==", user.email)
        );
        const adminSnapshot = await getDocs(adminQuery);

        if (!adminSnapshot.empty) {
          const adminData = adminSnapshot.docs[0].data();
          if (adminData.accountStatus === "approved") {
            setIsAuthenticated(true);
            setAdminRole(adminData.adminRole);
          } else {
            setIsAuthenticated(false);
            setAdminRole(null);
          }
        }
      } catch (error) {
        console.log("Error checking admin status:", error);
        setIsAuthenticated(false);
        setAdminRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, adminRole, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
