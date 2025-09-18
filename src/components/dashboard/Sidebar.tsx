"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
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
  onSnapshot,
  doc,
  Unsubscribe,
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

// Memoized styles to prevent object recreation
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
} as const;

// Move static data outside component to prevent recreation
const navigationItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: MdOutlineDashboard,
    description: "Overview of system metrics",
  },
  {
    name: "Item List",
    href: "/admin/itemList",
    icon: TiThListOutline,
    description: "Manage items in the system",
  },
  {
    name: "User Management",
    href: "/admin/manageUsers",
    icon: MdOutlineManageAccounts,
    description: "Manage user accounts and permissions",
  },
  {
    name: "Team Members",
    href: "/admin/teamMembers",
    icon: RiTeamLine,
    description: "Manage admin team members",
  },
  {
    name: "Transactions",
    href: "/admin/transaction",
    icon: MdOutlinePayment,
    description: "View payment transactions",
  },
  {
    name: "Subscriptions",
    href: "/admin/subscription",
    icon: MdOutlineSubscriptions,
    description: "Monitor user subscriptions",
  },
  {
    name: "Support Tickets",
    href: "/admin/support",
    icon: MdOutlineSupportAgent,
    description: "Handle customer support requests",
  },
  {
    name: "User Issues",
    href: "/admin/reports",
    icon: MdOutlineReportProblem,
    description: "Handle user complaints and issues",
  },
  {
    name: "Announcements",
    href: "/admin/announcements",
    icon: MdCircleNotifications,
    description: "Manage system announcements",
  },
  {
    name: "User Log",
    href: "/admin/userLog",
    icon: MdOutlinePeople,
    description: "View user activity logs",
  },
] as const;

// Role access configuration with frozen object for better performance
type AllowedPath = string | "*";

const roleAccess = Object.freeze({
  superAdmin: ["*"] as AllowedPath[],
  admin: ["*"] as AllowedPath[],
  support: [
    "/admin",
    "/admin/support",
    "/admin/reports",
    "/admin/announcements",
    "/admin/subscription/subscriptionsList",
    "/admin/profile",
  ] as AllowedPath[],
  manageUsers: [
    "/admin",
    "/admin/manageUsers",
    "/admin/itemList",
    "/admin/transaction",
    "/admin/subscription",
    "/admin/profile",
  ] as AllowedPath[],
  financialViewer: [
    "/admin",
    "/admin/transaction",
    "/admin/subscription",
    "/admin/profile",
  ] as AllowedPath[],
  contentManager: [
    "/admin",
    "/admin/itemList",
    "/admin/announcements",
    "/admin/profile",
  ] as AllowedPath[],
});

// Memoized role-specific restrictions
const roleRestrictions = Object.freeze({
  support: new Set([
    "User Management",
    "Team Members",
    "Transactions",
    "Item List",
  ]),
  manageUsers: new Set([
    "Team Members",
    "Support Tickets",
    "User Issues",
    "Announcements",
  ]),
  financialViewer: new Set(["Dashboard", "Transactions", "Subscriptions"]),
  contentManager: new Set(["Dashboard", "Item List", "Announcements"]),
});

// Optimized access check with memoization
const hasAccess = (adminRole: string | null, path: string): boolean => {
  if (!adminRole || !path) return false;

  const allowedPaths = roleAccess[adminRole as keyof typeof roleAccess];
  if (allowedPaths.includes("*")) return true;

  if (allowedPaths.includes("*" as any)) return true;

  return allowedPaths.some(
    (allowedPath) => path === allowedPath || path.startsWith(allowedPath)
  );
};

// Memoized navigation filter
const getFilteredNavigationItems = (adminRole: string | null) => {
  if (!adminRole) return [];

  return navigationItems.filter((item) => {
    if (!item.href) return false;

    const hasItemAccess = hasAccess(adminRole, item.href);

    // Use Set lookup for better performance
    const restrictions =
      roleRestrictions[adminRole as keyof typeof roleRestrictions];
    if (restrictions) {
      if (adminRole === "financialViewer" || adminRole === "contentManager") {
        return restrictions.has(item.name);
      }
      return !restrictions.has(item.name);
    }

    return hasItemAccess;
  });
};

