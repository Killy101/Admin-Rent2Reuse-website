"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/app/firebase/config";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail, Loader2, CheckCircle, Key } from "lucide-react";
import Link from "next/link";

interface EmailError {
  current: string;
}

const validateEmail = (email: string) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export default function ForgotPasswordPage() {
  const [errors, setErrors] = useState<EmailError>({
    current: "",
  });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const cooldownEndTime = localStorage.getItem("resetPasswordCooldown");
    if (cooldownEndTime) {
      const remaining = Math.max(0, Number(cooldownEndTime) - Date.now());
      setTimeRemaining(Math.ceil(remaining / 1000));
    }
  }, []);

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("resetPasswordCooldown");
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (!validateEmail(value)) {
      setErrors({ current: "Please enter a valid email address." });
    } else {
      setErrors({ current: "" });
    }
  };
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setErrors({ current: "Please enter a valid email address." });
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/auth/signin`,
        handleCodeInApp: false,
      });

      setSuccess(true);
      setMessage("Password reset link has been sent to your email.");

      const cooldownEndTime = Date.now() + 60000;
      localStorage.setItem("resetPasswordCooldown", cooldownEndTime.toString());
      setTimeRemaining(60);
    } catch (error: any) {
      console.log("Password reset error:", error);
      switch (error.code) {
        case "auth/user-not-found":
          setMessage("No account found with this email address.");
          break;
        case "auth/invalid-email":
          setMessage("Please enter a valid email address.");
          break;
        case "auth/too-many-requests":
          setMessage("Too many attempts. Please try again later.");
          break;
        default:
          setMessage("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 relative overflow-hidden">
      <Card className="w-full max-w-md shadow-xl border-0 p-6">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <img
                src="/assets/logoWhite.png"
                className="w-8 h-8 object-contain"
                alt="Logo"
              />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Reset Password
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Enter your email address and we'll send you a link to reset your
                password.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="Email"
                className="text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <Key className="h-4 w-4 text-gray-500" />
                Enter Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-0 ${
                    errors.current
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-200 focus:border-indigo-500 hover:border-gray-300"
                  }`}
                  required
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              {errors.current && (
                <p className="text-red-500 text-sm mt-1">{errors.current}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full  items-center py-3  text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              disabled={
                !email || !!errors.current || loading || timeRemaining > 0
              }
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Sending...
                </>
              ) : timeRemaining > 0 ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2" />
                  Try again in {timeRemaining}s
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          {message && (
            <Alert
              variant={success ? "default" : "destructive"}
              className="mt-4 flex items-center gap-2"
            >
              {success ? (
                <CheckCircle className="text-green-600 w-4 h-4" />
              ) : (
                <Mail className="text-red-500 w-4 h-4" />
              )}
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => router.push("/auth/signin")}
            >
              Go to Login
            </Button>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/auth/signin"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
