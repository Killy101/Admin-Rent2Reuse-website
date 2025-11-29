"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Mail,
  Clock,
  Check,
  X,
  Shield,
  UserPlus,
  AlertCircle,
  Search,
  Filter,
  Bell,
  Calendar,
  Users,
  TrendingUp,
  Eye,
  MoreVertical,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Key,
  Settings,
  LogOut,
  Trash,
  Crown,
  Headphones,
  UserCheck,
  DollarSign,
  FileText,
  Star,
  Phone,
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  orderBy,
  getDocs,
  addDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { db, auth } from "@/app/firebase/config";
import emailjs from "@emailjs/browser";
import { useRouter } from "next/navigation";
import { initializeApp, deleteApp } from "firebase/app";

// Update these with your actual EmailJS credentials
const EMAILJS_SERVICE_ID = "service_enlyh5f";
const EMAILJS_USER_CREDENTIALS_TEMPLATE_ID = "template_sc6c0pg";
const EMAILJS_PUBLIC_KEY = "rxgEeQ-_cN_IjOhEh";

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Role access configuration
const roleAccess: {
  superAdmin: string[];
  admin: string[];
  support: string[];
  manageUsers: string[];
  financialViewer: string[];
  contentManager: string[];
} = {
  superAdmin: ["*"], // Full access to everything

  admin: ["*"], // Full access to everything

  support: [
    "/admin",
    "/admin/user",
    "/admin/support",
    "/admin/reports",
    "/admin/announcements",
    "/admin/subscription/subscriptionsList",
    "/admin/profile",
    "/admin/userLog",
  ],
  manageUsers: [
    "/admin",
    "/admin/manageUsers",
    "/admin/user",
    "/admin/itemList",
    "/admin/transaction",
    "/admin/subscription",
    "/admin/profile",
    "/admin/userLog",
  ],
  financialViewer: [
    "/admin",
    "/admin/transaction",
    "/admin/subscription",
    "/admin/user",
    "/admin/profile",
  ],
  contentManager: [
    "/admin",
    "/admin/itemList",
    "/admin/announcements",
    "/admin/profile",
  ],
};

// Role definitions with enhanced descriptions and permissions
const roleDefinitions = {
  superAdmin: {
    name: "Super Admin",
    description: "Highest-level administrator with unrestricted control over all system features.",
    icon: Crown,
    color: "from-purple-600 to-pink-600",
    bgColor: "from-purple-100 to-pink-100",
    textColor: "text-purple-800",
    permissions: [
      "Full dashboard access",
      "Manage inventory",
      "Manage all user accounts",
      "Manage admin team members",
      "View and manage payments",
      "Manage subscriptions",
      "Handle support tickets",
      "View and manage user reports",
      "Create and edit announcements",
      "View all activity logs",
      "System configuration",
    ],
  },

  admin: {
    name: "Admin",
    description: "General administrator with full access except high-level system configuration.",
    icon: Shield,
    color: "from-indigo-500 to-blue-500",
    bgColor: "from-indigo-100 to-blue-100",
    textColor: "text-indigo-800",
    permissions: [
      "Full dashboard access",
      "Manage inventory",
      "Manage user accounts",
      "Manage admin team members",
      "View payments",
      "Manage subscriptions",
      "Handle support tickets",
      "Manage user reports",
      "Create announcements",
      "View activity logs",
    ],
  },

  support: {
    name: "Support Specialist",
    description: "Focused on addressing customer issues, complaints, and user concerns.",
    icon: Headphones,
    color: "from-blue-500 to-cyan-500",
    bgColor: "from-blue-100 to-cyan-100",
    textColor: "text-blue-800",
    permissions: [
      "Access dashboard insights",
      "Handle support tickets",
      "View user directory",
      "View subscriptions",
      "View announcements",
      "Create support reports",
      "View user reports",
    ],
  },

manageUsers: {
  name: "User Manager",
  description: "Responsible for user onboarding, permissions, and overall user directory management.",
  icon: UserCheck,
  color: "from-green-500 to-emerald-500",
  bgColor: "from-green-100 to-emerald-100",
  textColor: "text-green-800",
  permissions: [
    "Manage user accounts",
    "View dashboard insights",
    "Access user directory",
    "View activity logs",
  ],
},

  financialViewer: {
    name: "Financial Viewer",
    description: "Monitors transactions and financial performance without modification access.",
    icon: DollarSign,
    color: "from-yellow-500 to-orange-500",
    bgColor: "from-yellow-100 to-orange-100",
    textColor: "text-yellow-800",
    permissions: [
      "View dashboard insights",
      "View payment transactions",
      "View revenue analytics",
      "View subscription activities",
      "Access user directory",
      "Financial reporting",
    ],
  },

  contentManager: {
    name: "Content Manager",
    description: "Controls platform content, inventory listing, and announcement posting.",
    icon: FileText,
    color: "from-indigo-500 to-purple-500",
    bgColor: "from-indigo-100 to-purple-100",
    textColor: "text-indigo-800",
    permissions: [
      "Manage inventory",
      "Moderate platform content",
      "Create and edit announcements",
      "Manage item listings",
      "Handle content-related reports",
      "View dashboard insights",
    ],
  },
};


