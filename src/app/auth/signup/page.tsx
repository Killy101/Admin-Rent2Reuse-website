"use client";

import * as React from "react";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth, db } from "@/app/firebase/config";
import { doc, setDoc } from "firebase/firestore";
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

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,}$/.test(username);
};

interface SignUpPageProps {
  className?: string;
}

export default function SignUpPage({ className }: SignUpPageProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const router = useRouter();

  const validateForm = (): string | null => {
    if (!firstName.trim()) return "First name is required.";
    if (!lastName.trim()) return "Last name is required.";
    if (!birthdate.trim()) return "Birthdate is required.";
    const bd = new Date(birthdate);
    if (isNaN(bd.getTime())) return "Birthdate is invalid.";
    if (bd > new Date()) return "Birthdate cannot be in the future.";
    // ensure user is at least 18 years old
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
      age--;
    }
    if (age < 18) return "You must be at least 18 years old to register.";
    if (!username.trim()) return "Username is required.";
    if (!validateUsername(username))
      return "Username must be at least 3 characters and contain only letters, numbers or underscores.";
    if (!email.trim()) return "Email is required.";
    if (!validateEmail(email)) return "Email is invalid.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // check if email already exists (better UX than waiting for createUser failure)
      const emailToCheck = email.trim().toLowerCase();
      const methods = await fetchSignInMethodsForEmail(auth, emailToCheck);
      if (methods && methods.length > 0) {
        setError("Email is already in use.");
        setLoading(false);
        return;
      }
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );

      // Save additional profile to Firestore under `users/{uid}`
      await setDoc(doc(db, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthdate: birthdate,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
      });

      setSuccess("Account created successfully. Redirecting...");
      setTimeout(() => {
        router.replace("/auth/signin");
      }, 1200);
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already in use.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak.");
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(" flex flex-col mt-12", className)}>
      <div className=" flex items-center justify-center">
        <Card className="w-full max-w-5xl  overflow-hidden shadow-2xl border-0 bg-white">
          <CardContent className="grid p-0 md:grid-cols-2 ">
            <div className="md:p-12 min-h-[650px] flex flex-col  justify-center items-center">
              <form onSubmit={handleSignUp} className="space-y-6 h-full w-full">
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
                    <h1 className="text-2xl font-bold text-gray-900">
                      Create account
                    </h1>
                    <p className="text-sm text-gray-600">
                      Use your email to create an account
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="firstName"
                      className="text-sm font-medium text-gray-700"
                    >
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-12"
                      required
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="lastName"
                      className="text-sm font-medium text-gray-700"
                    >
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="h-12"
                      required
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="birthdate"
                      className="text-sm font-medium text-gray-700"
                    >
                      Birthdate
                    </Label>
                    <Input
                      id="birthdate"
                      type="date"
                      value={birthdate}
                      onChange={(e) => setBirthdate(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="username"
                      className="text-sm font-medium text-gray-700"
                    >
                      Username
                    </Label>
                    <div className="relative">
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        className="pl-10 h-12"
                        required
                      />
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-10 h-12"
                        required
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div>
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
                        placeholder="Create a password"
                        className="pl-10 h-12"
                        required
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
                    {success}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating
                      account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>

                <p className="text-sm text-gray-600 text-center">
                  Already have an account?{" "}
                  <Link
                    href="/auth/signin"
                    className="text-green-600 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            </div>

            <div className="hidden md:block relative bg-gradient-to-br from-green-500 to-green-600 p-10">
              <div className="relative z-10 text-white space-y-6 h-full flex flex-col justify-center">
                <div className="space-y-4 text-center">
                  <h2 className="text-2xl font-bold">Welcome to Rent2Reuse</h2>
                  <p className="text-green-100 text-base">
                    Create an account to manage items and requests
                  </p>
                </div>
                <Image
                  src="/assets/loginCard.png"
                  alt="Welcome"
                  width={300}
                  height={300}
                  className="mx-auto"
                />
              </div>
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
