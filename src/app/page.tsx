"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/app/firebase/config";
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  CheckCircle,
  Star,
  Menu,
  X,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import SignIn from "@/app/auth/signin/page";
import SignInPage from "@/app/auth/signin/page";

export default function LoginPage() {
  const [checkingAuth, setCheckingAuth] = useState(true); // State to track if auth check is in progress
  const [accountExists, setAccountExists] = useState(false); // State to track if account exists
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Add a small delay before redirecting to the admin page
        setTimeout(() => {
          router.push("/admin");
          setAccountExists(true); // Set accountExists to true if user exists
          setCheckingAuth(false); // Set checkingAuth to false after auth check is complete
        }, 1000); // 1000ms delay
      } else {
        // Add a small delay before showing the login form

        setAccountExists(false); // Reset accountExists state
        setCheckingAuth(false); // Set checkingAuth to false after auth check is complete
        setTimeout(() => {
          setCheckingAuth(false);
        }, 1000); // 1000ms delay
      }

      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, [router]);

  if (checkingAuth && !accountExists) {
    // Show the login form if no user is authenticated
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="relative">
          <Image
            src="/assets/logo.png"
            alt="Logo"
            width={250}
            height={100}
            className="mx-auto mb-6 object-contain"
            priority
          />
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
        <p className="text-lg font-medium text-gray-600 mt-4">Loading R2R...</p>
      </div>
    );
  }

  return <SignInPage />;
}