interface TeamMember {
  id: string;
  uid?: string;
  username?: string;
  email?: string;
  role?: string;
  adminRole?: keyof typeof roleDefinitions;
  accountStatus: "approved" | "deactivated" | "deleted";
  isFirstLogin?: boolean;
  temporaryPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  passwordChangedAt?: string;
  lastLoginAt?: string;
  permissions?: string[];
  profileImageUrl?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
}

// Utility function to generate credentials
const generateCredentials = () => {
  const timestamp = Date.now().toString().slice(-4);
  const randomNum = Math.floor(Math.random() * 999) + 1;
  const username = `admin_${randomNum}${timestamp}`;

  const generatePassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  return {
    username,
    password: generatePassword(),
  };
};

// Enhanced email validation
const validateEmailJSConfig = () => {
  console.log("🔍 Validating EmailJS configuration...");
  const errors = [];

  if (!EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID.trim() === "") {
    errors.push("Service ID is missing or invalid");
  }

  if (
    !EMAILJS_USER_CREDENTIALS_TEMPLATE_ID ||
    EMAILJS_USER_CREDENTIALS_TEMPLATE_ID.trim() === ""
  ) {
    errors.push("Template ID is missing or invalid");
  }

  if (!EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY.trim() === "") {
    errors.push("Public key is missing or invalid");
  }

  return errors;
};

// Enhanced email sending function
const sendEmailNotification = async (
  email: string,
  username: string,
  password: string,
  adminRole: keyof typeof roleDefinitions,
  currentUserName?: string
) => {
  console.log("🚀 Starting email send process...");

  const configErrors = validateEmailJSConfig();
  if (configErrors.length > 0) {
    const errorMsg = `EmailJS configuration errors: ${configErrors.join(", ")}`;
    console.log("❌ Configuration Error:", errorMsg);
    throw new Error(errorMsg);
  }

  const roleInfo = roleDefinitions[adminRole];

  const templateParams = {
    to_email: email,
    to_name: username,
    username: username,
    password: password,
    to_role: roleInfo.name,
    role_description: roleInfo.description,
    login_url: `${window.location.origin}/auth/signin`,
    admin_name: currentUserName || "System Admin",
    support_email: "rentoreuse.2025@gmail.com",
    platform_name: "Rent2Reuse",
    current_date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    permissions_list: roleInfo.permissions.join(", "),
  };

  try {
    console.log("📤 Attempting to send email...");

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_USER_CREDENTIALS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log("✅ Email sent successfully:", response);

    if (response.status !== 200) {
      throw new Error(
        `EmailJS returned status ${response.status}: ${
          response.text || "Unknown error"
        }`
      );
    }

    return response;
  } catch (error: any) {
    console.log("❌ EmailJS Error Details:", error);
    let errorMessage = "Failed to send email";

    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.text) {
      errorMessage = error.text;
    } else if (error?.status) {
      errorMessage = `Email service returned status: ${error.status}`;
    }

    throw new Error(errorMessage);
  }
};

