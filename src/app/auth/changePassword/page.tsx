"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/app/firebase/config";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import Link from "next/link";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuthState } from "react-firebase-hooks/auth";

interface PasswordErrors {
  current: string;
  new: string;
  confirm: string;
}

export default function ChangePasswordPage() {
  const [user] = useAuthState(auth);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<PasswordErrors>({
    current: "",
    new: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const router = useRouter();

  const handleRedirect = () => {
    if (user) {
      router.push("/admin");
    } else {
      router.push("/");
    }
  };

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return "Very Weak";
      case 2:
        return "Weak";
      case 3:
        return "Fair";
      case 4:
        return "Good";
      case 5:
        return "Strong";
      default:
        return "";
    }
  };

  const getPasswordStrengthColor = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return "bg-red-500";
      case 2:
        return "bg-orange-500";
      case 3:
        return "bg-yellow-500";
      case 4:
        return "bg-blue-500";
      case 5:
        return "bg-green-500";
      default:
        return "bg-gray-200";
    }
  };

  // Get password requirements
  const getPasswordRequirements = (password: string) => {
    return [
      { text: "At least 8 characters", met: password.length >= 8 },
      { text: "One lowercase letter", met: /[a-z]/.test(password) },
      { text: "One uppercase letter", met: /[A-Z]/.test(password) },
      { text: "One number", met: /[0-9]/.test(password) },
      { text: "One special character", met: /[^A-Za-z0-9]/.test(password) },
    ];
  };

  // Validation function
  const validatePasswords = () => {
    const newErrors: PasswordErrors = {
      current: "",
      new: "",
      confirm: "",
    };
    let isValid = true;

    // Current password validation
    if (!passwords.current) {
      newErrors.current = "Current password is required";
      isValid = false;
    }

    // New password validation
    if (!passwords.new) {
      newErrors.new = "New password is required";
      isValid = false;
    } else if (passwords.new.length < 8) {
      newErrors.new = "Password must be at least 8 characters";
      isValid = false;
    } else if (passwordStrength < 3) {
      newErrors.new =
        "Password is too weak. Include uppercase, lowercase, numbers, and special characters";
      isValid = false;
    }

    // Confirm password validation
    if (!passwords.confirm) {
      newErrors.confirm = "Please confirm your password";
      isValid = false;
    } else if (passwords.new !== passwords.confirm) {
      newErrors.confirm = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (field: keyof typeof passwords, value: string) => {
    setPasswords((prev) => ({ ...prev, [field]: value }));

    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Update password strength for new password field
    if (field === "new") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);

    if (!validatePasswords()) {
      setLoading(false);
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("No authenticated user found. Please login again.");
        router.push("/auth/signin");
        return;
      }

      // Check if user has an email (not signed in with social providers)
      if (!currentUser.email) {
        toast.error("Unable to change password. Please contact support.");
        return;
      }

      // Check if user signed in with email/password (not Google or other providers)
      const providerData = currentUser.providerData;
      const hasEmailProvider = providerData.some(
        (provider) => provider.providerId === "password"
      );

      if (!hasEmailProvider) {
        toast.error(
          "Password change is only available for email/password accounts. You signed in with a different method."
        );
        return;
      }

      // First, reauthenticate the user
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwords.current
      );

      await reauthenticateWithCredential(currentUser, credential);

      // Then update the password
      await updatePassword(currentUser, passwords.new);

      // Clear form
      setPasswords({
        current: "",
        new: "",
        confirm: "",
      });
      setPasswordStrength(0);

      setSuccess(true);
      setMessage("Your password has been changed successfully.");

      // Show success toast
      toast.success("Your password has been changed successfully.", {
        autoClose: 3000,
      });

      // Check authentication state and redirect accordingly
      setTimeout(() => {
        if (user) {
          router.push("/admin"); // Redirect to admin dashboard if logged in
        } else {
          router.push("/"); // Redirect to landing page if not logged in
        }
      }, 2000);
    } catch (error: any) {
      console.error("Password change error:", error);

      // Handle different error types
      switch (error.code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setErrors((prev) => ({
            ...prev,
            current: "Current password is incorrect",
          }));
          toast.error("The current password you entered is incorrect.");
          break;
        case "auth/too-many-requests":
          setMessage("Too many failed attempts. Please try again later.");
          toast.error("Too many failed attempts. Please try again later.");
          break;
        case "auth/user-disabled":
          setMessage("Your account has been disabled. Please contact support.");
          toast.error(
            "Your account has been disabled. Please contact support."
          );
          break;
        case "auth/user-not-found":
          setMessage("User account not found. Please login again.");
          toast.error("User account not found. Please login again.");
          router.push("/auth/signin");
          break;
        case "auth/requires-recent-login":
          setMessage(
            "Please logout and login again, then try changing your password."
          );
          toast.error("Please logout and login again for security reasons.");
          break;
        case "auth/weak-password":
          setErrors((prev) => ({
            ...prev,
            new: "Password is too weak. Please choose a stronger password.",
          }));
          toast.error(
            "Password is too weak. Please choose a stronger password."
          );
          break;
        default:
          setMessage("Failed to change password. Please try again.");
          toast.error("Failed to change password. Please try again.");
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordRequirements = getPasswordRequirements(passwords.new);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/80 backdrop-blur-sm relative z-10">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-indigo-600 flex items-center gap-2 transition-colors duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
              Back to Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Change Password
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Update your password to keep your account secure
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* Current Password */}
            <div className="space-y-2">
              <Label
                htmlFor="currentPassword"
                className="text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <Key className="h-4 w-4 text-gray-500" />
                Current Password
              </Label>
              <div className="relative group">
                <input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwords.current}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("current", e.target.value)
                  }
                  className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-0 ${
                    errors.current
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-200 focus:border-indigo-500 hover:border-gray-300"
                  }`}
                  placeholder="Enter your current password"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("current")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.current && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.current}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-3">
              <Label
                htmlFor="newPassword"
                className="text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <Lock className="h-4 w-4 text-gray-500" />
                New Password
              </Label>
              <div className="relative group">
                <input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwords.new}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("new", e.target.value)
                  }
                  className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-0 ${
                    errors.new
                      ? "border-red-300 focus:border-red-500"
                      : "border-gray-200 focus:border-indigo-500 hover:border-gray-300"
                  }`}
                  placeholder="Enter your new password"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("new")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPasswords.new ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {passwords.new && (
                <div className="space-y-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                          level <= passwordStrength
                            ? getPasswordStrengthColor(passwordStrength)
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs font-medium ${
                        passwordStrength <= 2
                          ? "text-red-600"
                          : passwordStrength <= 3
                          ? "text-yellow-600"
                          : passwordStrength <= 4
                          ? "text-blue-600"
                          : "text-green-600"
                      }`}
                    >
                      Strength: {getPasswordStrengthText(passwordStrength)}
                    </p>
                  </div>

                  {/* Password Requirements */}
                  <div className="bg-gray-50/80 backdrop-blur-sm rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Password Requirements:
                    </p>
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs"
                      >
                        {req.met ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <div className="h-3 w-3 border border-gray-300 rounded-full"></div>
                        )}
                        <span
                          className={
                            req.met ? "text-green-700" : "text-gray-600"
                          }
                        >
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.new && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.new}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <Shield className="h-4 w-4 text-gray-500" />
                Confirm New Password
              </Label>
              <div className="relative group">
                <input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwords.confirm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange("confirm", e.target.value)
                  }
                  className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-0 ${
                    errors.confirm
                      ? "border-red-300 focus:border-red-500"
                      : passwords.confirm && passwords.new === passwords.confirm
                      ? "border-green-300 focus:border-green-500"
                      : "border-gray-200 focus:border-indigo-500 hover:border-gray-300"
                  }`}
                  placeholder="Confirm your new password"
                  required
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirm")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                {passwords.confirm && passwords.new === passwords.confirm && (
                  <CheckCircle className="absolute right-12 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                )}
              </div>
              {errors.confirm && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.confirm}
                </p>
              )}
              {passwords.confirm &&
                passwords.new === passwords.confirm &&
                !errors.confirm && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Passwords match
                  </p>
                )}
            </div>

            <Button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </form>

          {message && (
            <Alert
              variant={success ? "default" : "destructive"}
              className={`mt-4 border-0 ${
                success
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-red-50 text-red-800 border-red-200"
              } rounded-xl backdrop-blur-sm`}
            >
              <div className="flex items-center gap-2">
                {success ? (
                  <CheckCircle className="text-green-600 w-5 h-5" />
                ) : (
                  <AlertCircle className="text-red-500 w-5 h-5" />
                )}
                <AlertDescription className="font-medium">
                  {message}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {success && (
            <Button
              variant="outline"
              className="w-full mt-4 py-3 border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl transition-all duration-200 transform hover:-translate-y-0.5"
              onClick={handleRedirect}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {user ? "Back to Dashboard" : "Back to Home"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
