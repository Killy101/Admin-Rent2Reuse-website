"use client"; // Enable client-side rendering in Next.js

// Import necessary libraries and components
import { useEffect, useState } from "react";
import { db } from "@/app/firebase/config";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  getDoc,
} from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  FiUsers,
  FiSearch,
  FiFilter,
  FiDownload,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiEye,
  FiGrid,
  FiList,
  FiShield,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { Timestamp } from "firebase/firestore"; // Import Timestamp type
import { auth } from "@/app/firebase/config"; // Import auth from Firebase
import { useRouter } from "next/navigation";

// Interface for user data structure
interface UserData {
  uid: string;
  email: string;
  firstname: string;
  lastname: string;
  middlename: string;
  birthday: any;
  contactNumber: string;
  location: {
    address: string;
    latitude: string;
    longitude: string;
    updated: string;
  };
  role: string;
  currentPlan: {
    planType: "Free" | "Basic" | "Premium";
    status: "Active" | "Inactive";
    subscriptionId?: string;
  };
  profileImage: string;
  rating: number;
  joinedDate: string;
}

// Interface for subscription date tracking
interface SubscriptionDates {
  startDate: Timestamp | null;
  endDate: Timestamp | null;
}

// Interface for tracking plan statistics
interface PlanStats {
  Free: number;
  Basic: number;
  Premium: number;
}