// Password Change Modal Component
const PasswordChangeModal = ({
  user,
  onComplete,
  onCancel,
}: {
  user: TeamMember;
  onComplete: () => void;
  onCancel: () => void;
}) => {
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [newUsername, setNewUsername] = useState(user.username || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.new !== passwords.confirm) {
      setError("New passwords don't match");
      return;
    }

    if (passwords.new.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!newUsername.trim()) {
      setError("Username is required");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updatePassword(currentUser, passwords.new);

        if (newUsername !== user.username) {
          await updateProfile(currentUser, {
            displayName: newUsername,
          });
        }

        const userQuery = query(
          collection(db, "admin"),
          where("email", "==", user.email)
        );
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          await updateDoc(doc(db, "admin", userDoc.id), {
            username: newUsername,
            isFirstLogin: false,
            temporaryPassword: false,
            passwordChangedAt: new Date(),
            lastLoginAt: new Date(),
            updatedAt: new Date(),
          });
        }

        onComplete();
      }
    } catch (error: any) {
      setError(error.message || "Failed to update credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Update Your Credentials
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              Please change your temporary credentials for security
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your preferred username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwords.current}
                onChange={(e) =>
                  setPasswords((prev) => ({ ...prev, current: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your current password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) =>
                  setPasswords((prev) => ({ ...prev, new: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter new password (min 8 characters)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords((prev) => ({ ...prev, confirm: e.target.value }))
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Confirm your new password"
                required
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                disabled={isLoading}
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Update
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const TeamMemberPage = () => {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    adminRole: "" as keyof typeof roleDefinitions,
  });
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{
    [key: string]: string | null;
  }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("approved");
  const [notification, setNotification] = useState<{
    message: string;
    type: string;
  } | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);

  // Enhanced Statistics with role-based breakdown
  const getStats = () => {
    const totalMembers = members.length;
    const activeMembers = members.filter(
      (member) => member.accountStatus === "approved"
    ).length;
    const inactiveMembers = members.filter(
      (member) => member.accountStatus === "deactivated"
    ).length;
    const deletedMembers = members.filter(
      (member) => member.accountStatus === "deleted"
    ).length;
    const firstLoginMembers = members.filter(
      (member) => member.isFirstLogin
    ).length;

    // Role-based statistics
    const roleStats = Object.keys(roleDefinitions).reduce((acc, role) => {
      acc[role] = members.filter((member) => member.adminRole === role).length;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalMembers,
      active: activeMembers,
      inactive: inactiveMembers,
      deleted: deletedMembers,
      firstLogin: firstLoginMembers,
      activeRate:
        totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0,
      roles: roleStats,
    };
  };

  // Safe date conversion function
  const safelyConvertDate = (timestamp: any): string | undefined => {
    try {
      if (!timestamp) return undefined;
      if (typeof timestamp === "object" && timestamp.toDate) {
        return timestamp.toDate().toISOString();
      }
      if (timestamp instanceof Date) {
        return timestamp.toISOString();
      }
      return undefined;
    } catch (error) {
      console.log("Date conversion error:", error);
      return undefined;
    }
  };

  // Transform document data safely
  const transformDocumentData = (doc: any): TeamMember => {
    const data = doc.data();
    return {
      id: doc.id,
      uid: data.uid,
      username: data.username || "Unknown User",
      email: data.email || "No email",
      role: data.role || "admin",
      adminRole: data.adminRole || "support",
      accountStatus: data.accountStatus || "deactivated",
      isFirstLogin: data.isFirstLogin || false,
      temporaryPassword: data.temporaryPassword || false,
      createdAt: safelyConvertDate(data.createdAt),
      updatedAt: safelyConvertDate(data.updatedAt),
      createdBy: data.createdBy,
      passwordChangedAt: safelyConvertDate(data.passwordChangedAt),
      lastLoginAt: safelyConvertDate(data.lastLoginAt),
      permissions: roleAccess[data.adminRole as keyof typeof roleAccess] || [],
      profileImageUrl: data.profileImageUrl || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      phoneNumber: data.phoneNumber || "",
      address: data.address || "",
    };
  };

  // Set up Firebase listeners
  const setupFirebaseListeners = () => {
    console.log("Setting up Firebase listeners...");
    const unsubscribeFunctions: (() => void)[] = [];

    try {
      const adminsQuery = query(
        collection(db, "admin"),
        orderBy("createdAt", "desc")
      );

      const unsubscribeAdmins = onSnapshot(
        adminsQuery,
        (snapshot) => {
          console.log("Admins snapshot received:", snapshot.size, "documents");
          const adminsData = snapshot.docs.map(transformDocumentData);
          console.log("Admins data:", adminsData);
          setMembers(adminsData);
          setLoading(false);
        },
        (error) => {
          console.log("Admins data error:", error);
          showNotification(
            "Error loading admins data: " + error.message,
            "error"
          );
          setLoading(false);
        }
      );
      unsubscribeFunctions.push(unsubscribeAdmins);

      return () => {
        console.log("Cleaning up Firebase listeners");
        unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
      };
    } catch (error) {
      console.log("Error setting up listeners:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      showNotification("Error setting up data listeners: " + errorMsg, "error");
      setLoading(false);
      return () => {};
    }
  };

  // Main useEffect for authentication and data loading
  useEffect(() => {
    let unsubscribeListeners: (() => void) | null = null;

    const checkAuth = async () => {
      setAuthLoading(true);
      try {
        const user = auth.currentUser;

        if (!user) {
          router.push("/auth/signin");
          return;
        }

        const userQuery = query(
          collection(db, "admin"),
          where("email", "==", user.email)
        );

        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();

          const currentUserData = transformDocumentData(userDoc);
          setCurrentUser(currentUserData);

          // Check permissions for accessing this page
          if (
            currentUserData.adminRole !== "superAdmin" &&
            currentUserData.adminRole !== "admin"
          ) {
            router.push("/admin");
            return;
          }

          // FIXED: Better logic for showing password change modal
          if (
            userData.isFirstLogin === true ||
            userData.temporaryPassword === true
          ) {
            setShowPasswordChange(true);
          }

          unsubscribeListeners = setupFirebaseListeners();
          setAuthLoading(false);
        } else {
          router.push("/auth/signin");
        }
      } catch (error) {
        console.log("Auth check error:", error);
        router.push("/auth/signin");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    return () => {
      if (unsubscribeListeners) {
        unsubscribeListeners();
      }
    };
  }, [router]);

  const showNotification = (message: string, type: string = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 7000);
  };

  // Enhanced user registration
  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading((prev) => ({ ...prev, register: "creating" }));

    try {
      const currentAuthUser = auth.currentUser;
      if (!currentAuthUser) {
        showNotification(
          "Authentication error: No current user found",
          "error"
        );
        return;
      }

      const { username, password } = generateCredentials();

      const adminQuery = query(
        collection(db, "admin"),
        where("email", "==", formData.email.trim())
      );
      const adminSnapshot = await getDocs(adminQuery);

      if (!adminSnapshot.empty) {
        showNotification("Email is already registered as an admin", "error");
        return;
      }

      const tempApp = initializeApp(auth.app.options, "tempApp");
      const tempAuth = getAuth(tempApp);

      try {
        const userCredential = await createUserWithEmailAndPassword(
          tempAuth,
          formData.email.trim(),
          password
        );

        await updateProfile(userCredential.user, {
          displayName: username,
        });

        // Get permissions for the selected role
        const permissions = roleAccess[formData.adminRole] || [];

        await addDoc(collection(db, "admin"), {
          uid: userCredential.user.uid,
          username: username,
          email: formData.email.trim(),
          adminRole: formData.adminRole,
          role: "admin",
          accountStatus: "approved",
          isFirstLogin: true,
          temporaryPassword: true,
          createdAt: new Date(),
          createdBy: currentAuthUser.uid,
          updatedAt: new Date(),
          permissions: permissions,
        });

        try {
          await sendEmailNotification(
            formData.email,
            username,
            password,
            formData.adminRole,
            currentUser?.username
          );

          showNotification(
            `${
              roleDefinitions[formData.adminRole].name
            } created successfully! Credentials sent to ${formData.email}`,
            "success"
          );
        } catch (emailError) {
          console.log("Email sending error:", emailError);
          const roleInfo = roleDefinitions[formData.adminRole];
          showNotification(
            `User created successfully!\n\nCredentials:\nUsername: ${username}\nPassword: ${password}\nRole: ${roleInfo.name}`,
            "warning"
          );
        }

        setFormData({
          email: "",
          adminRole: "" as keyof typeof roleDefinitions,
        });
        setShowRegisterForm(false);
      } finally {
        await signOut(tempAuth);
        await deleteApp(tempApp);
      }
    } catch (error: any) {
      console.log("Registration error:", error);
      showNotification(`Failed to create user: ${error.message}`, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, register: null }));
    }
  };

  // Handle account activation/deactivation
  const handleToggleStatus = async (member: TeamMember) => {
    const memberId = member.id;
    const newStatus =
      member.accountStatus === "approved" ? "deactivated" : "approved";

    setActionLoading((prev) => ({ ...prev, [memberId]: "updating" }));

    try {
      await updateDoc(doc(db, "admin", memberId), {
        accountStatus: newStatus,
        updatedAt: new Date(),
      });

      showNotification(
        `${member.username} has been ${
          newStatus === "approved" ? "activated" : "deactivated"
        }`,
        "success"
      );
    } catch (error: any) {
      console.log("Error updating user status:", error);
      showNotification(`Error updating user status: ${error.message}`, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [memberId]: null }));
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (member: TeamMember) => {
    if (
      !confirm(
        `Are you sure you want to delete ${member.username}? This action cannot be undone.`
      )
    ) {
      return;
    }

    const memberId = member.id;
    setActionLoading((prev) => ({ ...prev, [memberId]: "deleting" }));

    try {
      await updateDoc(doc(db, "admin", memberId), {
        accountStatus: "deleted",
        deletedAt: new Date(),
        deletedBy: auth.currentUser?.uid,
        updatedAt: new Date(),
      });

      showNotification(`${member.username} has been deleted`, "info");
    } catch (error: any) {
      console.log("Error deleting user:", error);
      showNotification(`Error deleting user: ${error.message}`, "error");
    } finally {
      setActionLoading((prev) => ({ ...prev, [memberId]: null }));
    }
  };

  // Enhanced filtering
  const filterData = (data: TeamMember[]) => {
    return data.filter((item) => {
      const matchesSearch =
        item.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roleDefinitions[item.adminRole || "support"]?.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesRole = filterRole === "all" || item.adminRole === filterRole;
      const matchesStatus =
        filterStatus === "all" || item.accountStatus === filterStatus;
      const matchesTab =
        activeTab === "all" || item.accountStatus === activeTab;

      return matchesSearch && matchesRole && matchesStatus && matchesTab;
    });
  };

  // Get role icon and styling
  const getRoleDisplay = (adminRole: keyof typeof roleDefinitions) => {
    const role = roleDefinitions[adminRole];
    if (!role) return { name: "Unknown", icon: User, color: "text-gray-600" };

    return {
      name: role.name,
      icon: role.icon,
      color: role.textColor,
      bgColor: role.bgColor,
    };
  };

  // FIXED: Function to handle viewing member details
  const handleViewDetails = (member: TeamMember) => {
    setSelectedMember(member);
    setShowMemberDetails(true);
  };

  // Register Modal Component with enhanced role selection
  const RegisterModal = () => {
    const emailInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (emailInputRef.current) {
        emailInputRef.current.focus();
      }
    }, []);

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Create New Admin User
              </h2>
              <button
                onClick={() => setShowRegisterForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRegisterUser} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Admin Role *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(roleDefinitions)
                    .filter(([key]) => key !== "superAdmin") // Hide superAdmin
                    .map(([key, role]) => {
                      const IconComponent = role.icon;
                      const isSelected = formData.adminRole === key;

                      return (
                        <div
                          key={key}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              adminRole: key as keyof typeof roleDefinitions,
                            }))
                          }
                          className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                            isSelected
                              ? `border-indigo-500 bg-gradient-to-r ${role.bgColor} ring-2 ring-indigo-200`
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`p-2 rounded-lg bg-gradient-to-r ${role.color} text-white`}
                            >
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3
                                className={`font-semibold text-sm ${
                                  isSelected ? role.textColor : "text-gray-900"
                                }`}
                              >
                                {role.name}
                              </h3>
                              <p
                                className={`text-xs mt-1 ${
                                  isSelected ? role.textColor : "text-gray-600"
                                }`}
                              >
                                {role.description}
                              </p>
                              <div className="mt-2">
                                <p
                                  className={`text-xs font-medium ${
                                    isSelected
                                      ? role.textColor
                                      : "text-gray-700"
                                  }`}
                                >
                                  Key Permissions:
                                </p>
                                <ul
                                  className={`text-xs mt-1 ${
                                    isSelected
                                      ? role.textColor
                                      : "text-gray-600"
                                  }`}
                                >
                                  {role.permissions
                                    .slice(0, 3)
                                    .map((permission, index) => (
                                      <li
                                        key={index}
                                        className="flex items-center"
                                      >
                                        <div className="w-1 h-1 bg-current rounded-full mr-2"></div>
                                        {permission}
                                      </li>
                                    ))}
                                  {role.permissions.length > 3 && (
                                    <li className="text-xs italic">
                                      +{role.permissions.length - 3} more...
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {formData.adminRole && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 mr-2" />
                    <span className="text-sm font-medium text-indigo-800">
                      Auto-Generated Credentials
                    </span>
                  </div>
                  <ul className="text-sm text-indigo-700 space-y-1">
                    <li>
                      • <strong>Username:</strong> admin_#### (auto-generated)
                    </li>
                    <li>
                      • <strong>Password:</strong> Secure 12-character password
                    </li>
                    <li>
                      • <strong>Role:</strong>{" "}
                      {roleDefinitions[formData.adminRole].name}
                    </li>
                    <li>
                      • <strong>Status:</strong> Active (requires first login)
                    </li>
                  </ul>
                  <p className="text-xs text-indigo-600 mt-2">
                    User will receive credentials via email and must change
                    password on first login.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  actionLoading.register === "creating" ||
                  !formData.email.trim() ||
                  !formData.adminRole
                }
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
              >
                {actionLoading.register === "creating" ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create Admin Account
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Member Details Modal
  const MemberDetailsModal = () => {
    const [showConfirm, setShowConfirm] = useState<
      null | "deactivate" | "delete"
    >(null);
    const [actionLoading, setActionLoading] = useState(false);

    if (!selectedMember) return null;

    // Use adminRole or fallback to "admin"
    const roleKey = selectedMember.adminRole || "admin";
    const roleDisplay = getRoleDisplay(roleKey as keyof typeof roleDefinitions);
    const IconComponent = roleDisplay.icon;

    const formatDate = (dateString?: string) => {
      if (!dateString) return "Not available";
      try {
        return new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return "Invalid date";
      }
    };

    // Action handlers
    const handleDeactivate = async () => {
      // Prevent superAdmin from deactivating themselves
      if (
        currentUser &&
        selectedMember &&
        currentUser.id === selectedMember.id &&
        (currentUser.adminRole === "superAdmin" ||
          currentUser.adminRole === "admin")
      ) {
        showNotification(
          "You cannot deactivate your own admin or super admin account.",
          "error"
        );
        setShowConfirm(null);
        return;
      }

      setActionLoading(true);
      try {
        await updateDoc(doc(db, "admin", selectedMember.id), {
          accountStatus:
            selectedMember.accountStatus === "approved"
              ? "deactivated"
              : "approved",
          updatedAt: new Date(),
        });
        setShowConfirm(null);
        setShowMemberDetails(false);
        showNotification(
          `${selectedMember.username} has been ${
            selectedMember.accountStatus === "approved"
              ? "deactivated"
              : "activated"
          }`,
          "success"
        );
      } catch (error: any) {
        showNotification("Failed to update status: " + error.message, "error");
      } finally {
        setActionLoading(false);
      }
    };

    const handleDelete = async () => {
      setActionLoading(true);
      try {
        await updateDoc(doc(db, "admin", selectedMember.id), {
          accountStatus: "deleted",
          deletedAt: new Date(),
          deletedBy: auth.currentUser?.uid,
          updatedAt: new Date(),
        });
        setShowConfirm(null);
        setShowMemberDetails(false);
        showNotification(`${selectedMember.username} has been deleted`, "info");
      } catch (error: any) {
        showNotification("Failed to delete user: " + error.message, "error");
      } finally {
        setActionLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Admin User Details
              </h2>
              <button
                onClick={() => setShowMemberDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                  {selectedMember.profileImageUrl ? (
                    <img
                      src={selectedMember.profileImageUrl}
                      alt={selectedMember.username}
                      className="w-24 h-24 object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-12 h-12 text-indigo-600" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedMember.username}
                </h3>
                <div className="flex items-center justify-center mt-2 space-x-2">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedMember.accountStatus === "approved"
                        ? "bg-green-100 text-green-800"
                        : selectedMember.accountStatus === "deactivated"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {selectedMember.accountStatus === "approved"
                      ? "Active"
                      : selectedMember.accountStatus.charAt(0).toUpperCase() +
                        selectedMember.accountStatus.slice(1)}
                  </span>
                  {(selectedMember.isFirstLogin ||
                    selectedMember.temporaryPassword) && (
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                      First Login Required
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Contact Information
                  </label>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {selectedMember.email}
                    </p>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      Username: {selectedMember.username}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      Name: {selectedMember.firstName} {selectedMember.lastName}
                    </p>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      Phone: {selectedMember.phoneNumber}
                    </p>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      Address: {selectedMember.address}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Admin Role
                  </label>
                  <div className="flex items-center">
                    <div
                      className={`p-2 rounded-lg bg-gradient-to-r ${roleDefinitions[roleKey].color} text-white mr-3`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {roleDisplay.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {roleDefinitions[roleKey].description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Account Status
                  </label>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {selectedMember.accountStatus}
                    </p>
                    <p className="text-xs text-gray-600">
                      Temporary Password:{" "}
                      {selectedMember.temporaryPassword ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    Activity
                  </label>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">
                      Created: {formatDate(selectedMember.createdAt)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Last Updated: {formatDate(selectedMember.updatedAt)}
                    </p>
                    {selectedMember.lastLoginAt && (
                      <p className="text-xs text-gray-600">
                        Last Login: {formatDate(selectedMember.lastLoginAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Role Permissions
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roleDefinitions[roleKey].permissions.map(
                    (permission, index) => (
                      <div
                        key={index}
                        className="flex items-center text-sm text-gray-700"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                        {permission}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowMemberDetails(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
              {selectedMember.accountStatus !== "deleted" && (
                <>
                  <button
                    onClick={() => setShowConfirm("deactivate")}
                    className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
                    disabled={actionLoading}
                  >
                    {selectedMember.accountStatus === "approved"
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                  <button
                    onClick={() => setShowConfirm("delete")}
                    className="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors font-medium"
                    disabled={actionLoading}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">
                {showConfirm === "deactivate"
                  ? selectedMember.accountStatus === "approved"
                    ? "Deactivate Admin User"
                    : "Activate Admin User"
                  : "Delete Admin User"}
              </h3>
              <p className="mb-6 text-gray-700">
                {showConfirm === "deactivate"
                  ? selectedMember.accountStatus === "approved"
                    ? "Are you sure you want to deactivate this admin user? They will not be able to access the admin panel."
                    : "Are you sure you want to activate this admin user?"
                  : "Are you sure you want to delete this admin user? This action cannot be undone."}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={
                    showConfirm === "deactivate"
                      ? handleDeactivate
                      : handleDelete
                  }
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    showConfirm === "delete"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-yellow-600 hover:bg-yellow-700"
                  }`}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? "Processing..."
                    : showConfirm === "deactivate"
                    ? selectedMember.accountStatus === "approved"
                      ? "Deactivate"
                      : "Activate"
                    : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredMembers = filterData(members);
  const stats = getStats();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Notification Toast */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 max-w-sm w-full rounded-lg shadow-lg p-4 ${
              notification.type === "success"
                ? "bg-green-50 border-l-4 border-green-400"
                : notification.type === "error"
                ? "bg-red-50 border-l-4 border-red-400"
                : "bg-yellow-50 border-l-4 border-yellow-400"
            }`}
          >
            <div className="flex items-start">
              {notification.type === "success" && (
                <CheckCircle2 className="w-6 h-6 text-green-400 mr-3 flex-shrink-0 mt-0.5" />
              )}
              {notification.type === "error" && (
                <XCircle className="w-6 h-6 text-red-400 mr-3 flex-shrink-0 mt-0.5" />
              )}
              {notification.type === "warning" && (
                <AlertTriangle className="w-6 h-6 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 whitespace-pre-line">
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 ml-3"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Admin User Management
              </h1>
              <p className="text-gray-600">
                Manage administrative users and their role-based permissions
              </p>
            </div>
            <div className="flex space-x-3 mt-4 md:mt-0">
              <button
                onClick={() => setShowRegisterForm(true)}
                className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-700 transition-colors font-medium"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Add Admin User
              </button>
            </div>
          </div>

          {/* Enhanced Statistics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 rounded-lg shadow-sm border border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="text-indigo-600">
                  <Users className="w-8 h-8" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">
                    Total Admins
                  </p>
                  <p className="text-2xl font-bold text-indigo-800">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-100 to-teal-100 p-4 rounded-lg shadow-sm border border-green-200">
              <div className="flex items-center justify-between">
                <div className="text-green-600">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wider">
                    Active Users
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    {stats.active}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 p-4 rounded-lg shadow-sm border border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="text-yellow-600">
                  <Clock className="w-8 h-8" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-yellow-600 font-medium uppercase tracking-wider">
                    First Login
                  </p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {stats.firstLogin}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-100 to-cyan-100 p-4 rounded-lg shadow-sm border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="text-blue-600">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                    Active Rate
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    {stats.activeRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Role Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Role Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(roleDefinitions)
                .filter(([key]) => key !== "superAdmin")
                .map(([key, role]) => {
                  const IconComponent = role.icon;
                  const count = stats.roles[key] || 0;

                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-lg border bg-gradient-to-r ${role.bgColor} border-opacity-50`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`p-1 rounded bg-gradient-to-r ${role.color} text-white`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <p
                            className={`text-xs font-medium ${role.textColor}`}
                          >
                            {role.name}
                          </p>
                          <p className={`text-lg font-bold ${role.textColor}`}>
                            {count}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Enhanced Search and Filter */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Search by username, email, or role..."
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="all">All Roles</option>
                {Object.entries(roleDefinitions).map(([key, role]) => (
                  <option key={key} value={key}>
                    {role.name}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              >
                <option value="all">All Status</option>
                <option value="approved">Active</option>
                <option value="deactivated">Inactive</option>
                <option value="deleted">Deleted</option>
              </select>

              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab("approved")}
                  className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
                    activeTab === "approved"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab("deactivated")}
                  className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
                    activeTab === "deactivated"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Inactive
                </button>
                <button
                  onClick={() => setActiveTab("deleted")}
                  className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
                    activeTab === "deleted"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  Deleted
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Admin Users Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full bg-white divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMembers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center">
                        <Users className="w-12 h-12 text-gray-300 mb-2" />
                        <p className="text-lg font-medium">
                          No admin users found
                        </p>
                        <p className="text-sm">
                          {searchTerm
                            ? "Try adjusting your search terms"
                            : "Get started by adding your first admin user"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredMembers.map((member) => {
                  const roleDisplay = getRoleDisplay(
                    member.adminRole || "support"
                  );
                  const IconComponent = roleDisplay.icon;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mr-4">
                            {member.profileImageUrl ? (
                              <img
                                src={member.profileImageUrl}
                                alt={member.username}
                                className="h-10 w-10 object-cover rounded-full"
                              />
                            ) : (
                              <User className="w-5 h-5 text-indigo-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.username}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {member.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">
                          {member.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className={`p-1 rounded bg-gradient-to-r ${
                              roleDefinitions[member.adminRole || "support"]
                                .color
                            } text-white mr-2`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {roleDisplay.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {member.permissions?.length || 0} permissions
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              member.accountStatus === "approved"
                                ? "bg-green-100 text-green-800"
                                : member.accountStatus === "deactivated"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {member.accountStatus === "approved"
                              ? "Active"
                              : member.accountStatus}
                          </span>
                          {member.isFirstLogin && (
                            <div>
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                                First Login Required
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        <div className="space-y-1">
                          <p>
                            Created:{" "}
                            {member.createdAt
                              ? new Date(member.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )
                              : "N/A"}
                          </p>
                          {member.lastLoginAt && (
                            <p>
                              Last Login:{" "}
                              {new Date(member.lastLoginAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewDetails(member)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-xs"
                            title="View Details"
                          >
                            View Details
                          </button>

                          {member.accountStatus !== "deleted" && (
                            <>
                              {/* <button
                                onClick={() => handleToggleStatus(member)}
                                disabled={actionLoading[member.id] !== null}
                                className={`p-2 rounded-full transition-colors ${
                                  member.accountStatus === "approved"
                                    ? "text-yellow-600 hover:text-yellow-900 bg-yellow-50 hover:bg-yellow-100"
                                    : "text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100"
                                }`}
                                title={
                                  member.accountStatus === "approved"
                                    ? "Deactivate"
                                    : "Activate"
                                }
                              >
                                {actionLoading[member.id] === "updating" ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : member.accountStatus === "approved" ? (
                                  <X className="w-4 h-4" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button> */}

                              {/* <button
                                onClick={() => handleDeleteUser(member)}
                                disabled={actionLoading[member.id] !== null}
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-full transition-colors"
                                title="Delete User"
                              >
                                {actionLoading[member.id] === "deleting" ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash className="w-4 h-4" />
                                )}
                              </button> */}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {showRegisterForm && <RegisterModal />}
        {showPasswordChange &&
          currentUser &&
          (currentUser.isFirstLogin === true ||
            currentUser.temporaryPassword === true) && (
            <PasswordChangeModal
              user={currentUser}
              onComplete={async () => {
                // Re-fetch current user from Firestore to get updated data
                try {
                  const userQuery = query(
                    collection(db, "admin"),
                    where("email", "==", currentUser.email)
                  );
                  const userSnapshot = await getDocs(userQuery);
                  if (!userSnapshot.empty) {
                    const userDoc = userSnapshot.docs[0];
                    const updatedUser = transformDocumentData(userDoc);
                    setCurrentUser(updatedUser);

                    // FIXED: Only close modal if both flags are explicitly false
                    if (
                      updatedUser.isFirstLogin === false &&
                      updatedUser.temporaryPassword === false
                    ) {
                      setShowPasswordChange(false);
                      showNotification(
                        "Credentials updated successfully!",
                        "success"
                      );
                    }
                  } else {
                    setShowPasswordChange(false);
                  }
                } catch (error) {
                  console.log("Error refetching user:", error);
                  setShowPasswordChange(false);
                }
              }}
              onCancel={() => {
                setShowPasswordChange(false);
                showNotification(
                  "You can update your credentials later from your profile",
                  "info"
                );
              }}
            />
          )}
        {showMemberDetails && <MemberDetailsModal />}
      </div>
    </div>
  );
};

export default TeamMemberPage;
