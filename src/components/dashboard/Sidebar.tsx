"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/app/firebase/config";
import { Button } from "@/components/ui/button";
import { FaRegUserCircle } from "react-icons/fa";
import { TiThListOutline } from "react-icons/ti";
import { RiTeamLine } from "react-icons/ri";
import {
  MdOutlinePeople,
  MdOutlinePayment,
  MdCircleNotifications,
  MdLogout,
  MdOutlineManageAccounts,
  MdOutlineSubscriptions,
  MdOutlineSupportAgent,
  MdOutlineDashboard,
  MdOutlineReportProblem,
} from "react-icons/md";
import { cn } from "@/lib/utils";
import {
  query,
  collection,
  where,
  getDocs,
  updateDoc,
  onSnapshot, // ✅ real Firebase helper
} from "firebase/firestore";

import { ChevronDown, Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AdminAuthCheck } from "@/components/auth/AdminAuthCheck";


const sidebarStyles = {
  nav: "flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
  navItem:
    "flex items-center p-4 transition-all duration-300 rounded-xl mb-2 font-medium text-sm relative overflow-hidden group",
  activeNavItem:
    "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1 before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity",
  inactiveNavItem:
    "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md transform hover:-translate-y-0.5",
  icon: "w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
  dropdown:
    "w-full rounded-xl transition-all duration-300 relative overflow-hidden",
  dropdownActive:
    "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg",
  dropdownInactive:
    "text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md",
  subItem: "w-full rounded-lg transition-all duration-300 hover:pl-6",
};

// Navigation items array - Updated with better naming
const navigationItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: MdOutlineDashboard,
    description: "Overview of system metrics and insights",
    allowedRoles: ["superAdmin", "admin", "support", "manageUsers", "financialViewer", "contentManager"],
  },
  {
    name: "Inventory",
    href: "/admin/itemList",
    icon: TiThListOutline,
    description: "Manage and monitor rentable items",
    allowedRoles: ["superAdmin", "admin", "manageUsers", "contentManager"],
  },
  {
    name: "Users",
    href: "/admin/manageUsers",
    icon: MdOutlineManageAccounts,
    description: "Manage user accounts and details",
    allowedRoles: ["superAdmin", "admin", "manageUsers"],
  },
  {
    name: "Team",
    href: "/admin/teamMembers",
    icon: RiTeamLine,
    description: "Manage admin and staff members",
    allowedRoles: ["superAdmin", "admin"],
  },
  {
    name: "Payments",
    href: "/admin/transaction",
    icon: MdOutlinePayment,
    description: "View and track payment transactions",
    allowedRoles: ["superAdmin", "admin", "financialViewer"],
  },
  {
    name: "Subscriptions",
    href: "/admin/subscription",
    icon: MdOutlineSubscriptions,
    description: "View and manage subscription plans",
    allowedRoles: ["superAdmin", "admin", "financialViewer"],
  },
  {
    name: "Support",
    href: "/admin/support",
    icon: MdOutlineSupportAgent,
    description: "Handle customer support tickets",
    allowedRoles: ["superAdmin", "admin", "support"],
  },
  {
    name: "User Reports",
    href: "/admin/reports",
    icon: MdOutlineReportProblem,
    description: "Manage user complaints and issue reports",
    allowedRoles: ["superAdmin", "admin", "support"],
  },
  {
    name: "Announcements",
    href: "/admin/announcements",
    icon: MdCircleNotifications,
    description: "Create and manage system announcements",
    allowedRoles: ["superAdmin", "admin", "support", "contentManager"],
  },
  {
    name: "Activity Logs",
    href: "/admin/userLog",
    icon: MdOutlinePeople,
    description: "Monitor system and user activity logs",
    allowedRoles: ["superAdmin", "admin", "support", "manageUsers"],
  },
  // {
  //   name: "Settings",
  //   href: "/admin/settings",
  //   icon: MdOutlineManageAccounts,
  //   description: "Manage your admin profile and settings",
  //   allowedRoles: ["superAdmin", "admin", "support", "manageUsers", "financialViewer", "contentManager"],
  // }
];


