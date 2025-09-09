"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export function AdminAuthCheck({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          const isAuth = localStorage.getItem("isAuthenticated");
          if (!isAuth) {
            router.replace("/auth/signin");
            return;
          }
        }

        // Get admin data
        const adminQuery = query(
          collection(db, "admin"),
          where("email", "==", user?.email)
        );

        const adminSnapshot = await getDocs(adminQuery);

        if (adminSnapshot.empty) {
          localStorage.removeItem("isAuthenticated");
          router.replace("/auth/signin");
          return;
        }

        const adminData = adminSnapshot.docs[0].data();

        // Check account status
        if (adminData.accountStatus !== "approved") {
          localStorage.removeItem("isAuthenticated");
          router.replace("/auth/signin");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("isAuthenticated");
        router.replace("/auth/signin");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem("adminRole");
      localStorage.removeItem("adminUid");
      localStorage.removeItem("isAuthenticated");
      router.replace("/auth/signin");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return isAuthorized ? children : null;
}
