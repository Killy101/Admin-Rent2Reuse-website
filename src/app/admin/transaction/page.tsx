"use client"; // Enable client-side rendering for Next.js

// Import necessary dependencies for UI components, Firebase, and utilities
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { Dialog } from "@headlessui/react";
import {
  X,
  Search,
  Download,
  Filter,
  ChevronDown,
  Eye,
  Calendar,
  CreditCard,
  User,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/app/firebase/config"; // Import auth from Firebase config
import { useRouter } from "next/navigation"; // Import useRouter from Next.js

// Define Transaction interface for type safety
interface Transaction {
  cTransactionId: string; // Custom transaction ID
  transactionId: string; // Original transaction ID
  userId: string; // User who made the transaction
  subscriptionId?: string; // Optional subscription reference
  subscription?: {
    // Subscription date details
    startDate?: Timestamp;
    endDate?: Timestamp;
  };
  planId: string;
  planDetails: {
    planType: string;
  };
  amount: number;
  paymentMethod: string;
  paymentProofUrl?: string;
  status: "pending" | "success" | "rejected" | "refunded";
  adminRemarks?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  createdAt: Timestamp;
  paypalOrderId?: string;
  paypalTransactionId?: string;
}

// Updated sort types to include more fields
type SortDirection = "asc" | "desc";
type SortField =
  | "cTransactionId"
  | "createdAt"
  | "amount"
  | "userId"
  | "status"
  | "planType";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Helper function to format dates from Firebase Timestamp
const formatDate = (timestamp: Timestamp | null | undefined): string => {
  try {
    if (!timestamp || !isValidTimestamp(timestamp)) return "N/A";
    return format(timestamp.toDate(), "MMM dd, yyyy");
  } catch (error) {
    console.log("Error formatting date:", error);
    return "Invalid Date";
  }
};

// Helper function to format currency amounts
const formatAmount = (amount: number | undefined): string => {
  if (amount === undefined || isNaN(amount)) {
    return "₱0.00";
  }
  return `₱${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })}`;
};

// Helper function to get appropriate status icon
const getStatusIcon = (status: string) => {
  switch (status) {
    case "success":
      return <CheckCircle className="w-4 h-4" />;
    case "pending":
      return <Clock className="w-4 h-4" />;
    case "rejected":
      return <XCircle className="w-4 h-4" />;
    case "refunded":
      return <AlertCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

// Check if the timestamp is valid
const isValidTimestamp = (timestamp: any): timestamp is Timestamp => {
  try {
    return (
      timestamp &&
      typeof timestamp === "object" &&
      "seconds" in timestamp &&
      "nanoseconds" in timestamp &&
      typeof timestamp.toDate === "function"
    );
  } catch (error) {
    console.log("Invalid timestamp:", error);
    return false;
  }
};

// Helper function to get sort icon
const getSortIcon = (field: SortField, currentSort: SortConfig) => {
  if (currentSort.field !== field) {
    return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
  }
  return currentSort.direction === "asc" ? (
    <ArrowUp className="w-4 h-4 text-blue-600" />
  ) : (
    <ArrowDown className="w-4 h-4 text-blue-600" />
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "success":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case "pending":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          icon: <Clock className="w-4 h-4" />,
        };
      case "rejected":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          icon: <XCircle className="w-4 h-4" />,
        };
      case "refunded":
        return {
          bg: "bg-orange-100",
          text: "text-orange-700",
          icon: <AlertCircle className="w-4 h-4" />,
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-700",
          icon: <AlertCircle className="w-4 h-4" />,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}
    >
      {config.icon}
      <span className="ml-2">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </span>
  );
};

export default function AdminTransactionsPage() {
  // State management for transactions and UI
  const [transactions, setTransactions] = useState<Transaction[]>([]); // Store all transactions
  const [loading, setLoading] = useState(true); // Loading state
  const [proofModal, setProofModal] = useState<string | null>(null); // Payment proof modal
  const [searchTerm, setSearchTerm] = useState(""); // Search input
  const [statusFilter, setStatusFilter] = useState<string>("all"); // Status filter
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [planTypeFilter, setPlanTypeFilter] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");

  // Updated sort state with proper default
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "createdAt",
    direction: "desc",
  });

  const router = useRouter();

  // Move these hooks inside the component
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Add the permission check useEffect
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
  //       console.log("Error checking permissions:", error);
  //       setUserRole(null);
  //     } finally {
  //       setAuthLoading(false);
  //     }
  //   };

  //   checkPermissions();
  // }, []);

  // Fetch transactions data on component mount
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setError(null);
        setLoading(true);

        const querySnapshot = await getDocs(collection(db, "transactions"));
        const data: Transaction[] = await Promise.all(
          querySnapshot.docs.map(async (docSnap, index) => {
            const data = docSnap.data();
            let subscriptionData = null;

            if (data.subscriptionId) {
              try {
                const subscriptionDoc = await getDoc(
                  doc(db, "subscription", data.subscriptionId)
                );
                if (subscriptionDoc.exists()) {
                  subscriptionData = subscriptionDoc.data();
                }
              } catch (error) {
                console.log("Error fetching subscription:", error);
              }
            }

            return {
              ...data,
              // Create unique cTransactionId using document ID and index to ensure uniqueness
              cTransactionId: `TXN-${docSnap.id
                .slice(-8)
                .toUpperCase()}-${String(index + 1).padStart(4, "0")}`,
              transactionId: data.transactionId || docSnap.id,
              startDate: subscriptionData?.startDate || data.startDate || null,
              endDate: subscriptionData?.endDate || data.endDate || null,
              createdAt: data.createdAt || data.createAt || Timestamp.now(), // Fallback to current time if missing
              subscription: subscriptionData || data.subscription || {},
              amount: Number(data.amount) || 0, // Ensure amount is always a number
              planDetails: data.planDetails || { planType: "Unknown" }, // Ensure planDetails exists
            } as Transaction;
          })
        );

        setTransactions(data);
      } catch (error) {
        console.log("Error fetching transactions:", error);
        setError("Failed to fetch transactions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Filter transactions based on search and filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch =
        txn.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.cTransactionId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || txn.status === statusFilter;

      const matchesPlanType =
        !planTypeFilter ||
        txn.planDetails?.planType?.toLowerCase() ===
          planTypeFilter.toLowerCase();

      const matchesPaymentMethod =
        !paymentMethodFilter ||
        txn.paymentMethod?.toLowerCase() === paymentMethodFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPlanType &&
        matchesPaymentMethod
      );
    });
  }, [
    transactions,
    searchTerm,
    statusFilter,
    planTypeFilter,
    paymentMethodFilter,
  ]);

  // Sorting function
  const handleSort = (field: SortField) => {
    setSortConfig((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Sort and filter transactions
  const sortedAndFilteredTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;

      switch (sortConfig.field) {
        case "createdAt":
          return (
            ((a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)) *
            direction
          );
        case "cTransactionId":
          return a.cTransactionId.localeCompare(b.cTransactionId) * direction;
        case "amount":
          return ((a.amount || 0) - (b.amount || 0)) * direction;
        case "userId":
          return a.userId.localeCompare(b.userId) * direction;
        case "status":
          return a.status.localeCompare(b.status) * direction;
        case "planType":
          const aPlan = a.planDetails?.planType || "";
          const bPlan = b.planDetails?.planType || "";
          return aPlan.localeCompare(bPlan) * direction;
        default:
          return 0;
      }
    });
  }, [filteredTransactions, sortConfig]);

  // Calculate stats
  const stats = useMemo(
    () => ({
      total: transactions.length,
      pending: transactions.filter((t) => t.status === "pending").length,
      success: transactions.filter((t) => t.status === "success").length,
      rejected: transactions.filter((t) => t.status === "rejected").length,
      refunded: transactions.filter((t) => t.status === "refunded").length,
      totalAmount: transactions
        .filter((t) => t.status === "success")
        .reduce((sum, t) => sum + (t.amount || 0), 0),
    }),
    [transactions]
  );

  // Add the permission check render logic
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

  // // Check for required roles
  // if (!userRole || (userRole !== "superAdmin" && userRole !== "manageUsers")) {
  //   return <AccessDenied />;
  // }

  // Error state UI
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/20"
        >
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900">Error</h3>
            <p className="text-gray-600">{error}</p>
          </div>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </motion.div>
      </div>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      {/* Main dashboard layout */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header section with title and actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-xl border border-white/20"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
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
                    Transactions
                  </h1>
                  <p className="text-lg text-gray-600 mt-2">
                    Monitor all transactions and payments
                  </p>
                </div>
              </div>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"></div>
            </motion.div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="hover:bg-gray-100 transition-all duration-200"
                onClick={() => {
                  // Prepare CSV content
                  const headers = [
                    "Date",
                    "Custom Transaction ID",
                    "Transaction ID",
                    "User ID",
                    "Plan Type",
                    "Amount",
                    "Payment Method",
                    "Status",
                    "Start Date",
                    "End Date",
                    "Created At",
                  ];
                  const rows = transactions.map((txn) => [
                    formatDate(txn.createdAt),
                    txn.cTransactionId,
                    txn.transactionId,
                    txn.userId,
                    txn.planDetails?.planType?.toUpperCase() || "N/A",
                    txn.amount ?? "",
                    txn.paymentMethod?.toUpperCase() || "N/A",
                    txn.status,
                    formatDate(txn.subscription?.startDate || txn.startDate),
                    formatDate(txn.subscription?.endDate || txn.endDate),
                    formatDate(txn.createdAt),
                  ]);
                  const csv = [headers, ...rows]
                    .map((row) =>
                      row
                        .map((cell) =>
                          typeof cell === "string" && cell.includes(",")
                            ? `"${cell.replace(/"/g, '""')}"`
                            : cell
                        )
                        .join(",")
                    )
                    .join("\n");

                  // Download CSV
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `transactions_${new Date()
                    .toISOString()
                    .slice(0, 10)}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              {/* Filters Modal */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed z-50 inset-0 overflow-y-auto"
                  >
                    <div
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                      onClick={() => setShowFilters(false)}
                    />
                    <div className="flex items-center justify-center min-h-screen px-4">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative z-10 w-full max-w-md mx-auto"
                      >
                        <div className="bg-white rounded-3xl w-full p-6 shadow-2xl border border-white/20">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">
                              Filter Transactions
                            </h3>
                            <button
                              onClick={() => setShowFilters(false)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <X className="h-6 w-6" />
                            </button>
                          </div>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              setShowFilters(false);
                            }}
                            className="space-y-6"
                          >
                            {/* Status Filter */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                              </label>
                              <select
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                value={statusFilter}
                                onChange={(e) =>
                                  setStatusFilter(e.target.value)
                                }
                              >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="success">Success</option>
                                <option value="rejected">Rejected</option>
                                <option value="refunded">Refunded</option>
                              </select>
                            </div>
                            {/* Plan Type Filter */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Plan Type
                              </label>
                              <select
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                value={planTypeFilter}
                                onChange={(e) =>
                                  setPlanTypeFilter(e.target.value)
                                }
                              >
                                <option value="">All Plans</option>
                                {[
                                  ...new Set(
                                    transactions
                                      .map((t) => t.planDetails?.planType)
                                      .filter(Boolean)
                                  ),
                                ].map((plan) => (
                                  <option key={plan} value={plan}>
                                    {plan?.toUpperCase()}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {/* Payment Method Filter */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Method
                              </label>
                              <select
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                value={paymentMethodFilter}
                                onChange={(e) =>
                                  setPaymentMethodFilter(e.target.value)
                                }
                              >
                                <option value="">All Methods</option>
                                {[
                                  ...new Set(
                                    transactions
                                      .map((t) => t.paymentMethod)
                                      .filter(Boolean)
                                  ),
                                ].map((method) => (
                                  <option key={method} value={method}>
                                    {method?.toUpperCase()}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  // Reset all filters
                                  setStatusFilter("all");
                                  setPlanTypeFilter("");
                                  setPaymentMethodFilter("");
                                  setSearchTerm("");
                                  setShowFilters(false);
                                }}
                              >
                                Reset All
                              </Button>
                              <Button
                                type="submit"
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                              >
                                Apply Filters
                              </Button>
                            </div>
                          </form>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by user ID, transaction ID, or custom ID..."
                className="pl-12 h-12 text-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="appearance-none px-6 py-3 h-12 border border-gray-200 rounded-xl bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-500 pr-12 min-w-[160px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="success">Success</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="w-full flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  title: "Total Transactions",
                  value: stats.total,
                  icon: Receipt,
                  color: "from-blue-500 to-blue-600",
                  textColor: "text-blue-600",
                  bgColor: "bg-blue-50",
                },
                {
                  title: "Total Revenue",
                  value: formatAmount(stats.totalAmount),
                  icon: TrendingUp,
                  color: "from-green-500 to-green-600",
                  textColor: "text-green-600",
                  bgColor: "bg-green-50",
                },
                {
                  title: "Success",
                  value: stats.success,
                  icon: CheckCircle,
                  color: "from-green-500 to-green-600",
                  textColor: "text-green-600",
                  bgColor: "bg-green-50",
                },
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  className={`${stat.bgColor} p-6 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon className={`w-8 h-8 ${stat.textColor}`} />
                    <div
                      className={`w-3 h-3 rounded-full bg-gradient-to-r ${stat.color}`}
                    ></div>
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>
                    {typeof stat.value === "string"
                      ? stat.value
                      : stat.value.toLocaleString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Enhanced Table with Improved Sorting */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[15%]">
                      <div
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => handleSort("createdAt")}
                      >
                        <span>Date</span>
                        {getSortIcon("createdAt", sortConfig)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[15%]">
                      <div
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => "cTransactionId"}
                      >
                        <span>Transaction ID</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[15%]">
                      <div
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => "planType"}
                      >
                        <span>Plan Type</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[15%]">
                      <div className="flex items-center space-x-2 cursor-pointer">
                        <span>Amount</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[15%]">
                      Payment Method
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[15%]">
                      <div className="flex items-center space-x-2 cursor-pointer">
                        <span>Status</span>
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-[20%]">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-100">
                  <AnimatePresence>
                    {sortedAndFilteredTransactions.map((txn, index) => (
                      <motion.tr
                        key={txn.cTransactionId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {formatDate(txn.createdAt)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(txn.createdAt.toDate(), "h:mm a")}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {txn.cTransactionId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                            {txn.planDetails?.planType?.toUpperCase() || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatAmount(txn.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <CreditCard className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium">
                              {txn.paymentMethod?.toUpperCase() || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={txn.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => setSelectedTransaction(txn)}
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </button>
                            {txn.paymentProofUrl && (
                              <button
                                onClick={() =>
                                  setProofModal(txn.paymentProofUrl!)
                                }
                                className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors"
                              >
                                <Receipt className="w-4 h-4 mr-1" />
                                Proof
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {filteredTransactions.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No transactions found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Enhanced Payment Proof Modal */}
      <AnimatePresence>
        {proofModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-50 inset-0 overflow-y-auto"
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setProofModal(null)}
            />
            <div className="flex items-center justify-center min-h-screen px-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-10 w-full max-w-3xl mx-auto"
              >
                <div className="bg-white rounded-3xl w-full p-6 shadow-2xl border border-white/20">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                      Payment Proof
                    </h3>
                    <button
                      onClick={() => setProofModal(null)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                    <img
                      src={proofModal}
                      alt="Payment Proof"
                      className="w-full h-auto max-h-[70vh] object-contain bg-gray-50"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Transaction Details Modal - Receipt Style */}
      <AnimatePresence>
        {selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-50 inset-0 overflow-y-auto"
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedTransaction(null)}
            />
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative z-10 w-full max-w-lg mx-auto"
              >
                <div className="bg-white rounded-3xl w-full shadow-2xl border border-white/20 overflow-hidden">
                  {/* Receipt Header */}
                  <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-3xl font-bold mb-2">
                            Transaction Receipt
                          </h3>
                          <p className="text-blue-100 text-lg">
                            Payment Confirmation
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedTransaction(null)}
                          className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all duration-200"
                        >
                          <X className="h-6 w-6" />
                        </button>
                      </div>
                      <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                        <p className="text-sm text-blue-100 mb-1">
                          Transaction ID
                        </p>
                        <p className="font-mono text-lg font-semibold">
                          {selectedTransaction.transactionId}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Content */}
                  <div className="p-8 space-y-8">
                    {/* Customer & Date Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-gray-500 mb-2">
                          <User className="w-4 h-4" />
                          <span className="text-xs font-medium">Customer</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {selectedTransaction.userId}
                        </p>
                      </div>
                      <div className="ml-auto space-y-2">
                        <div className="flex items-center space-x-2 text-gray-500 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs font-medium">Date</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatDate(selectedTransaction.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Plan Details */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-100">
                      <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                        <Receipt className="w-5 h-5 mr-2 text-blue-600" />
                        Plan Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Plan Type</span>
                          <span className="font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                            {selectedTransaction.planDetails?.planType?.toUpperCase() ||
                              "N/A"}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex justify-between items-center text-lg">
                            <span className="font-semibold text-gray-900">
                              Total Amount
                            </span>
                            <span className="font-bold text-2xl text-green-600">
                              {formatAmount(selectedTransaction.amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                      <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                        <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                        Payment Information
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Payment Method</span>
                          <span className="font-semibold text-gray-900">
                            {selectedTransaction.paymentMethod}
                          </span>
                        </div>
                        {selectedTransaction.paypalOrderId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              PayPal Order ID
                            </span>
                            <span className="font-mono text-xs bg-white px-2 py-1 rounded border">
                              {selectedTransaction.paypalOrderId}
                            </span>
                          </div>
                        )}
                        {selectedTransaction.paypalTransactionId && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              PayPal Transaction ID
                            </span>
                            <span className="font-mono text-xs bg-white px-2 py-1 rounded border">
                              {selectedTransaction.paypalTransactionId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subscription Period */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                      <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                        Subscription Period
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center p-3 bg-white rounded-xl border">
                          <p className="text-gray-600 mb-1">Start Date</p>
                          <p className="font-bold text-gray-900">
                            {formatDate(
                              selectedTransaction.subscription?.startDate ||
                                selectedTransaction.startDate
                            )}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border">
                          <p className="text-gray-600 mb-1">End Date</p>
                          <p className="font-bold text-gray-900">
                            {formatDate(
                              selectedTransaction.subscription?.endDate ||
                                selectedTransaction.endDate
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Admin Remarks */}
                    {selectedTransaction.adminRemarks && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                        <h4 className="font-bold text-lg text-gray-900 mb-3 flex items-center">
                          <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                          Admin Remarks
                        </h4>
                        <p className="text-gray-700 italic">
                          {selectedTransaction.adminRemarks}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Receipt Footer */}
                  <div className="border-t border-gray-100 bg-gray-50 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600">
                          Status:
                        </span>
                        <span
                          className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold ${
                            selectedTransaction.status === "success"
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : selectedTransaction.status === "pending"
                              ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                              : selectedTransaction.status === "refunded"
                              ? "bg-orange-100 text-orange-700 border border-orange-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                          }`}
                        >
                          {getStatusIcon(selectedTransaction.status)}
                          <span>
                            {selectedTransaction.status.toUpperCase()}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div
                      className="flex justify-between items-end"
                      style={{ alignItems: "center", justifyContent: "center" }}
                    >
                      {/* <p className="text-xs text-gray-500">
                        Generated on {format(new Date(), "PPpp")}
                      </p> */}
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => window.print()}
                          variant="outline"
                          size="sm"
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Print
                        </Button>
                        <Button
                          onClick={() => setSelectedTransaction(null)}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          size="sm"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Move the AccessDenied component outside the main component
const AccessDenied = () => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
      <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
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
