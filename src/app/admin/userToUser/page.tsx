"use client"; // Enable client-side rendering for Next.js

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, getDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import { format } from "date-fns";
import {
  X,
  Search,
  Download,
  Filter,
  ChevronDown,
  Eye,
  Calendar,
  User,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Define User-to-User Transaction interface
interface UserToUserTransaction {
  id: string;
  userId: string;
  userEmail: string;
  recipientId: string;
  recipientEmail: string;
  itemId: string;
  itemName: string;
  amount: number;
  rentalStartDate: Timestamp;
  rentalEndDate: Timestamp;
  status: "pending" | "accepted" | "completed" | "cancelled" | "declined";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

type SortDirection = "asc" | "desc";
type SortField =
  | "createdAt"
  | "itemName"
  | "userEmail"
  | "recipientEmail"
  | "status"
  | "amount";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Helper functions
const formatDate = (timestamp: Timestamp | null | undefined): string => {
  try {
    if (!timestamp || !isValidTimestamp(timestamp)) return "N/A";
    return format(timestamp.toDate(), "MMM dd, yyyy");
  } catch (error) {
    console.log("Error formatting date:", error);
    return "Invalid Date";
  }
};

const formatAmount = (amount: number | undefined): string => {
  if (amount === undefined || isNaN(amount)) {
    return "₱0.00";
  }
  return `₱${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
  })}`;
};

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
      case "completed":
        return {
          bg: "bg-green-100",
          text: "text-green-700",
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case "accepted":
        return {
          bg: "bg-blue-100",
          text: "text-blue-700",
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case "pending":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          icon: <Clock className="w-4 h-4" />,
        };
      case "cancelled":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          icon: <XCircle className="w-4 h-4" />,
        };
      case "declined":
        return {
          bg: "bg-orange-100",
          text: "text-orange-700",
          icon: <XCircle className="w-4 h-4" />,
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

export default function UserToUserTransactionsPage() {
  const [transactions, setTransactions] = useState<UserToUserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<UserToUserTransaction | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "createdAt",
    direction: "desc",
  });

  // Fetch user-to-user transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setError(null);
        setLoading(true);

        // Fetch transactions with type: "rental_payment" and status: "completed"
        const transactionsSnapshot = await getDocs(collection(db, "transactions"));
        const usersCollection = collection(db, "users");
        const itemsCollection = collection(db, "items");

        const userDocs = await getDocs(usersCollection);
        const usersMap = new Map(
          userDocs.docs.map((doc) => [
            doc.id,
            {
              id: doc.id,
              email: doc.data().email,
              fullName: doc.data().fullName || doc.data().displayName || "Unknown",
            },
          ])
        );

        const itemDocs = await getDocs(itemsCollection);
        const itemsMap = new Map(
          itemDocs.docs.map((doc) => [
            doc.id,
            {
              id: doc.id,
              name: doc.data().itemName,
              price: doc.data().rentalPrice || 0,
            },
          ])
        );

        const data: UserToUserTransaction[] = await Promise.all(
          transactionsSnapshot.docs
            .filter((doc) => {
              const txnData = doc.data();
              // Only fetch rental_payment type with completed status
              return txnData.type === "rental_payment" && txnData.status === "completed";
            })
            .map(async (txnDoc) => {
              const txnData = txnDoc.data();

              // Get user and recipient info
              const userId = txnData.userId || "unknown";
              const recipientId = txnData.recipientId || "unknown";

              const userInfo = usersMap.get(userId) || {
                id: userId,
                email: "unknown@email.com",
                fullName: "Unknown User",
              };
              const recipientInfo = usersMap.get(recipientId) || {
                id: recipientId,
                email: "unknown@email.com",
                fullName: "Unknown Recipient",
              };

              // Get item info
              const itemId = txnData.itemId || "";
              const itemInfo = itemsMap.get(itemId) || {
                id: itemId,
                name: txnData.itemName || "Unknown Item",
                price: txnData.itemPrice || 0,
              };

              return {
                id: txnDoc.id,
                userId,
                userEmail: userInfo.email,
                recipientId,
                recipientEmail: recipientInfo.email,
                itemId,
                itemName: itemInfo.name || txnData.itemName || "Unknown Item",
                amount: Number(txnData.amount) || Number(txnData.itemPrice) || 0,
                rentalStartDate: txnData.paidAt || txnData.createdAt || Timestamp.now(),
                rentalEndDate: txnData.createdAt || Timestamp.now(),
                status: "completed" as const,
                createdAt: txnData.createdAt || Timestamp.now(),
                updatedAt: txnData.updatedAt,
              };
            })
        );

        setTransactions(data);
      } catch (error) {
        console.log("Error fetching user-to-user transactions:", error);
        setError("Failed to fetch user-to-user transactions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch =
        txn.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        txn.itemName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || txn.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTerm, statusFilter]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    setSortConfig((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const direction = sortConfig.direction === "asc" ? 1 : -1;

      switch (sortConfig.field) {
        case "createdAt":
          return (
            ((a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)) *
            direction
          );
        case "itemName":
          return a.itemName.localeCompare(b.itemName) * direction;
        case "userEmail":
          return a.userEmail.localeCompare(b.userEmail) * direction;
        case "recipientEmail":
          return a.recipientEmail.localeCompare(b.recipientEmail) * direction;
        case "status":
          return a.status.localeCompare(b.status) * direction;
        case "amount":
          return ((a.amount || 0) - (b.amount || 0)) * direction;
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
      completed: transactions.filter((t) => t.status === "completed").length,
      accepted: transactions.filter((t) => t.status === "accepted").length,
      totalValue: transactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      ),
    }),
    [transactions]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border border-white/20"
        >
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-blue-200 rounded-full mx-auto animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Loading User-to-User Transactions
            </h3>
            <p className="text-gray-500">
              Fetching rental transactions data...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-3xl shadow-xl border border-white/20"
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  User-to-User Rentals
                </h1>
                <p className="text-lg text-gray-600 mt-2">
                  Monitor all rental transactions between users
                </p>
              </div>
            </div>
            <div className="w-24 h-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mx-auto"></div>
          </div>

          <div className="flex gap-3 mb-8">
            <Button
              variant="outline"
              className="hover:bg-gray-100 transition-all duration-200"
              onClick={() => {
                // Prepare CSV content
                const headers = [
                  "Date",
                  "Renter Email",
                  "Owner Email",
                  "Item Name",
                  "Amount",
                  "Status",
                  "Rental Start",
                  "Rental End",
                ];
                const rows = sortedTransactions.map((txn) => [
                  formatDate(txn.createdAt),
                  txn.userEmail,
                  txn.recipientEmail,
                  txn.itemName,
                  txn.amount ?? "",
                  txn.status,
                  formatDate(txn.rentalStartDate),
                  formatDate(txn.rentalEndDate),
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
                a.download = `user-to-user-rentals_${new Date()
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
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

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
                          Filter Rentals
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
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 focus:border-green-500 focus:ring-green-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                          >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="declined">Declined</option>
                          </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setStatusFilter("all");
                              setSearchTerm("");
                              setShowFilters(false);
                            }}
                          >
                            Reset All
                          </Button>
                          <Button
                            type="submit"
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
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

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by email, name, or item name..."
                className="pl-12 h-12 text-lg border-gray-200 focus:border-green-500 focus:ring-green-500 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="appearance-none px-6 py-3 h-12 border border-gray-200 rounded-xl bg-white text-gray-700 focus:border-green-500 focus:ring-green-500 pr-12 min-w-[160px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="declined">Declined</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
            {[
              {
                title: "Total Rentals",
                value: stats.total,
                icon: Package,
                color: "from-green-500 to-green-600",
                textColor: "text-green-600",
                bgColor: "bg-green-50",
              },
              {
                title: "Pending",
                value: stats.pending,
                icon: Clock,
                color: "from-yellow-500 to-yellow-600",
                textColor: "text-yellow-600",
                bgColor: "bg-yellow-50",
              },
              {
                title: "Accepted",
                value: stats.accepted,
                icon: CheckCircle,
                color: "from-blue-500 to-blue-600",
                textColor: "text-blue-600",
                bgColor: "bg-blue-50",
              },
              {
                title: "Total Value",
                value: formatAmount(stats.totalValue),
                icon: TrendingUp,
                color: "from-purple-500 to-purple-600",
                textColor: "text-purple-600",
                bgColor: "bg-purple-50",
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className={`${stat.bgColor} p-6 rounded-2xl border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300`}
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

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => handleSort("createdAt")}
                      >
                        <span>Date</span>
                        {getSortIcon("createdAt", sortConfig)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => handleSort("userEmail")}
                      >
                        <span>Renter</span>
                        {getSortIcon("userEmail", sortConfig)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => handleSort("recipientEmail")}
                      >
                        <span>Owner</span>
                        {getSortIcon("recipientEmail", sortConfig)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => handleSort("itemName")}
                      >
                        <span>Item Name</span>
                        {getSortIcon("itemName", sortConfig)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      <div
                        className="flex items-center space-x-2 cursor-pointer"
                        onClick={() => handleSort("amount")}
                      >
                        <span>Amount</span>
                        {getSortIcon("amount", sortConfig)}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-100">
                  <AnimatePresence>
                    {sortedTransactions.map((txn, index) => (
                      <motion.tr
                        key={txn.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
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
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {txn.userEmail}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {txn.recipientEmail}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {txn.itemName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatAmount(txn.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={txn.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedTransaction(txn)}
                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
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
                  No user-to-user rentals found
                </h3>
                <p className="text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Transaction Details Modal */}
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
                  {/* Header */}
                  <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-3xl font-bold mb-2">
                          Rental Details
                        </h3>
                        <p className="text-green-100 text-lg">
                          User-to-User Transaction
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTransaction(null)}
                        className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all duration-200"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 space-y-8">
                    {/* Participants */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                        <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                          <Mail className="w-5 h-5 mr-2 text-blue-600" />
                          Renter Email
                        </h4>
                        <p className="font-mono text-sm text-gray-700 break-all">
                          {selectedTransaction.userEmail}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
                        <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                          <User className="w-5 h-5 mr-2 text-purple-600" />
                          Owner Email
                        </h4>
                        <p className="font-mono text-sm text-gray-700 break-all">
                          {selectedTransaction.recipientEmail}
                        </p>
                      </div>
                    </div>

                    {/* Item Details */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                      <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-green-600" />
                        Item Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Item Name</span>
                          <span className="font-semibold text-gray-900">
                            {selectedTransaction.itemName}
                          </span>
                        </div>
                        <div className="border-t border-green-200 pt-3 flex justify-between items-center">
                          <span className="text-gray-600">Amount</span>
                          <span className="font-bold text-2xl text-green-600">
                            {formatAmount(selectedTransaction.amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rental Period */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
                      <h4 className="font-bold text-lg text-gray-900 mb-4 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-orange-600" />
                        Rental Period
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="text-center p-3 bg-white rounded-xl border">
                          <p className="text-gray-600 mb-1 font-medium">
                            Start Date
                          </p>
                          <p className="font-bold text-gray-900 text-lg">
                            {formatDate(selectedTransaction.rentalStartDate)}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border">
                          <p className="text-gray-600 mb-1 font-medium">
                            End Date
                          </p>
                          <p className="font-bold text-gray-900 text-lg">
                            {formatDate(selectedTransaction.rentalEndDate)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <span className="text-sm font-medium text-gray-600">
                        Status:
                      </span>
                      <StatusBadge status={selectedTransaction.status} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-100 bg-gray-50 p-6 flex justify-end">
                    <Button
                      onClick={() => setSelectedTransaction(null)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      Close
                    </Button>
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
