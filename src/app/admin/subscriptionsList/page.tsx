"use client";
import { db } from "@/app/firebase/config";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Search,
  Users,
  Crown,
  Sparkles,
  Shield,
  Calendar,
  Mail,
  Filter,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
} from "lucide-react";
import { auth } from "@/app/firebase/config";
import { useRouter } from "next/navigation";

// First, update the types to include subscription dates
type SubscriptionDates = {
  startDate: Timestamp;
  endDate: Timestamp;
};

// First, update the User type to match the correct status type
type User = {
  id: string;
  email: string;
  currentPlan: {
    planId: string;
    planType: "Free" | "Basic" | "Premium";
    status: "Active" | "Inactive" | "Expired";
    subscriptionId: string;
  };
  status: string;
  firstname: string;
  amount: number;
  role: string;
};

// Add this timestamp validation helper at the top of your file
const isValidTimestamp = (timestamp: any): timestamp is Timestamp => {
  return (
    timestamp &&
    typeof timestamp === "object" &&
    "seconds" in timestamp &&
    "nanoseconds" in timestamp &&
    typeof timestamp.toDate === "function"
  );
};

// Update the AccessDenied component message
const AccessDenied = () => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
      <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-6">
        Sorry, only Super Admins and Manage Users can access this page.
      </p>
      <button
        onClick={() => (window.location.href = "/admin")}
        className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
      >
        Return to Dashboard
      </button>
    </div>
  </div>
);