// Types
interface SidebarProps {
  currentPath?: string;
}

interface UserData {
  username: string | null;
  adminRole: string | null;
  profileImageUrl: string | null;
}

// Memoized skeleton component
const SidebarSkeleton = memo(() => (
  <div className="w-64 bg-gradient-to-b from-white to-gray-50/50 border-r flex flex-col h-screen sticky top-0 shadow-xl backdrop-blur-sm">
    <div className="flex-1 flex flex-col">
      <div className="p-6 mb-2 flex justify-center">
        <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
      </div>
      <nav className="flex-1 px-4">
        {Array.from({ length: 6 }, (_, i) => (
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
));

SidebarSkeleton.displayName = "SidebarSkeleton";

// Memoized navigation item component
const NavigationItem = memo(
  ({
    item,
    isActive,
    onClick,
  }: {
    item: (typeof navigationItems)[number];
    isActive: boolean;
    onClick?: () => void;
  }) => (
    <Link
      href={item.href || "#"}
      className={cn(
        sidebarStyles.navItem,
        isActive ? sidebarStyles.activeNavItem : sidebarStyles.inactiveNavItem
      )}
      aria-label={item.description}
      onClick={onClick}
    >
      <item.icon className={cn(sidebarStyles.icon, "mr-3")} />
      <span className="font-medium">{item.name}</span>
      {isActive && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full shadow-sm" />
      )}
    </Link>
  )
);

NavigationItem.displayName = "NavigationItem";

// Main client sidebar component with optimizations
const ClientSidebar = memo(({ currentPath }: SidebarProps) => {
  const [user, loading, error] = useAuthState(auth);
  const [userData, setUserData] = useState<UserData>({
    username: null,
    adminRole: null,
    profileImageUrl: null,
  });
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  const pathname = usePathname();

  // Memoized filtered navigation items
  const filteredNavigationItems = useMemo(
    () => getFilteredNavigationItems(userData.adminRole),
    [userData.adminRole]
  );

  // Memoized role badge style
  const roleBadgeStyle = useMemo(() => {
    switch (userData.adminRole) {
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
  }, [userData.adminRole]);

  // Memoized role display name
  const roleDisplayName = useMemo(() => {
    switch (userData.adminRole) {
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
        return userData.adminRole;
    }
  }, [userData.adminRole]);

  // Optimized isActive check with useMemo
  const isActive = useCallback(
    (href: string | undefined) => {
      if (!href || !pathname) return false;
      if (href === "/admin") return pathname === href;
      return pathname.startsWith(href);
    },
    [pathname]
  );

  // Handle mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Optimized user data listener with cleanup
  useEffect(() => {
    if (!user || loading) {
      setUserDataLoading(false);
      return;
    }

    let unsubscribe: Unsubscribe;
    setUserDataLoading(true);

    const setupListener = async () => {
      try {
        const adminQuery = query(
          collection(db, "admin"),
          where("email", "==", user.email)
        );

        unsubscribe = onSnapshot(adminQuery, {
          next: (querySnapshot) => {
            if (!querySnapshot.empty) {
              const adminDoc = querySnapshot.docs[0];
              const adminData = adminDoc.data();

              const newUserData: UserData = {
                username: adminData.username || null,
                adminRole: adminData.adminRole || null,
                profileImageUrl: adminData.profileImageUrl || null,
              };

              // Only update if data actually changed
              setUserData((prevData) => {
                if (
                  prevData.username !== newUserData.username ||
                  prevData.adminRole !== newUserData.adminRole ||
                  prevData.profileImageUrl !== newUserData.profileImageUrl
                ) {
                  return newUserData;
                }
                return prevData;
              });

              setImageError(false);

              // Update localStorage only if needed
              if (adminData.adminRole) {
                const currentRole = localStorage.getItem("adminRole");
                if (currentRole !== adminData.adminRole) {
                  localStorage.setItem("adminRole", adminData.adminRole);
                }
              }
            } else {
              setUserData({
                username: null,
                adminRole: null,
                profileImageUrl: null,
              });
              localStorage.removeItem("adminRole");
            }
            setUserDataLoading(false);
          },
          error: (error) => {
            console.error("Error in admin data listener:", error);
            setUserData({
              username: null,
              adminRole: null,
              profileImageUrl: null,
            });
            setUserDataLoading(false);
            localStorage.removeItem("adminRole");
          },
        });
      } catch (error) {
        console.error("Error setting up admin data listener:", error);
        setUserDataLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, loading]);

  // Optimized logout function with better error handling
  const handleLogout = useCallback(async () => {
    if (logoutLoading) return; // Prevent multiple calls

    setLogoutLoading(true);
    try {
      if (user) {
        // Create a batch of promises for better performance
        const logoutPromises: Promise<void>[] = [];

        // Update userLogs
        const updateUserLogs = async () => {
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
              const updatedLogs = [...loginLogs];
              const lastActiveIndex = updatedLogs.findIndex(
                (log) => log.lastLogout === null
              );

              if (lastActiveIndex !== -1) {
                updatedLogs[lastActiveIndex] = {
                  ...updatedLogs[lastActiveIndex],
                  lastLogout: new Date().toISOString(),
                };

                await updateDoc(userLogDoc.ref, {
                  loginLogs: updatedLogs,
                  updatedAt: new Date(),
                });
              }
            }
          }
        };

        // Update admin collection
        const updateAdminCollection = async () => {
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
        };

        logoutPromises.push(updateUserLogs(), updateAdminCollection());

        // Execute all promises concurrently
        await Promise.allSettled(logoutPromises);
      }

      // Clear localStorage
      localStorage.removeItem("adminRole");
      localStorage.removeItem("adminUid");
      localStorage.removeItem("isAuthenticated");

      // Sign out from Firebase Auth
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      // Still attempt to sign out even if Firestore update fails
      try {
        await signOut(auth);
        localStorage.clear();
      } catch (signOutError) {
        console.error("Critical error during logout:", signOutError);
      }
    } finally {
      setLogoutLoading(false);
    }
  }, [user, logoutLoading]);

  // Optimized beforeunload handler
  useEffect(() => {
    if (!user?.uid) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable data transmission
      const logoutData = {
        uid: user.uid,
        timestamp: new Date().toISOString(),
        action: "logout_beforeunload",
      };

      const blob = new Blob([JSON.stringify(logoutData)], {
        type: "application/json",
      });

      navigator.sendBeacon("/api/logout-beacon", blob);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user?.uid]);

  // Optimized image error handler
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Memoized profile section
  const profileSection = useMemo(() => {
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
            ) : userData.profileImageUrl && !imageError ? (
              <div className="w-16 h-16 rounded-full overflow-hidden relative border-3 border-primary/20 shadow-lg group-hover:border-primary/40 transition-all duration-300">
                <Image
                  src={userData.profileImageUrl}
                  alt="Profile"
                  fill
                  sizes="64px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
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
                  {userData.username || "No username"}
                </p>
                {userData.adminRole && (
                  <p
                    className={`text-xs mt-1 px-3 py-1 rounded-full font-medium ${roleBadgeStyle}`}
                  >
                    {roleDisplayName}
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
  }, [
    user,
    userDataLoading,
    userData,
    imageError,
    roleBadgeStyle,
    roleDisplayName,
    logoutLoading,
    handleImageError,
    handleLogout,
  ]);

  // Don't render until mounted
  if (!mounted) return <SidebarSkeleton />;
  if (loading) return <SidebarSkeleton />;

  // Show error state
  if (error) {
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
              priority={true}
              quality={75}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg blur-xl -z-10" />
          </div>
        </div>

        {/* Navigation Section */}
        <nav className={sidebarStyles.nav}>
          <div className="flex flex-col gap-1">
            {filteredNavigationItems.map((item) => (
              <NavigationItem
                key={item.name}
                item={item}
                isActive={isActive(item.href)}
              />
            ))}
          </div>
        </nav>

        {/* Profile Section */}
        {profileSection}
      </div>

      {/* Decorative gradient overlay */}
      <div className="absolute top-0 left-0 w-full h-screen bg-gradient-to-b from-transparent via-transparent to-gray-50/20 pointer-events-none" />
    </div>
  );
});

ClientSidebar.displayName = "ClientSidebar";

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