export default function UsersPage() {
  // State management for users and UI controls
  const [users, setUsers] = useState<UserData[]>([]); // Store all users
  const [search, setSearch] = useState(""); // Search input value
  const [loading, setLoading] = useState(true); // Loading state
  const [planStats, setPlanStats] = useState<PlanStats>({
    Free: 0,
    Basic: 0,
    Premium: 0,
  }); // Track plan statistics

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 12; // Number of users per page

  // Store subscription dates for each user
  const [subscriptionDates, setSubscriptionDates] = useState<{
    [key: string]: SubscriptionDates;
  }>({});

  // Filter state management
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    plan: "all",
    verification: "all",
  });

  // Toggle between table and grid view
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Auth states
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const router = useRouter();

  // Fetch users data and calculate stats on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "users"), where("role", "==", "user"));
        const querySnapshot = await getDocs(q);
        const userList: UserData[] = [];
        const datesMap: { [key: string]: SubscriptionDates } = {};
        const stats = { Free: 0, Basic: 0, Premium: 0 };

        for (const userDoc of querySnapshot.docs) {
          try {
            const data = userDoc.data();
            const currentPlan = {
              planType: data.currentPlan?.planType
                ? data.currentPlan.planType.charAt(0).toUpperCase() +
                  data.currentPlan.planType.slice(1).toLowerCase()
                : "Free",
              status: data.currentPlan?.status || "Inactive",
              subscriptionId: data.currentPlan?.subscriptionId || "",
            };

            // Fetch subscription dates and check status
            if (currentPlan.subscriptionId) {
              try {
                const subscriptionDoc = await getDoc(
                  doc(db, "subscription", currentPlan.subscriptionId)
                );

                if (subscriptionDoc.exists()) {
                  const subData = subscriptionDoc.data();

                  // Convert timestamps safely
                  let startDate = null;
                  let endDate = null;

                  try {
                    // Handle startDate
                    if (isValidTimestamp(subData.startDate)) {
                      startDate = subData.startDate;
                    } else if (subData.startDate) {
                      startDate = Timestamp.fromDate(
                        new Date(subData.startDate)
                      );
                    }

                    // Handle endDate
                    if (isValidTimestamp(subData.endDate)) {
                      endDate = subData.endDate;
                    } else if (subData.endDate) {
                      endDate = Timestamp.fromDate(new Date(subData.endDate));
                    }

                    datesMap[currentPlan.subscriptionId] = {
                      startDate,
                      endDate,
                    };

                    // Check subscription status
                    if (endDate) {
                      const now = new Date();
                      const endDateTime = endDate.toDate();
                      currentPlan.status =
                        endDateTime > now ? "Active" : "Expired";
                    }
                  } catch (error) {
                    console.error(
                      "Error processing subscription dates:",
                      error
                    );
                    currentPlan.status = "Inactive";
                  }
                }
              } catch (subError) {
                console.error("Error fetching subscription:", subError);
              }
            }

            // Count plans
            if (currentPlan.planType) {
              stats[currentPlan.planType as keyof typeof stats]++;
            }

            userList.push({
              uid: userDoc.id,
              email: data.email || "",
              firstname: data.firstname || "",
              lastname: data.lastname || "",
              middlename: data.middlename || "",
              birthday: data.birthday || "",
              contactNumber: data.contactNumber || "",
              location: data.location || {
                address: "No address provided",
                latitude: "",
                longitude: "",
                updated: "",
              },
              role: data.role || "user",
              currentPlan: currentPlan,
              profileImage: data.profileImage || "/api/placeholder/150/150",
              rating: data.rating || 0,
              joinedDate: data.joinedDate || "",
            });
          } catch (userError) {
            console.error("Error processing user:", userError);
          }
        }

        setUsers(userList);
        setSubscriptionDates(datesMap);
        setPlanStats(stats);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Check permissions on mount
  // useEffect(() => {
  //   const checkPermissions = async () => {
  //     setAuthLoading(true);
  //     try {
  //       const user = auth.currentUser;

  //       if (!user) {
  //         router.push("/auth/signin");
  //         return;
  //       }

  //       const adminDoc = await getDoc(doc(db, "admin", user.uid));

  //       if (!adminDoc.exists()) {
  //         setUserRole(null);
  //         setAuthLoading(false);
  //         return;
  //       }

  //       const role = adminDoc.data().role;
  //       setUserRole(role);
  //     } catch (error) {
  //       console.error("Error checking permissions:", error);
  //       setUserRole(null);
  //     } finally {
  //       setAuthLoading(false);
  //     }
  //   };

  //   checkPermissions();
  // }, []);

  // Utility function to get plan color classes
  const getPlanColorClass = (planType: string) => {
    switch (planType) {
      case "Premium":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
      case "Basic":
        return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white";
      case "Free":
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
      default:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-white";
    }
  };

  // Utility function to get status color classes
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 border border-green-200";
      case "Expired":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    }
  };

  // Get plan badge color
  const getPlanBadgeClass = (planType: string) => {
    switch (planType) {
      case "Premium":
        return "bg-purple-100 text-purple-800 border border-purple-200";
      case "Basic":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Free":
        return "bg-gray-100 text-gray-800 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  // Filter users based on search and filter criteria
  const getFilteredUsers = () => {
    if (!users) return [];

    return users.filter((user) => {
      try {
        const fullName = `${user.firstname || ""} ${user.lastname || ""} ${
          user.email || ""
        }`;
        const matchesSearch = fullName
          .toLowerCase()
          .includes((search || "").toLowerCase());

        const matchesStatus =
          filters.status === "all" ||
          user.currentPlan?.status === filters.status;

        const matchesPlan =
          filters.plan === "all" || user.currentPlan?.planType === filters.plan;

        const matchesVerification =
          filters.verification === "all" ||
          (filters.verification === "verified" &&
            user.currentPlan?.status === "Active") ||
          (filters.verification === "pending" &&
            user.currentPlan?.status !== "Active");

        return (
          matchesSearch && matchesStatus && matchesPlan && matchesVerification
        );
      } catch (error) {
        console.error("Error filtering user:", error);
        return false;
      }
    });
  };

  // Calculate pagination values
  const filteredUsers = getFilteredUsers();
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  // Format date helper function
  const formatDate = (date: any): string => {
    try {
      if (!date) return "N/A";

      if (isValidTimestamp(date)) {
        return date.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }

      if (date instanceof Date) {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }

      // Handle string dates
      if (typeof date === "string") {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      }

      return "Invalid date";
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Star rating component
  const StarRating = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400" : "text-gray-300"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 15.585l-5.292 2.785 1.010-5.891-4.281-4.172 5.915-.861L10 2.5l2.648 5.046 5.915.861-4.281 4.172 1.010 5.891z"
              clipRule="evenodd"
            />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Export users data to CSV
  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Plan Type",
      "Status",
      "Contact Number",
      "Join Date",
    ];

    const csvData = filteredUsers.map((user) => [
      `${user.firstname} ${user.lastname}`,
      user.email,
      user.currentPlan.planType,
      user.currentPlan.status,
      user.contactNumber,
      user.joinedDate,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `users_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination component
  const Pagination = () => {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white border-t">
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{" "}
          <span className="font-medium">
            {Math.min(indexOfLastUser, filteredUsers.length)}
          </span>{" "}
          of <span className="font-medium">{filteredUsers.length}</span> users
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>
          {[...Array(Math.min(5, totalPages))].map((_, idx) => {
            const pageNum = idx + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
                ${
                  currentPage === pageNum
                    ? "bg-blue-600 text-white shadow-lg"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  // Grid view component for card layout
  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {currentUsers.map((user) => {
        const subDates = user.currentPlan.subscriptionId
          ? subscriptionDates[user.currentPlan.subscriptionId]
          : null;
        const isExpired = subDates?.endDate
          ? subDates.endDate.toDate() < new Date()
          : false;

        return (
          <div
            key={user.uid}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex flex-col items-center mb-4">
              <img
                src={user.profileImage}
                alt={user.firstname}
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-100 shadow-md mb-3"
              />
              <h3 className="font-semibold text-lg text-gray-900 text-center">
                {user.firstname} {user.lastname}
              </h3>
              <div className="mt-2">
                <StarRating rating={user.rating} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <FiMail className="w-4 h-4 mr-2 text-gray-400" />
                <span className="truncate">{user.email}</span>
              </div>

              {user.contactNumber && (
                <div className="flex items-center text-sm text-gray-600">
                  <FiPhone className="w-4 h-4 mr-2 text-gray-400" />
                  <span>{user.contactNumber}</span>
                </div>
              )}

              <div className="flex items-center text-sm text-gray-600">
                <FiMapPin className="w-4 h-4 mr-2 text-gray-400" />
                <span className="truncate">
                  {user.location.address || "No address"}
                </span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <FiCalendar className="w-4 h-4 mr-2 text-gray-400" />
                <span>Joined {user.joinedDate}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <span
                className={`${getPlanColorClass(
                  user.currentPlan.planType
                )} px-3 py-2 rounded-lg text-sm font-medium text-center shadow-sm`}
              >
                {user.currentPlan.planType} Plan
              </span>

              <span
                className={`${getStatusColorClass(
                  isExpired ? "Expired" : user.currentPlan.status
                )} px-3 py-2 rounded-lg text-sm font-medium text-center shadow-sm`}
              >
                {isExpired ? "Expired" : user.currentPlan.status}
              </span>
            </div>

            {subDates && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Start: {formatDate(subDates.startDate)}</div>
                  <div>End: {formatDate(subDates.endDate)}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Table view component for list layout
  const TableView = () => (
    <div className="overflow-x-auto">
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-6 bg-gray-50 border-b text-sm font-medium text-gray-700 uppercase tracking-wider">
          <div className="col-span-1 flex items-center">Image</div>
          <div className="col-span-3 flex items-center">Name</div>
          <div className="col-span-2 flex items-center">Plan</div>
          <div className="col-span-3 flex items-center">
            Contact (Email/Phone)
          </div>
          <div className="col-span-3 flex items-center">Status</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {currentUsers.map((user) => {
            const subDates = user.currentPlan.subscriptionId
              ? subscriptionDates[user.currentPlan.subscriptionId]
              : null;
            const isExpired = subDates?.endDate
              ? subDates.endDate.toDate() < new Date()
              : false;

            return (
              <div
                key={user.uid}
                className="grid grid-cols-12 gap-4 p-6 hover:bg-gray-50 transition-colors items-center"
              >
                {/* Image - Aligned center */}
                <div className="col-span-1 flex justify-center">
                  <img
                    src={user.profileImage}
                    alt={user.firstname}
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  />
                </div>

                {/* Name - Left aligned */}
                <div className="col-span-3">
                  <div className="font-semibold text-gray-900">
                    {user.firstname} {user.lastname}
                  </div>
                  <div className="text-sm text-gray-600 truncate max-w-[200px]">
                    {user.email}
                  </div>
                  <div className="mt-1">
                    <StarRating rating={user.rating} />
                  </div>
                </div>

                {/* Plan - Left aligned with consistent spacing */}
                <div className="col-span-2 space-y-2">
                  <span
                    className={`${getPlanBadgeClass(
                      user.currentPlan.planType
                    )} px-3 py-1 rounded-full text-sm font-medium inline-block`}
                  >
                    {user.currentPlan.planType}
                  </span>
                  <div className="text-sm text-gray-500">
                    {user.currentPlan.planType === "Premium"
                      ? "₱199/month"
                      : user.currentPlan.planType === "Basic"
                      ? "₱99/month"
                      : "Free"}
                  </div>
                </div>

                {/* Contact - Left aligned with consistent layout */}
                <div className="col-span-3 space-y-1">
                  <div className="flex items-center text-gray-600 text-sm">
                    <FiMail className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{user.email}</span>
                  </div>
                  {user.contactNumber && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <FiPhone className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{user.contactNumber}</span>
                    </div>
                  )}
                </div>

                {/* Status - Left aligned with consistent spacing */}
                <div className="col-span-3 space-y-2">
                  <span
                    className={`${getStatusColorClass(
                      isExpired ? "Expired" : user.currentPlan.status
                    )} px-3 py-1 rounded-full text-sm font-medium inline-block`}
                  >
                    {isExpired ? "Expired" : user.currentPlan.status}
                  </span>
                  {subDates && (
                    <div className="text-sm text-gray-500">
                      Ends: {formatDate(subDates.endDate)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Timestamp validation function
  const isValidTimestamp = (timestamp: any): timestamp is Timestamp => {
    return (
      timestamp &&
      typeof timestamp === "object" &&
      "seconds" in timestamp &&
      "nanoseconds" in timestamp &&
      typeof timestamp.toDate === "function"
    );
  };

  // Access Denied component
  // const AccessDenied = () => (
  //   <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
  //     <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
  //       <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
  //         <FiShield className="w-8 h-8 text-red-600" />
  //       </div>
  //       <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
  //       <p className="text-gray-600 mb-6">
  //         Sorry, only Super Admins and Manage Users can access this page.
  //       </p>
  //       <button
  //         onClick={() => (window.location.href = "/admin")}
  //         className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
  //       >
  //         Return to Dashboard
  //       </button>
  //     </div>
  //   </div>
  // );

  // // Add these checks before your main render
  // if (authLoading) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
  //         <p className="text-gray-600">Checking permissions...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Check if user has required role
  // if (!userRole || (userRole !== "superAdmin" && userRole !== "manageUsers")) {
  //   return <AccessDenied />;
  // }

  // Main component render
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 space-y-6">
      {/* Header section with logo and title */}
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <img
                    src="/assets/logoWhite.png"
                    className="w-8 h-8 object-contain"
                    alt="Logo"
                  />
                </div>
                <div>
                  <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                    Users Dashboard
                  </h1>
                  <p className="text-lg text-gray-600 mt-2">
                    Monitor all user accounts efficiently
                  </p>
                </div>
              </div>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"></div>
            </motion.div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {users.length}
            </div>
            <div className="text-sm text-gray-500">Total Users</div>
          </div>
        </div>
      </div>

      {/* Stats grid showing user plan distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-purple-700 flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiUsers className="w-5 h-5 text-purple-600" />
              </div>
              Premium Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {planStats.Premium}
            </div>
            <div className="text-sm text-purple-600 mt-1">₱199 per month</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-blue-700 flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiUsers className="w-5 h-5 text-blue-600" />
              </div>
              Basic Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {planStats.Basic}
            </div>
            <div className="text-sm text-blue-600 mt-1">₱99 per month</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FiUsers className="w-5 h-5 text-gray-600" />
              </div>
              Free Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {planStats.Free}
            </div>
            <div className="text-sm text-gray-600 mt-1">Free plan</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filter controls */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>
          <div className="flex gap-3 relative">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center px-4 py-2 rounded-md transition-all ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <FiList className="w-4 h-4 mr-2" />
                Table
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center px-4 py-2 rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <FiGrid className="w-4 h-4 mr-2" />
                Grid
              </button>
            </div>

            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center px-6 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-medium"
            >
              <FiFilter className="mr-2 w-5 h-5" />
              Filters
              {Object.values(filters).some((value) => value !== "all") && (
                <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center px-6 py-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all font-medium"
            >
              <FiDownload className="mr-2 w-5 h-5" />
              Export
            </button>

            {/* Filter Dropdown */}
            {filterOpen && (
              <div className="absolute top-14 right-0 w-80 bg-white rounded-xl shadow-xl z-50 border border-gray-200">
                <div className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Filter Users</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, status: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Plan Type
                      </label>
                      <select
                        value={filters.plan}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, plan: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 p-3 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Plans</option>
                        <option value="Free">Free</option>
                        <option value="Basic">Basic</option>
                        <option value="Premium">Premium</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => {
                          setFilters({
                            status: "all",
                            plan: "all",
                            verification: "all",
                          });
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User list section with table/grid toggle */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {viewMode === "table" ? <TableView /> : <GridView />}
            {filteredUsers.length > 0 && <Pagination />}
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg">No users found</div>
                <p className="text-gray-500 mt-2">Try adjusting your filters</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
