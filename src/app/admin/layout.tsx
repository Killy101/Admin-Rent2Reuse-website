"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase/config";
import Sidebar from "@/components/dashboard/Sidebar";
import Image from "next/image";

import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, loading] = useAuthState(auth);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !loading && !user) {
      router.push("/");
    }
  }, [user, loading, isClient, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Image
          src="/assets/logo.png"
          alt="Logo"
          width={270}
          height={48}
          className="mb-4"
        />
        <p className="text-lg font-medium text-secondary">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex bg-white text-gray-900">
      {/* Sidebar */}
      <Sidebar currentPath={pathname} />

      {/* Main Content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