// Define allowed admin roles
export type AdminRole =
  | "superAdmin"
  | "admin"
  | "support"
  | "manageUsers"
  | "financialViewer"
  | "contentManager";

// Enhanced role access configuration
const roleAccess: Record<AdminRole, string[]> = {
  superAdmin: ["*"],
  admin: ["*"],
  support: [
    "/admin",
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
    "/admin/itemList",
    "/admin/userLog",
    "/admin/profile",
  ],
  financialViewer: [
    "/admin",
    "/admin/transaction",
    "/admin/subscription",
    "/admin/profile",
  ],
  contentManager: [
    "/admin",
    "/admin/itemList",
    "/admin/announcements",
    "/admin/profile",
  ],
};

// Check if a role has access to a path
const hasAccess = (adminRole: AdminRole | null, path: string): boolean => {
  if (!adminRole || !path) return false;

  const allowedPaths = roleAccess[adminRole];
  if (!allowedPaths) return false;

  if (allowedPaths.includes("*")) return true;

  return allowedPaths.some(
    (allowedPath) => path === allowedPath || path.startsWith(allowedPath)
  );
};

// Filter navigation items based on role
const getFilteredNavigationItems = (adminRole: AdminRole | null) => {
  if (!adminRole) return [];

  const allowedPaths = roleAccess[adminRole];
  if (!allowedPaths) return [];

  // Full access roles see everything
  if (allowedPaths.includes("*")) return navigationItems;

  // Filter by allowedRoles and path access
  return navigationItems.filter((item) => {
    if (!item.href) return false;
    const roleAllowed = item.allowedRoles?.includes(adminRole) ?? true;
    return roleAllowed && hasAccess(adminRole, item.href);
  });
};



interface SidebarProps {
  currentPath?: string;
}

// Loading skeleton component
const SidebarSkeleton = () => (
  <div className="w-64 bg-gradient-to-b from-white to-gray-50/50 border-r flex flex-col h-screen sticky top-0 shadow-xl backdrop-blur-sm">
    <div className="flex-1 flex flex-col">
      <div className="p-6 mb-2 flex justify-center">
        <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
      </div>
      <nav className="flex-1 px-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-100 animate-pulse rounded-lg mb-2"
          />
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-200 animate-pulse rounded-full mb-3" />
          <div className="h-4 w-20 bg-gray-200 animate-pulse rounded mb-2" />
          <div className="h-3 w-16 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>
    </div>
  </div>
);