export default function SubscriptionsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "plan" | "date">(
    "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Add this state for subscription dates
  const [subscriptionDates, setSubscriptionDates] = useState<{
    [key: string]: SubscriptionDates;
  }>({});

  // Notification state and helpers
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showSuccess = (message: string) => {
    setNotification({ type: "success", message });
    setTimeout(() => setNotification(null), 3000);
  };

  const showError = (message: string) => {
    setNotification({ type: "error", message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Add these states at the top of your component
  // const [userRole, setUserRole] = useState<string | null>(null);
  // const [authLoading, setAuthLoading] = useState(true);
  // const router = useRouter();

  // Fetch users from Firestore
  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "user"));
      const snapshot = await getDocs(q);
      const datesMap: { [key: string]: SubscriptionDates } = {};

      const userData = await Promise.all(
        snapshot.docs.map(async (userDoc) => {
          const d = userDoc.data();
          const currentPlan = {
            planId: d.currentPlan?.planId || "",
            planType: d.currentPlan?.planType
              ? d.currentPlan.planType.charAt(0).toUpperCase() +
                d.currentPlan.planType.slice(1).toLowerCase()
              : "Free",
            status: d.currentPlan?.status || "Inactive",
            subscriptionId: d.currentPlan?.subscriptionId || "",
          };

          if (currentPlan.subscriptionId) {
            try {
              const subscriptionDoc = await getDoc(
                doc(db, "subscription", currentPlan.subscriptionId)
              );

              if (subscriptionDoc.exists()) {
                const subData = subscriptionDoc.data();

                // Convert timestamps or create new ones
                let startDate: Timestamp;
                let endDate: Timestamp;

                // Handle startDate
                if (isValidTimestamp(subData.startDate)) {
                  startDate = subData.startDate;
                } else if (subData.startDate) {
                  startDate = Timestamp.fromDate(new Date(subData.startDate));
                } else {
                  startDate = Timestamp.fromDate(new Date());
                }

                // Handle endDate
                if (isValidTimestamp(subData.endDate)) {
                  endDate = subData.endDate;
                } else if (subData.endDate) {
                  endDate = Timestamp.fromDate(new Date(subData.endDate));
                } else {
                  endDate = Timestamp.fromDate(new Date());
                }

                datesMap[currentPlan.subscriptionId] = {
                  startDate,
                  endDate,
                };

                // Update status based on end date
                const now = new Date();
                const endDateTime = endDate.toDate();

                if (
                  endDateTime > now &&
                  currentPlan?.status.charAt(0).toUpperCase() +
                    currentPlan?.status.slice(1).toLowerCase() ===
                    "Active"
                ) {
                  currentPlan.status = "Active";
                } else if (endDateTime < now) {
                  currentPlan.status = "Expired";
                }
              }
            } catch (subError) {
              console.error("Error fetching subscription:", subError);
            }
          }

          return {
            id: userDoc.id,
            email: d.email || "",
            currentPlan,
            status: currentPlan.status,
            firstname: d.firstname || "N/A",
            amount: d.amount || 0,
            role: d.role || "user",
          };
        })
      );

      setSubscriptionDates(datesMap);
      setUsers(userData.filter((user) => user.role === "user"));
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      console.log("🔄 Starting data refresh...");

      // Clear existing data
      setUsers([]);
      setSubscriptionDates({});

      // Fetch fresh data from Firestore
      const q = query(collection(db, "users"), where("role", "==", "user"));
      const snapshot = await getDocs(q);
      const datesMap: { [key: string]: SubscriptionDates } = {};

      const userData = await Promise.all(
        snapshot.docs.map(async (userDoc) => {
          const d = userDoc.data();
          console.log(`📄 Processing user: ${userDoc.id}`);

          const currentPlan = {
            planId: d.currentPlan?.planId || "",
            planType: d.currentPlan?.planType
              ? d.currentPlan.planType.charAt(0).toUpperCase() +
                d.currentPlan.planType.slice(1).toLowerCase()
              : "Free",
            status: d.currentPlan?.status || "Inactive",
            subscriptionId: d.currentPlan?.subscriptionId || "",
          };

          // Fetch subscription data if exists
          if (currentPlan.subscriptionId) {
            try {
              console.log(
                `🔍 Fetching subscription: ${currentPlan.subscriptionId}`
              );
              const subscriptionDoc = await getDoc(
                doc(db, "subscription", currentPlan.subscriptionId)
              );

              if (subscriptionDoc.exists()) {
                const subData = subscriptionDoc.data();

                // Handle dates
                let startDate: Timestamp;
                let endDate: Timestamp;

                // Handle startDate
                if (isValidTimestamp(subData.startDate)) {
                  startDate = subData.startDate;
                } else if (subData.startDate) {
                  startDate = Timestamp.fromDate(new Date(subData.startDate));
                } else {
                  startDate = Timestamp.fromDate(new Date());
                }

                // Handle endDate
                if (isValidTimestamp(subData.endDate)) {
                  endDate = subData.endDate;
                } else if (subData.endDate) {
                  endDate = Timestamp.fromDate(new Date(subData.endDate));
                } else {
                  endDate = Timestamp.fromDate(new Date());
                }

                datesMap[currentPlan.subscriptionId] = {
                  startDate,
                  endDate,
                };

                // Update status based on end date
                const now = new Date();
                const endDateTime = endDate.toDate();

                if (endDateTime > now && currentPlan.status === "Active") {
                  currentPlan.status = "Active";
                } else if (endDateTime < now) {
                  currentPlan.status = "Expired";
                }
              }
            } catch (subError) {
              console.error("❌ Error fetching subscription:", subError);
            }
          }

          return {
            id: userDoc.id,
            email: d.email || "",
            currentPlan,
            status: currentPlan.status,
            firstname: d.firstname || "N/A",
            amount: d.amount || 0,
            role: d.role || "user",
          };
        })
      );

      // Update state with fresh data
      setSubscriptionDates(datesMap);
      setUsers(userData.filter((user) => user.role === "user"));

      console.log("✅ Data refresh completed successfully");
      showSuccess("Data refreshed successfully!");
    } catch (error) {
      console.error("❌ Error refreshing data:", error);
      showError("Failed to refresh data. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  // Count users by plan and status
  const userCountsByPlan = users.reduce((counts, user) => {
    if (["Free", "Basic", "Premium"].includes(user.currentPlan.planType)) {
      counts[user.currentPlan.planType] =
        (counts[user.currentPlan.planType] || 0) + 1;
    }
    return counts;
  }, {} as Record<string, number>);

  // Update the status counts calculation
  const statusCounts = users.reduce((counts, user) => {
    const subDates = user.currentPlan.subscriptionId
      ? subscriptionDates[user.currentPlan.subscriptionId]
      : null;

    const now = new Date();
    let status = "Inactive";

    if (subDates?.endDate) {
      const endDateTime = subDates.endDate.toDate();
      if (endDateTime > now && user.currentPlan.status === "Active") {
        status = "Active";
      } else if (endDateTime < now) {
        status = "Expired";
      }
    }

    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Filter and sort users
  const filteredAndSortedUsers = users
    .filter((user) => {
      // First check the search term
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.currentPlan.planType
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      // Get subscription dates for status check
      const subDates = user.currentPlan.subscriptionId
        ? subscriptionDates[user.currentPlan.subscriptionId]
        : null;

      // Check status based on current date and subscription end date
      const now = new Date();
      let currentStatus = "inactive";

      if (subDates?.endDate) {
        const endDateTime = subDates.endDate.toDate();
        if (endDateTime > now && user.currentPlan.status === "Active") {
          currentStatus = "active";
        } else if (endDateTime < now) {
          currentStatus = "expired";
        }
      }

      // Apply filters
      if (currentTab === "all") return matchesSearch;
      if (currentTab === "active") {
        return matchesSearch && currentStatus === "active";
      }
      if (currentTab === "expired") {
        return matchesSearch && currentStatus === "expired";
      }
      if (currentTab === "inactive") {
        return matchesSearch && currentStatus === "inactive";
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.firstname.toLowerCase();
          bValue = b.firstname.toLowerCase();
          break;
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case "plan":
          aValue = a.currentPlan.planType;
          bValue = b.currentPlan.planType;
          break;
        case "date":
          const aDate = a.currentPlan.subscriptionId
            ? subscriptionDates[a.currentPlan.subscriptionId]?.endDate
            : null;
          const bDate = b.currentPlan.subscriptionId
            ? subscriptionDates[b.currentPlan.subscriptionId]?.endDate
            : null;
          aValue = aDate ? aDate.toDate().getTime() : 0;
          bValue = bDate ? bDate.toDate().getTime() : 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Helper functions
  const formatDate = (timestamp: Timestamp | null | undefined): string => {
    if (!timestamp || !isValidTimestamp(timestamp)) return "N/A";
    try {
      return timestamp.toDate().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "N/A";
    }
  };

  const getFormattedStatus = (status: string, endDate: Timestamp | null) => {
    if (!endDate) {
      return {
        text: "Inactive",
        className: "bg-gray-100 text-gray-700 border border-gray-200",
        icon: AlertCircle,
        hasIndicator: false,
      };
    }

    try {
      const now = new Date();
      const expiryDate = endDate.toDate();

      if (expiryDate > now && status.toLowerCase() === "active") {
        return {
          text: "Active",
          className: "bg-green-50 text-green-700 border border-green-200",
          icon: CheckCircle,
          hasIndicator: true,
        };
      } else if (expiryDate < now) {
        return {
          text: "Expired",
          className: "bg-red-50 text-red-700 border border-red-200",
          icon: XCircle,
          hasIndicator: false,
        };
      }
      return {
        text: "Inactive",
        className: "bg-gray-50 text-gray-700 border border-gray-200",
        icon: AlertCircle,
        hasIndicator: false,
      };
    } catch (error) {
      console.error("Error formatting status:", error);
      return {
        text: "Inactive",
        className: "bg-gray-50 text-gray-700 border border-gray-200",
        icon: AlertCircle,
        hasIndicator: false,
      };
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType.toLowerCase()) {
      case "premium":
        return Crown;
      case "basic":
        return Sparkles;
      default:
        return Shield;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType.toLowerCase()) {
      case "premium":
        return "from-purple-500 to-pink-500";
      case "basic":
        return "from-blue-500 to-cyan-500";
      default:
        return "from-gray-400 to-gray-600";
    }
  };

  const handleSort = (column: "name" | "email" | "plan" | "date") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 bg-white p-12 rounded-3xl shadow-2xl border border-gray-100"
        >
          <div className="relative">
            <div className="w-16 h-16 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-20 animate-ping"></div>
              <div className="absolute inset-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-30 animate-ping animation-delay-200"></div>
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 relative z-10" />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-gray-900">
              Loading Subscriptions
            </h3>
            <p className="text-gray-500 text-lg">
              Fetching the latest user data...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 opacity-10"></div>
        <div className="relative z-10 text-center py-16 px-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-4 mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-lg opacity-30"></div>
              <div className="relative p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-2xl">
                <img
                  src="/assets/logoWhite.png"
                  className="w-12 h-12 object-contain"
                  alt="Logo"
                />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                Subscription List
              </h1>
              <p className="text-xl text-gray-600 mt-2 font-medium">
                List Users Subscription
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "6rem" }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto shadow-lg"
          ></motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12 -mt-8 relative z-10">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between mb-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
        >
          <div className="flex space-x-3">
            <button className="flex items-center px-6 py-3 text-indigo-700 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl font-semibold shadow-sm border border-indigo-200 transition-all hover:shadow-md">
              <Users className="h-5 w-5 mr-2" />
              Subscribers List
            </button>
            <Link
              href="/admin/subscription"
              className="flex items-center px-6 py-3 text-gray-600 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-all hover:shadow-md font-medium"
            >
              <Shield className="h-5 w-5 mr-2" />
              Plans Management
            </Link>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 text-gray-600 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Plan Cards */}
          {Object.entries(userCountsByPlan).map(([plan, count], index) => {
            const Icon = getPlanIcon(plan);
            const gradientColor = getPlanColor(plan);

            return (
              <motion.div
                key={plan}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="group cursor-pointer"
                onClick={() => {
                  setSearchTerm(plan);
                  setCurrentTab("all");
                }}
              >
                <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-5 group-hover:opacity-10 transition-opacity`}
                  ></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`p-3 bg-gradient-to-br ${gradientColor} rounded-xl shadow-lg`}
                      >
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">
                        {plan} Plan
                      </p>
                      <h3 className="text-3xl font-black text-gray-800 mt-1">
                        {count.toLocaleString()}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Total subscribers
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Total Users Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wide">
                  Growth
                </div>
                <div className="text-green-500 text-sm font-semibold">+12%</div>
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">
                Total Users
              </p>
              <h3 className="text-3xl font-black text-gray-800 mt-1">
                {users.length.toLocaleString()}
              </h3>
              <p className="text-sm text-gray-400 mt-1">All subscribers</p>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-xl mb-8 p-6 border border-gray-100"
        >
          <div className="lg:flex items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex-1 lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  className="pl-12 pr-4 py-3 w-full bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                  placeholder="Search by name, email, or plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Tab Filters */}
            <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl">
              {[
                { key: "all", label: "All", count: users.length },
                {
                  key: "active",
                  label: "Active",
                  count: statusCounts.Active || 0,
                },
                {
                  key: "expired",
                  label: "Expired",
                  count: statusCounts.Expired || 0,
                },
                {
                  key: "inactive",
                  label: "Inactive",
                  count: statusCounts.Inactive || 0,
                },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setCurrentTab(tab.key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentTab === tab.key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                Sort by:
              </span>
            </div>
            {[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "plan", label: "Plan" },
              { key: "date", label: "End Date" },
            ].map((sort) => (
              <button
                key={sort.key}
                onClick={() => handleSort(sort.key as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  sortBy === sort.key
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {sort.label}
                {sortBy === sort.key && (
                  <span className="ml-1">
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Enhanced Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {filteredAndSortedUsers.map((user, index) => {
                    const subDates = user.currentPlan.subscriptionId
                      ? subscriptionDates[user.currentPlan.subscriptionId]
                      : null;

                    const formattedStatus = getFormattedStatus(
                      user.currentPlan.status,
                      subDates?.endDate || null
                    );

                    const PlanIcon = getPlanIcon(user.currentPlan.planType);
                    const StatusIcon = formattedStatus.icon;

                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-all group"
                      >
                        {/* User Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {user.firstname.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {user.firstname}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`p-2 bg-gradient-to-br ${getPlanColor(
                                user.currentPlan.planType
                              )} rounded-lg shadow-sm`}
                            >
                              <PlanIcon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {user.currentPlan.planType}
                              </div>
                              <div className="text-xs text-gray-500">
                                {user.currentPlan.planType === "Free"
                                  ? "No cost"
                                  : "Premium features"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="flex items-center text-gray-600 mb-1">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span className="font-medium">Start:</span>
                              <span className="ml-1">
                                {subDates
                                  ? formatDate(subDates.startDate)
                                  : "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <Clock className="h-3 w-3 mr-1" />
                              <span className="font-medium">End:</span>
                              <span className="ml-1">
                                {subDates
                                  ? formatDate(subDates.endDate)
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <div
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${formattedStatus.className}`}
                          >
                            <StatusIcon className="h-4 w-4 mr-2" />
                            {formattedStatus.text}
                            {formattedStatus.hasIndicator && (
                              <div className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {filteredAndSortedUsers.length} of {users.length}{" "}
                subscribers
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">
                  Previous
                </button>
                <div className="flex space-x-1">
                  <button className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded">
                    1
                  </button>
                  <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
                    2
                  </button>
                  <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
                    3
                  </button>
                </div>
                <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900">
                  Next
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Empty State */}
        {filteredAndSortedUsers.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No subscribers found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? `No results for "${searchTerm}". Try adjusting your search.`
                : "No subscribers match the current filter criteria."}
            </p>
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentTab("all");
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Clear Filters
            </button>
          </motion.div>
        )}

        {/* Notification Component */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <div className="flex items-center">
              {notification.type === "success" ? (
                <CheckCircle className="h-5 w-5 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
