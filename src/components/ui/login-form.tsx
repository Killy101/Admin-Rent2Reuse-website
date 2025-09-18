"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase/config"; // Import Firestore
import {
  doc,
  getDoc,
  query,
  where,
  collection,
  getDocs,
} from "firebase/firestore"; // Firestore methods
import { signInWithEmailAndPassword } from "firebase/auth";
import { cn } from "@/lib/utils";

export function LoginForm({
  className,

  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProhibitedModal, setShowProhibitedModal] = useState(false); // State for modal
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    // const hasUppercase = /[A-Z]/.test(password);
    // const hasLowercase = /[a-z]/.test(password);
    // const hasNumber = /[0-9]/.test(password);

    if (!minLength) return "Password must be at least 8 characters long.";
    // if (!hasUppercase)
    //   return "Password must contain at least one uppercase letter.";
    // if (!hasLowercase)
    //   return "Password must contain at least one lowercase letter.";
    // if (!hasNumber) return "Password must contain at least one number.";

    return "";
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // First try to authenticate
      const userCredential = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      if (!userCredential.user) {
        setError("Authentication failed");
        return;
      }

      // Then check admin status with the authenticated user
      const usersRef = collection(db, "users");
      const userQuery = query(
        usersRef,
        where("email", "==", trimmedEmail),
        where("role", "==", "admin")
      );

      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        // Sign out if not admin
        await auth.signOut();
        setShowProhibitedModal(true);
        return;
      }

      const userData = userSnapshot.docs[0].data();
      const userId = userSnapshot.docs[0].id;

      // Store user data
      const adminData = {
        email: trimmedEmail,
        uid: userId,
        role: "admin",
        name: userData.firstname
          ? `${userData.firstname} ${userData.lastname}`
          : "Admin",
      };

      localStorage.setItem("adminData", JSON.stringify(adminData));

      // Redirect to admin dashboard
      router.push("/admin");
    } catch (error: any) {
      console.error("Login error:", error);

      // Handle specific error cases
      switch (error.code) {
        case "auth/wrong-password":
          setError("Incorrect password");
          break;
        case "auth/user-not-found":
          setError("No account found with this email");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Please try again later");
          break;
        case "permission-denied":
          setError("You don't have permission to access this area");
          break;
        default:
          setError("Login failed. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Prohibited Modal */}
      {showProhibitedModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="relative bg-white p-6 rounded-2xl shadow-lg text-center z-10">
            <Image
              src="/assets/prohibited.png"
              alt="Access Prohibited"
              width={100}
              height={100}
              className="mx-auto mb-4"
            />
            <h2 className="text-xl font-bold mb-4">Access Prohibited</h2>
            <p className="text-gray-600 mb-4">
              You do not have permission to access the admin panel.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowProhibitedModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={handleSignIn} className="p-8 md:p-10">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-4">
                <Image
                  src="/assets/logo.png"
                  alt="Login Image"
                  width={200}
                  height={380}
                />
                <h1 className="text-2xl text-primary font-bold">Welcome</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your Admin Account
                </p>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <PasswordInput
                  id="current_password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </div>
          </form>

          <div className="flex justify-center items-center bg-gradient-to-r from-primary to-secondary  md:flex">
            <Image
              src="/assets/loginCard.png"
              alt="Login card"
              width={300}
              height={347}
              sizes="(max-width: 600px) 100vw, 300px"
              quality={60}
              priority
              className="object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