// Main client sidebar component
const ClientSidebar = ({ currentPath }: SidebarProps) => {
  const [user, loading, error] = useAuthState(auth);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState<Record<string, number>>({});

  const pathname = usePathname();

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set up user data listener
  useEffect(() => {
    if (!user || loading) {
      setUserDataLoading(false);
      return;
    }

    setUserDataLoading(true);
    console.log("Setting up real-time listener for admin data:", user.email);

    try {
      const adminQuery = query(
        collection(db, "admin"),
        where("email", "==", user.email)
      );

      const unsubscribe = onSnapshot(adminQuery, {
        next: (querySnapshot) => {
          if (!querySnapshot.empty) {
            const adminDoc = querySnapshot.docs[0];
            const adminData = adminDoc.data();
            console.log(
              "ð Real-time update received for admin data:",
              adminData
            );

            setUsername(adminData.username || null);
            setAdminRole((adminData.adminRole as AdminRole) || null);
            setProfileImage(adminData.profileImageUrl || null);
            setImageError(false);

            // Update localStorage
            if (adminData.adminRole) {
              localStorage.setItem("adminRole", adminData.adminRole);
            }

            console.log("â Updated sidebar state with new data:", {
              username: adminData.username,
              adminRole: adminData.adminRole,
              profileImage: adminData.profileImageUrl,
            });
          } else {
            console.warn("â ï¸ No admin document found for email:", user.email);
            setUsername(null);
            setAdminRole(null);
            setProfileImage(null);
            localStorage.removeItem("adminRole");
          }
          setUserDataLoading(false);
        },
        error: (error) => {
          console.log("â Error in admin data listener:", error);
          setUsername(null);
          setAdminRole(null);
          setProfileImage(null);
          setUserDataLoading(false);
          localStorage.removeItem("adminRole");
        },
      });

      // Cleanup listener on unmount
      return () => {
        console.log("ð§¹ Cleaning up admin data listener");
        unsubscribe();
      };
    } catch (error) {
      console.log("â Error setting up admin data listener:", error);
      setUserDataLoading(false);
    }
  }, [user, loading]);

  // Set up notification listeners
  useEffect(() => {
    if (!adminRole) return;

    const unsubscribers: (() => void)[] = [];

    // Track open support tickets (not closed/resolved)
    try {
      const supportQuery = query(
        collection(db, "support"),
        where("status", "!=", "closed")
      );

      const unsubSupport = onSnapshot(supportQuery, (snapshot) => {
        const activeTickets = snapshot.docs.filter((doc) => {
          const status = doc.data().status?.toLowerCase();
          return status !== "closed" && status !== "resolved";
        });
        setNotificationCounts((prev) => ({
          ...prev,
          support: activeTickets.length,
        }));
      });

      unsubscribers.push(unsubSupport);
    } catch (error) {
      console.log("Error setting up support notifications:", error);
    }

    // Track unread reports (status !== "resolved")
    try {
      const reportsQuery = query(
        collection(db, "reports"),
        where("status", "!=", "resolved")
      );

      const unsubReports = onSnapshot(reportsQuery, (snapshot) => {
        const unresolvedReports = snapshot.docs.filter((doc) => {
          const status = doc.data().status?.toLowerCase();
          return status !== "resolved";
        });
        setNotificationCounts((prev) => ({
          ...prev,
          reports: unresolvedReports.length,
        }));
      });

      unsubscribers.push(unsubReports);
    } catch (error) {
      console.log("Error setting up reports notifications:", error);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [adminRole]);

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageError(true);
    setProfileImage(null);
  }, []);

  // Handle logout function
  // Replace the handleLogout function in your sidebar component with this updated version:

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    try {
      if (user) {
        console.log("Starting logout process for user:", user.uid);

        // Update logout time in userLogs collection
        const userLogsQuery = query(
          collection(db, "userLogs"),
          where("uid", "==", user.uid)
        );
        const userLogsSnapshot = await getDocs(userLogsQuery);

        if (!userLogsSnapshot.empty) {
          const userLogDoc = userLogsSnapshot.docs[0];
          const userLogData = userLogDoc.data();
          const loginLogs = userLogData.loginLogs || [];

          if (loginLogs.length > 0) {
            // ✅ Update ALL active sessions with null logout
            const updatedLogs = loginLogs.map((log: any) =>
              log.lastLogout === null
                ? { ...log, lastLogout: new Date().toISOString() }
                : log
            );

            await updateDoc(userLogDoc.ref, {
              loginLogs: updatedLogs,
              updatedAt: new Date(),
            });

            console.log(
              "✅ Successfully updated ALL active sessions to logout"
            );
          }
        } else {
          console.warn("⚠️ No userLogs document found for user:", user.uid);
        }

        // Also update admin collection with lastLogout
        const adminQuery = query(
          collection(db, "admin"),
          where("uid", "==", user.uid)
        );
        const adminSnapshot = await getDocs(adminQuery);

        if (!adminSnapshot.empty) {
          const adminDoc = adminSnapshot.docs[0];
          await updateDoc(adminDoc.ref, {
            lastLogout: new Date(),
          });
          console.log("Updated lastLogout in admin collection");
        }
      }

      // Clear localStorage
      localStorage.removeItem("adminRole");
      localStorage.removeItem("adminUid");
      localStorage.removeItem("isAuthenticated");

      // Sign out from Firebase Auth
      await signOut(auth);

      console.log("✅ Sidebar logout completed successfully");
    } catch (error) {
      console.log("❌ Error signing out:", error);
      try {
        await signOut(auth);
        localStorage.clear();
      } catch (signOutError) {
        console.log("Critical error during logout:", signOutError);
      }
    } finally {
      setLogoutLoading(false);
    }
  }, [user]);

  // ---------------- HANDLE TAB CLOSE/REFRESH ----------------
  // Replace the existing beforeunload useEffect in your sidebar with this updated version:

  useEffect(() => {
    const handleBeforeUnloadUpdate = async () => {
      if (user?.uid) {
        try {
          const userLogsQuery = query(
            collection(db, "userLogs"),
            where("uid", "==", user.uid)
          );
          const userLogsSnapshot = await getDocs(userLogsQuery);

          if (!userLogsSnapshot.empty) {
            const userLogDoc = userLogsSnapshot.docs[0];
            const userLogData = userLogDoc.data();
            const loginLogs = userLogData.loginLogs || [];

            if (loginLogs.length > 0) {
              // ✅ Update ALL active sessions with null logout
              const updatedLogs = loginLogs.map((log: any) =>
                log.lastLogout === null
                  ? { ...log, lastLogout: new Date().toISOString() }
                  : log
              );

              await updateDoc(userLogDoc.ref, {
                loginLogs: updatedLogs,
                updatedAt: new Date(),
              });

              // Also update admin collection for consistency
              const adminQuery = query(
                collection(db, "admin"),
                where("uid", "==", user.uid)
              );
              const adminSnapshot = await getDocs(adminQuery);

              if (!adminSnapshot.empty) {
                const adminDoc = adminSnapshot.docs[0];
                await updateDoc(adminDoc.ref, {
                  lastLogout: new Date(),
                });
              }
            }
          }
        } catch (error) {
          console.log("❌ Error updating logout on beforeunload:", error);
        }
      }
    };

    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      if (user?.uid) {
        // Use sendBeacon for reliability
        const logoutData = {
          uid: user.uid,
          timestamp: new Date().toISOString(),
          action: "logout_beforeunload",
        };

        const blob = new Blob([JSON.stringify(logoutData)], {
          type: "application/json",
        });

        navigator.sendBeacon("/api/logout-beacon", blob);
      }
    };

    // Fallback for browsers not supporting sendBeacon
    const unloadHandler = () => {
      if (user?.uid) {
        handleBeforeUnloadUpdate();
      }
    };

    window.addEventListener("beforeunload", beforeUnloadHandler);
    window.addEventListener("unload", unloadHandler);

    return () => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
      window.removeEventListener("unload", unloadHandler);
    };
  }, [user]);

  // Check if route is active
  const isActive = useCallback(
    (href: string | undefined) => {
      if (!href || !pathname) return false;

      if (href === "/admin") {
        return pathname === href;
      }
      return pathname.startsWith(href);
    },
    [pathname]
  );

  // Notification badge component
  const NotificationBadge = ({ count }: { count: number }) => {
    if (count === 0) return null;
    return (
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="h-6 w-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-pulse">
          {count > 9 ? "9+" : count}
        </div>
      </div>
    );
  };

  // Enhanced role badge styling
  const getRoleBadgeStyle = (adminRole: string | null) => {
    switch (adminRole) {
      case "superAdmin":
        return "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg";
      case "admin":
        return "bg-gradient-to-r from-pink-500 to-cyan-500 text-white shadow-lg";
      case "manageUsers":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg";
      case "support":
        return "bg-gradient-to-r from-green-500 to-emerald-400 text-white shadow-lg";
      case "financialViewer":
        return "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg";
      case "contentManager":
        return "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  // Enhanced role display names
  const getRoleDisplayName = (adminRole: string | null) => {
    switch (adminRole) {
      case "superAdmin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "manageUsers":
        return "User Manager";
      case "support":
        return "Support Agent";
      case "financialViewer":
        return "Financial Viewer";
      case "contentManager":
        return "Content Manager";
      default:
        return adminRole;
    }
  };

  // Profile section renderer
  const renderProfileSection = () => {
    if (!user) return null;

    return (
      <div className="p-4 border-t border-gray-200 mt-auto bg-gradient-to-t from-gray-50/80 to-transparent backdrop-blur-sm">
        <Link
          href="/admin/profile"
          className="flex flex-col items-center p-4 rounded-xl hover:bg-white/80 transition-all duration-300 group hover:shadow-lg transform hover:-translate-y-1"
          aria-label="View profile"
        >
          <div className="relative">
            {userDataLoading ? (
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : profileImage && !imageError ? (
              <div className="w-16 h-16 rounded-full overflow-hidden relative border-3 border-primary/20 shadow-lg group-hover:border-primary/40 transition-all duration-300">
                <Image
                  src={profileImage}
                  alt="Profile"
                  fill
                  sizes="64px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110 "
                  onError={handleImageError}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ) : (
              <div className="relative">
                <FaRegUserCircle className="text-7xl text-gray-400 group-hover:text-primary transition-colors duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
              </div>
            )}

            {/* Online status indicator */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
          </div>

          <div className="mt-3 text-center">
            {userDataLoading ? (
              <div className="animate-pulse">
                <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-16 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <>
                <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors duration-300">
                  {username || "No username"}
                </p>
                {adminRole && (
                  <p
                    className={`text-xs mt-1 px-3 py-1 rounded-full font-medium ${getRoleBadgeStyle(
                      adminRole
                    )}`}
                  >
                    {getRoleDisplayName(adminRole)}
                  </p>
                )}
              </>
            )}
          </div>
        </Link>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-4 w-full hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-600 hover:border-red-200 transition-all duration-300 group transform hover:-translate-y-0.5 hover:shadow-lg font-medium"
              disabled={logoutLoading}
              aria-label="Sign out of account"
            >
              <MdLogout className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
              Log Out
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to log out? You will need to sign in again
                to access your account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="hover:bg-gray-100">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing Out...
                  </>
                ) : (
                  "Log Out"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  // Don't render until mounted
  if (!mounted) {
    return <SidebarSkeleton />;
  }

  // Show loading state
  if (loading) {
    return <SidebarSkeleton />;
  }

  // Show error state
  if (error) {
    console.log("Auth error:", error);
    return (
      <div className="w-64 bg-red-50 border-r flex flex-col h-screen sticky top-0 shadow-xl">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-600">
            <p className="text-sm">Authentication Error</p>
            <p className="text-xs mt-1">Please refresh the page</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gradient-to-b from-white to-gray-50/50 border-r flex flex-col h-screen sticky top-0 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-6 mb-2 flex justify-center items-center border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="relative group">
            <Image
              src="/assets/logo.png"
              alt="Logo"
              width={150}
              height={30}
              sizes="150px"
              className="transform hover:scale-105 transition-all duration-300 drop-shadow-sm"
              priority={true}
              quality={75}
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk蝄縛=="
              onError={() => console.warn("Logo failed to load")}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg blur-xl -z-10" />
          </div>
        </div>

        {/* Navigation Section */}
        <nav className={sidebarStyles.nav}>
          <div className="flex flex-col gap-1">
            {getFilteredNavigationItems(adminRole).map((item) => {
              // Regular navigation items
              const itemIsActive = isActive(item.href);
              const notificationCount = notificationCounts[item.href?.split("/").pop() || ""] || 0;

              return (
                <Link
                  key={item.name}
                  href={item.href || "#"}
                  className={cn(
                    sidebarStyles.navItem,
                    itemIsActive
                      ? sidebarStyles.activeNavItem
                      : sidebarStyles.inactiveNavItem
                  )}
                  aria-label={item.description}
                >
                  <item.icon className={cn(sidebarStyles.icon, "mr-3")} />
                  <span className="font-medium">{item.name}</span>
                  {notificationCount > 0 && (
                    <NotificationBadge count={notificationCount} />
                  )}
                  {itemIsActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full shadow-sm" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Profile Section */}
        {renderProfileSection()}
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute top-0 left-0 w-full h-screen bg-gradient-to-b from-transparent via-transparent to-gray-50/20 pointer-events-none" />
    </div>
  );
};

// Dynamic import with proper error handling
const Sidebar = dynamic(() => Promise.resolve(ClientSidebar), {
  ssr: false,
  loading: () => <SidebarSkeleton />,
});

// Wrap the default export with AdminAuthCheck
export default function ProtectedSidebar(props: SidebarProps) {
  return (
    <AdminAuthCheck>
      <Sidebar {...props} />
    </AdminAuthCheck>
  );
}
