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
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
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
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const cooldownEndTime = Date.now() + 60000; // 60 seconds
      localStorage.setItem("resetPasswordCooldown", cooldownEndTime.toString());
      setTimeRemaining(60);
    } catch (error: any) {
      console.error("Password reset error:", error);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/auth/signin"
              className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your
            password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!email || loading || timeRemaining > 0}
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
        </CardContent>
      </Card>
    </div>
  );
}
