"use client";

import { useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/app/firebase/config";
import { useRouter } from "next/navigation";

export default function SessionTimeoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const TIMEOUT = 30 * 60 * 1000; // 30 minutes

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      signOut(auth).then(() => {
        router.push("/auth/signin"); // redirect after logout
      });
    }, TIMEOUT);
  };

  useEffect(() => {
    const events = ["mousemove", "keydown", "click"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, []);

  return <>{children}</>;
}
