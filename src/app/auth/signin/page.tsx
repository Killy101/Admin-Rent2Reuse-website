"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/app/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  addDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";
import { Mail, Lock, AlertCircle, Loader2, User } from "lucide-react";
import Link from "next/link";
import { debounce } from "lodash";

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface AdminData {
  email: string;
  uid: string;
  name: string;
  lastLogin?: string;
  username?: string;
  accountStatus?: string;
  adminRole?: string;
}

interface UserLog {
  lastLogin: string;
  lastLogout: string | null;
}

export default function SignInPage({ className }: React.ComponentProps<"div">) {
  const [loading, setLoading] = useState({
    page: true,
    auth: false,
    submit: false,
  });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showProhibitedModal, setShowProhibitedModal] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 1500);

    const handleBeforeUnload = () => {
      setPageLoading(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const validateIdentifier = (value: string): boolean => {
    if (value.includes("@")) {
      return validateEmail(value);
    }
    return /^[a-zA-Z0-9_]{3,}$/.test(value);
  };

  const debouncedValidateIdentifier = debounce((value: string) => {
    if (value && !validateIdentifier(value)) {
      setError("Please enter a valid username or email");
    } else {
      setError("");
    }
  }, 500);

  // Function to create or update user logs
  // Function to create or update user logs
  const createOrUpdateUserLog = async (uid: string, email: string) => {
    try {
      const now = new Date();
      const newLogEntry: UserLog = {
        lastLogin: now.toISOString(),
        lastLogout: null,
      };

      // Check if userLogs document exists for this user
      const userLogsQuery = query(
        collection(db, "userLogs"),
        where("uid", "==", uid)
      );
      const userLogsSnapshot = await getDocs(userLogsQuery);

      if (userLogsSnapshot.empty) {
        // Create new userLogs document
        await addDoc(collection(db, "userLogs"), {
          uid: uid,
          email: email,
          adminRole: "",
          loginLogs: [newLogEntry],
          createdAt: now,
          updatedAt: now,
        });
        console.log("Created new userLogs document");
      } else {
        // Update existing userLogs document
        const userLogDoc = userLogsSnapshot.docs[0];
        const userLogData = userLogDoc.data();
        const loginLogs = userLogData.loginLogs || [];

        // ✅ Check for active session
        const activeIndex = loginLogs.findIndex(
          (log: any) => log.lastLogout === null
        );

        if (activeIndex !== -1) {
          // Update the existing active session
          loginLogs[activeIndex].lastLogin = now.toISOString();
        } else {
          // Add a new session
          loginLogs.push(newLogEntry);
        }

        await updateDoc(userLogDoc.ref, {
          loginLogs,
          updatedAt: now,
        });
        console.log("Updated existing userLogs document (no duplicates)");
      }

      // Also update the admin collection with just the lastLogin timestamp
      const adminQuery = query(
        collection(db, "admin"),
        where("uid", "==", uid)
      );
      const adminSnapshot = await getDocs(adminQuery);

      if (!adminSnapshot.empty) {
        const adminDoc = adminSnapshot.docs[0];
        await updateDoc(adminDoc.ref, {
          lastLogin: now,
        });
      }
    } catch (error) {
      console.log("Error creating/updating user log:", error);
      throw error;
    }
  };

  // Single auth state listener with proper admin validation
  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      console.log("Auth state changed:", user ? "User logged in" : "No user");

      if (!user) {
        if (mounted) {
          setLoading((prev) => ({ ...prev, page: false, auth: false }));
        }
        return;
      }

      try {
        setLoading((prev) => ({ ...prev, auth: true }));

        // Comprehensive admin validation
        const adminData = await validateAdminAccount(user.uid, user.email);

        if (!adminData) {
          console.log("Admin validation failed");
          if (mounted) {
            setError("No admin account found or account not approved.");
            await auth.signOut();
            setLoading((prev) => ({ ...prev, page: false, auth: false }));
          }
          return;
        }

        // Create or update user log entry
        await createOrUpdateUserLog(user.uid, user.email!);

        // Store admin data
        localStorage.setItem("adminRole", adminData.adminRole || "");
        localStorage.setItem("adminUid", user.uid);
        localStorage.setItem("isAuthenticated", "true");

        console.log("Admin validation successful, redirecting to dashboard");

        if (mounted) {
          setLoading((prev) => ({ ...prev, page: false, auth: false }));
          // Use replace to prevent back navigation to login
          router.replace("/admin");
        }
      } catch (error) {
        console.log("Error in auth state change:", error);
        if (mounted) {
          setError("Error verifying account. Please try again.");
          await auth.signOut();
          setLoading((prev) => ({ ...prev, page: false, auth: false }));
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  // Comprehensive admin account validation
  const validateAdminAccount = async (
    uid: string,
    email: string | null
  ): Promise<AdminData | null> => {
    if (!uid || !email) return null;

    try {
      let adminQuery = query(collection(db, "admin"), where("uid", "==", uid));
      let adminSnapshot = await getDocs(adminQuery);

      if (adminSnapshot.empty) {
        adminQuery = query(
          collection(db, "admin"),
          where("email", "==", email)
        );
        adminSnapshot = await getDocs(adminQuery);
      }

      if (adminSnapshot.empty) return null;

      const adminDoc = adminSnapshot.docs[0];
      const adminData = adminDoc.data();

      if (adminData.accountStatus !== "approved") {
        throw new Error(`Account is ${adminData.accountStatus}`);
      }

      return {
        email: adminData.email,
        uid: uid,
        name: `${adminData.firstname || ""} ${adminData.lastname || ""}`.trim(),
        username: adminData.username,
        accountStatus: adminData.accountStatus,
        adminRole: adminData.adminRole,
        lastLogin: new Date().toISOString(),
      };
    } catch (error) {
      console.log("Error validating admin account:", error);
      throw error;
    }
  };

  // Enhanced admin existence check
  const checkAdminExists = async (
    identifier: string
  ): Promise<{ exists: boolean; adminData?: any }> => {
    try {
      const isEmail = identifier.includes("@");
      let adminQuery;

      if (isEmail) {
        adminQuery = query(
          collection(db, "admin"),
          where("email", "==", identifier.trim().toLowerCase())
        );
      } else {
        adminQuery = query(
          collection(db, "admin"),
          where("username", "==", identifier.trim())
        );
      }

      const adminSnapshot = await getDocs(adminQuery);

      if (adminSnapshot.empty) {
        return { exists: false };
      }

      const adminData = adminSnapshot.docs[0].data();
      return { exists: true, adminData };
    } catch (error) {
      console.log("Error checking admin existence:", error);
      return { exists: false };
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, submit: true }));
    setError("");

    try {
      // Validate inputs
      if (!identifier.trim() || !password.trim()) {
        setError("Please enter both username/email and password");
        return;
      }

      if (!validateIdentifier(identifier)) {
        setError("Please enter a valid username or email address");
        return;
      }

      if (loginAttempts >= 5) {
        setError("Too many login attempts. Please try again later.");
        return;
      }

      // Check if admin exists in Firestore
      const { exists, adminData } = await checkAdminExists(identifier);

      if (!exists) {
        setError("No admin account found with this username/email");
        setLoginAttempts((prev) => prev + 1);
        return;
      }

      // Check account status before attempting login
      if (adminData.accountStatus !== "approved") {
        setError(
          `Account is ${adminData.accountStatus}. Please contact administrator.`
        );
        return;
      }

      console.log("Attempting Firebase authentication...");

      // Attempt Firebase Auth signin with email
      const userCredential = await signInWithEmailAndPassword(
        auth,
        adminData.email,
        password
      );

      console.log("Firebase authentication successful");

      // The auth state change listener will handle the redirect
      // So we don't need to manually redirect here
    } catch (authError: any) {
      // console.log("Authentication error:", authError);
      setLoginAttempts((prev) => prev + 1);

      // Handle specific Firebase auth errors
      if (
        authError.code === "auth/wrong-password" ||
        authError.code === "auth/invalid-credential"
      ) {
        setError("Invalid password");
      } else if (authError.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (authError.code === "auth/user-not-found") {
        setError("No account found with this email");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  if (loading.page || loading.auth || pageLoading) {
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
        <p className="text-lg font-medium text-gray-600 mt-4">
          {pageLoading ? "Loading R2R..." : "Authenticating..."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn(" flex flex-col mt-35", className)}>
      {/* Main Content */}
      <div className=" flex items-center justify-center">
        {showProhibitedModal && (
          <div className="fixed flex items-center justify-center bg-black/50">
            <div className="relative bg-white p-6 rounded-2xl shadow-lg text-center z-10 max-w-md mx-4">
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

        <Card className="w-full max-w-5xl  overflow-hidden shadow-2xl border-0 bg-white">
          <CardContent className="grid p-0 md:grid-cols-2 ">
            {/* Left Side - Form */}
            <div className="md:p-12 min-h-[650px] flex flex-col  justify-center items-center">
              <form onSubmit={handleSignIn} className="space-y-6 h-full w-full">
                {/* Logo and Header */}
                <div className="text-center space-y-6 mb-8 mt-4">
                  <Image
                    src="/assets/logo.png"
                    alt="Logo"
                    width={180}
                    height={60}
                    className="object-contain text-center mx-auto"
                    priority
                  />
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Login</h1>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-5">
                  {/* Email/Username Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="identifier"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email Address or Username
                    </Label>
                    <div className="relative">
                      <Input
                        id="identifier"
                        type="text"
                        placeholder="Enter your email address or username"
                        value={identifier}
                        onChange={(e) => {
                          setIdentifier(e.target.value);
                          debouncedValidateIdentifier(e.target.value);
                        }}
                        className="pl-10 h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
                        required
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-medium text-gray-700"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <PasswordInput
                        id="password"
                        value={password}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPassword(e.target.value)
                        }
                        className="pl-10 h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
                        placeholder="Enter your password"
                        required
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <Link
                      href="/auth/forgotPassword"
                      className="inline-block text-sm text-green-600 hover:text-green-700 hover:underline mt-1"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                  disabled={loading.submit}
                >
                  {loading.submit ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </div>

            {/* Right Side - Administrative Access */}
            <div className="hidden md:block relative bg-gradient-to-br from-green-500 to-green-600 p-10">
              <div className="relative z-10 text-white space-y-6 h-full flex flex-col justify-center">
                <div className="space-y-4 text-center">
                  <h2 className="text-2xl font-bold">Admin Portal</h2>
                  <p className="text-green-100 text-base">
                    Secure login portal for authorized administrators
                  </p>
                </div>
                <Image
                  src="/assets/loginCard.png"
                  alt="Login"
                  width={300}
                  height={300}
                  className="mx-auto"
                />
              </div>

              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,white_0%,transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,white_0%,transparent_50%)]"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
