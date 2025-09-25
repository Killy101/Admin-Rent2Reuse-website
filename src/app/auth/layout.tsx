// app/dashboard/layout.jsx
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
(!user) return null;

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Redirect to sign in page if not authenticated */}

      {/* Main Content */}
      <main className="flex-1 ">{children}</main>
    </div>
  );
}
