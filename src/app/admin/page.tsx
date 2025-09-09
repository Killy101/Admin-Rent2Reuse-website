"use client";

import React, { useState, useEffect } from "react";
import type { TooltipProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  PhilippinePeso,
  TrendingUp,
  CreditCard,
  Upload,
  FileText,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap,
  Target,
} from "lucide-react";
import { db } from "@/app/firebase/config";
import ItemsMap from "../../components/ItemsMap";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { InfoIcon } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PieChart, BarChart3, LineChart } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { AdminAuthCheck } from "@/components/auth/AdminAuthCheck";

import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

// Keep interfaces and type definitions outside
interface Transaction {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  status: "pending" | "success" | "rejected" | "refunded" | "completed";
  createdAt: {
    seconds: number;
    nanoseconds: number;
    toDate(): Date;
  };
}

interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
    toDate(): Date;
  } | null;
}

interface RecentActivity {
  id: string;
  type: "upload" | "transaction" | "user_action" | "support";
  description: string;
  user: string;
  timestamp: Timestamp;
  status: "pending" | "success" | "failed";
}

interface DashboardData {
  totalUsers: number;
  totalRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  revenueGrowth: number;
  lastTransactionDate: string;
  averageTransactionValue: number;
  transactionsByStatus: {
    pending: number;
    completed: number;
    rejected: number;
    refunded: number;
  };
  weeklyTransactions: number;
  monthlyTransactions: number;
}

interface TransactionChartData {
  date: string;
  revenue: number;
  transactions: number;
}

interface SupportTicket {
  id: string;
  type: "support";
  description: string;
  subject: string;
  email: string;
  createdAt: Timestamp;
  status: "pending" | "resolved" | "open";
  userId?: string;
}

interface SubscriptionDates {
  startDate: Timestamp;
  endDate: Timestamp;
}

// --- Support Tickets State ---
export default function DashboardPage() {
  const { isAuthenticated, loading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/auth/signin");
    }
  }, [isAuthenticated, loading, router]);

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    revenueGrowth: 0,
    lastTransactionDate: "Loading...",
    averageTransactionValue: 0,
    transactionsByStatus: {
      pending: 0,
      completed: 0,
      rejected: 0,
      refunded: 0,
    },
    weeklyTransactions: 0,
    monthlyTransactions: 0,
  });
  const [completedTransactions, setCompletedTransactions] = useState<
    Transaction[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [transactionChartData, setTransactionChartData] = useState<
    TransactionChartData[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    label: "Week",
    days: 7,
  });
  const [activeChart, setActiveChart] = useState<ChartType>("area");
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [subscriptionDates, setSubscriptionDates] = useState<{
    [key: string]: SubscriptionDates;
  }>({
    // Initial state for subscription dates
  });

  // Add notification state and functions
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Helper function to handle subscription data
  function handleSubscriptionData(
    subData: any,
    currentPlan: any,
    datesMap: { [key: string]: SubscriptionDates }
  ) {
    if (subData && subData.startDate && subData.endDate) {
      datesMap[currentPlan.subscriptionId] = {
        startDate: subData.startDate,
        endDate: subData.endDate,
      };
    }
  }

  // Add handleRefresh function
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      console.log("🔄 Starting data refresh...");

      // Clear existing data
      setUsers([]);
      setSubscriptionDates({});
      setDashboardData({
        totalUsers: 0,
        totalRevenue: 0,
        totalTransactions: 0,
        successfulTransactions: 0,
        revenueGrowth: 0,
        lastTransactionDate: "Loading...",
        averageTransactionValue: 0,
        transactionsByStatus: {
          pending: 0,
          completed: 0,
          rejected: 0,
          refunded: 0,
        },
        weeklyTransactions: 0,
        monthlyTransactions: 0,
      });
      setCompletedTransactions([]);
      setRecentActivity([]);

      // Fetch users data
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
                handleSubscriptionData(subData, currentPlan, datesMap);
              }
            } catch (subError) {
              console.error("❌ Error fetching subscription:", subError);
            }
          }

          // Ensure all required User fields are present
          return {
            id: userDoc.id,
            email: d.email || "",
            firstname: d.firstname || "N/A",
            lastname: d.lastname || "N/A",
            role: d.role || "user",
            createdAt: d.createdAt ?? null,
            // The following fields are not in User type, but may be used elsewhere
            currentPlan,
            status: currentPlan.status,
            amount: d.amount || 0,
          } as User;
        })
      );

      // Update users and subscription dates
      setSubscriptionDates(datesMap);
      setUsers(userData.filter((user) => user.role === "user"));

      // Fetch other dashboard data
      const [transactionsSnapshot, supportSnapshot] = await Promise.all([
        getDocs(collection(db, "transactions")),
        getDocs(
          query(collection(db, "support"), orderBy("date", "desc"), limit(3))
        ),
      ]);

      // Process transactions
      const transactionsData = transactionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];

      // Process support tickets
      const tickets = supportSnapshot.docs.map((doc) => {
        const rawStatus = doc.data().status?.toLowerCase();
        let status: "pending" | "resolved" | "open";
        if (rawStatus === "resolved") status = "resolved";
        else if (rawStatus === "open") status = "open";
        else status = "pending";
        return {
          id: `support_${doc.id}`,
          type: "support" as const,
          description:
            doc.data().description ||
            `New support ticket: ${doc.data().subject || "Complaint"}`,
          subject: doc.data().subject || "No subject",
          email: doc.data().email || "Unknown user",
          createdAt: doc.data().date || new Timestamp(0, 0),
          status,
          userId: doc.data().userId || "",
        } as SupportTicket;
      });

      // Generate activity data
      const activity = await generateRecentActivity(transactionsData, userData);

      // Update all states
      setCompletedTransactions(transactionsData);
      setSupportTickets(tickets);
      setRecentActivity(activity);

      // Compute dashboard data directly here
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const successfulTransactions = transactionsData.filter(
        (t) => t.status === "completed" || t.status === "success"
      );
      const totalRevenue = successfulTransactions.reduce(
        (sum, t) => sum + (t.amount || 0),
        0
      );
      const transactionsByStatus = {
        pending: transactionsData.filter((t) => t.status === "pending").length,
        completed: transactionsData.filter(
          (t) => t.status === "completed" || t.status === "success"
        ).length,
        rejected: transactionsData.filter((t) => t.status === "rejected")
          .length,
        refunded: transactionsData.filter((t) => t.status === "refunded")
          .length,
      };
      const lastTransaction = transactionsData
        .filter((t) => isValidTimestamp(t.createdAt))
        .sort(
          (a, b) =>
            b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        )[0];

      setDashboardData({
        totalUsers: userData.length,
        totalRevenue,
        totalTransactions: transactionsData.length,
        successfulTransactions: successfulTransactions.length,
        revenueGrowth: 0,
        lastTransactionDate: lastTransaction
          ? format(lastTransaction.createdAt.toDate(), "MMM dd, yyyy")
          : "No transactions",
        averageTransactionValue:
          successfulTransactions.length > 0
            ? totalRevenue / successfulTransactions.length
            : 0,
        transactionsByStatus,
        weeklyTransactions: transactionsData.filter(
          (t) =>
            isValidTimestamp(t.createdAt) && t.createdAt.toDate() >= weekAgo
        ).length,
        monthlyTransactions: transactionsData.filter(
          (t) =>
            isValidTimestamp(t.createdAt) && t.createdAt.toDate() >= monthAgo
        ).length,
      });

      // Update chart data
      const chartData = groupTransactionsByDate(
        transactionsData,
        selectedTimeRange
      );
      setTransactionChartData(chartData);

      console.log("✅ Data refresh completed successfully");
      setNotification({
        type: "success",
        message: "Data refreshed successfully!",
      });
    } catch (error) {
      console.error("❌ Error refreshing data:", error);
      setNotification({
        type: "error",
        message: "Failed to refresh data. Please try again.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const timeRangeOptions: TimeRange[] = [
    { label: "Week", days: 7 },
    { label: "Month", days: 30 },
    { label: "Year", days: 365 },
  ];

  // Fetch support tickets from Firestore
  useEffect(() => {
    const fetchSupportTickets = async () => {
      try {
        const supportQuery = query(
          collection(db, "support"),
          orderBy("date", "desc"),
          limit(3)
        );

        const supportSnapshot = await getDocs(supportQuery);
        const tickets = supportSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: `support_${doc.id}`,
            type: "support" as const,
            description:
              data.description ||
              `New support ticket: ${data.subject || "Complaint"}`,
            subject: data.subject || "No subject",
            email: data.email || "Unknown user",
            createdAt: data.date || new Timestamp(0, 0),
            status: ((): "pending" | "resolved" | "open" => {
              switch (data.status?.toLowerCase()) {
                case "resolved":
                  return "resolved";
                case "pending":
                  return "pending";
                case "open":
                  return "open";
                default:
                  return "pending";
              }
            })(),
            userId: data.userId || "",
          } as SupportTicket;
        });

        setSupportTickets(tickets);
      } catch (err) {
        console.error("Error fetching support tickets:", err);
      }
    };

    fetchSupportTickets();
  }, []);

  interface TimeRange {
    label: "Week" | "Month" | "Year";
    days: number;
  }

  // Helper functions (keeping your existing helper functions)
  const getValidDate = (timestamp: Timestamp | undefined | null): Date => {
    if (!timestamp || !timestamp.toDate) {
      return new Date(0);
    }
    try {
      return timestamp.toDate();
    } catch (error) {
      console.error("Invalid timestamp:", error);
      return new Date(0);
    }
  };

  // Update the isValidTimestamp helper
  const isValidTimestamp = (timestamp: any): timestamp is Timestamp => {
    try {
      return (
        timestamp &&
        typeof timestamp === "object" &&
        "seconds" in timestamp &&
        "nanoseconds" in timestamp &&
        typeof timestamp.toDate === "function" &&
        timestamp.toDate() instanceof Date
      );
    } catch (error) {
      console.error("Invalid timestamp:", error);
      return false;
    }
  };

  const isWithinDays = (date: Date, days: number): boolean => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return diff <= days * 24 * 60 * 60 * 1000;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  function getActivityIcon(type: "upload" | "transaction" | "user_action") {
    switch (type) {
      case "upload":
        return <Upload size={20} className="text-blue-500" />;
      case "transaction":
        return <PhilippinePeso size={20} className="text-emerald-500" />;
      case "user_action":
        return <User size={20} className="text-purple-500" />;
      default:
        return <FileText size={20} className="text-gray-400" />;
    }
  }

  function getStatusIcon(status: "pending" | "success" | "failed") {
    switch (status) {
      case "success":
        return (
          <span title="Success">
            <CheckCircle size={18} className="text-green-500" />
          </span>
        );
      case "pending":
        return (
          <span title="Pending">
            <Clock size={18} className="text-yellow-500" />
          </span>
        );
      case "failed":
        return (
          <span title="Failed">
            <XCircle size={18} className="text-red-500" />
          </span>
        );
      default:
        return (
          <span title="Unknown">
            <AlertCircle size={18} className="text-gray-400" />
          </span>
        );
    }
  }

  type ChartType = "area" | "line" | "bar";

  // Format timestamps for display
  const formatTimestamp = (timestamp: any): string => {
    try {
      if (!timestamp) return "N/A";
      if (typeof timestamp.toDate === "function") {
        return format(timestamp.toDate(), "MMM dd, HH:mm");
      }
      if (timestamp.seconds) {
        return format(new Date(timestamp.seconds * 1000), "MMM dd, HH:mm");
      }
      return "Invalid Date";
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid Date";
    }
  };

  // Generate recent activity feed from multiple sources
  const generateRecentActivity = async (
    transactions: Transaction[],
    users: User[]
  ): Promise<RecentActivity[]> => {
    const activities: RecentActivity[] = [];

    try {
      // Update how we handle timestamps when fetching users
      const usersQuery = query(
        collection(db, "users"),
        orderBy("createdAt", "desc"),
        limit(2)
      );

      const usersSnapshot = await getDocs(usersQuery);
      const newUserActivities = usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        // Convert server timestamp to Firestore Timestamp, fallback to epoch Timestamp if missing
        const timestamp =
          data.createdAt && data.createdAt.seconds
            ? Timestamp.fromMillis(data.createdAt.seconds * 1000)
            : new Timestamp(0, 0);

        return {
          id: `newuser_${doc.id}`,
          type: "user_action" as const,
          description: `New user registered: ${data.firstname || ""} ${
            data.lastname || ""
          }`,
          user: data.email || "Unknown user",
          timestamp: timestamp,
          status: "success" as const,
          details: {
            description: `Role: ${data.role || "user"}`,
            email: data.email,
            date: timestamp,
          },
        };
      });

      // Get recent user registrations
      const recentUsers = users
        .filter((u) => isValidTimestamp(u.createdAt))
        .sort((a, b) => {
          const dateA = isValidTimestamp(a.createdAt)
            ? a.createdAt.toDate()
            : new Date(0);
          const dateB = isValidTimestamp(b.createdAt)
            ? b.createdAt.toDate()
            : new Date(0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 3)
        .map((user) => ({
          id: `user_${user.id}`,
          type: "user_action" as const,
          description: `New user registered: ${user.firstname} ${user.lastname}`,
          user: user.email,
          timestamp: user.createdAt as Timestamp,
          status: "success" as const,
        }));

      // Add recent transactions
      const recentTransactions = transactions
        .filter((t) => isValidTimestamp(t.createdAt))
        .sort((a, b) => {
          const dateA = a.createdAt.toDate();
          const dateB = b.createdAt.toDate();
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 3)
        .map((transaction) => ({
          id: `transaction_${transaction.transactionId}`,
          type: "transaction" as const,
          description: `Payment ${transaction.status}: ₱${
            transaction.amount?.toLocaleString() || 0
          }`,
          user: transaction.userId || "Unknown user",
          timestamp: transaction.createdAt as Timestamp,
          status:
            transaction.status === "completed" ||
            transaction.status === "success"
              ? ("success" as const)
              : transaction.status === "rejected"
              ? ("failed" as const)
              : ("pending" as const),
        }));

      // Combine all activities
      activities.push(
        ...recentUsers,
        ...recentTransactions,
        ...newUserActivities
      );

      // Sort by timestamp and return most recent 5
      return activities
        .sort((a, b) => {
          const timeA = isValidTimestamp(a.timestamp)
            ? a.timestamp.toDate().getTime()
            : 0;
          const timeB = isValidTimestamp(b.timestamp)
            ? b.timestamp.toDate().getTime()
            : 0;
          return timeB - timeA;
        })
        .slice(0, 5);
    } catch (error) {
      console.error("Error generating activity data:", error);
      return [];
    }
  };

  // Helper to generate date labels for charts
  function generateDateLabels(range: TimeRange): string[] {
    const now = new Date();
    const labels: string[] = [];
    if (range.label === "Week") {
      // Last 7 days, show as Mon, Tue, etc.
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        labels.push(format(d, "EEE"));
      }
    } else if (range.label === "Month") {
      // Last 30 days, show as "MMM dd"
      for (let i = range.days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        labels.push(format(d, "MMM dd"));
      }
    } else if (range.label === "Year") {
      // Last 12 months, show as "MMM"
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        labels.push(format(d, "MMM"));
      }
    }
    return labels;
  }

  // Update the groupTransactionsByDate function
  const groupTransactionsByDate = (
    transactions: Transaction[],
    range: TimeRange
  ): TransactionChartData[] => {
    const now = new Date();
    const startDate = new Date();

    // Set proper start date
    switch (range.label) {
      case "Week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "Month":
        startDate.setDate(now.getDate() - 30);
        break;
      case "Year":
        startDate.setDate(now.getDate() - 365);
        break;
    }

    // Filter transactions within range
    const validTransactions = transactions.filter((t) => {
      if (!isValidTimestamp(t.createdAt)) return false;
      const txDate = t.createdAt.toDate();
      return txDate >= startDate && txDate <= now;
    });

    return generateDateLabels(range).map((label) => {
      const dayTransactions = validTransactions.filter((t) => {
        const txDate = t.createdAt.toDate();
        return (
          format(txDate, range.label === "Week" ? "EEE" : "MMM dd") === label
        );
      });

      return {
        date: label,
        revenue: dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
        transactions: dayTransactions.length,
      };
    });
  };

  // FIXED: Actual data fetching logic
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching data...");

        // Fetch transactions
        const transactionsSnapshot = await getDocs(
          collection(db, "transactions")
        );
        const transactionsData = transactionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];

        // Fetch users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];

        // Get recent user registrations
        const recentUsers = usersData
          .filter((u) => isValidTimestamp(u.createdAt))
          .sort((a, b) => {
            const dateA = isValidTimestamp(a.createdAt)
              ? a.createdAt.toDate()
              : new Date(0);
            const dateB = isValidTimestamp(b.createdAt)
              ? b.createdAt.toDate()
              : new Date(0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 2)
          .map((user) => ({
            id: `user_${user.id}`,
            type: "user_action" as const,
            description: `New user registered: ${user.firstname} ${user.lastname}`,
            user: user.email,
            timestamp: user.createdAt as Timestamp,
            status: "success" as const,
          }));

        console.log("Transactions fetched:", transactionsData.length);
        console.log("Users fetched:", recentUsers.length);
        // Process dashboard data
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Add try-catch blocks in data processing
        const processTransactionData = (transactions: Transaction[]) => {
          try {
            const successfulTransactions = transactions.filter(
              (t) => t.status === "completed" || t.status === "success"
            );

            const totalRevenue = successfulTransactions.reduce(
              (sum, t) => sum + (t.amount || 0),
              0
            );

            return {
              successfulTransactions,
              totalRevenue,
            };
          } catch (error) {
            console.error("Error processing transaction data:", error);
            return {
              successfulTransactions: [],
              totalRevenue: 0,
            };
          }
        };

        const { successfulTransactions, totalRevenue } =
          processTransactionData(transactionsData);

        const weeklyTransactions = transactionsData.filter(
          (t) =>
            isValidTimestamp(t.createdAt) && t.createdAt.toDate() >= weekAgo
        ).length;

        const monthlyTransactions = transactionsData.filter(
          (t) =>
            isValidTimestamp(t.createdAt) && t.createdAt.toDate() >= monthAgo
        ).length;

        const transactionsByStatus = {
          pending: transactionsData.filter((t) => t.status === "pending")
            .length,
          completed: transactionsData.filter(
            (t) => t.status === "completed" || t.status === "success"
          ).length,
          rejected: transactionsData.filter((t) => t.status === "rejected")
            .length,
          refunded: transactionsData.filter((t) => t.status === "refunded")
            .length,
        };

        const lastTransaction = transactionsData
          .filter((t) => isValidTimestamp(t.createdAt))
          .sort(
            (a, b) =>
              b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
          )[0];

        const processedDashboardData: DashboardData = {
          totalUsers: usersData.length,
          totalRevenue,
          totalTransactions: transactionsData.length,
          successfulTransactions: successfulTransactions.length,
          revenueGrowth: 0, // You can calculate this based on historical data
          lastTransactionDate: lastTransaction
            ? format(lastTransaction.createdAt.toDate(), "MMM dd, yyyy")
            : "No transactions",
          averageTransactionValue:
            successfulTransactions.length > 0
              ? totalRevenue / successfulTransactions.length
              : 0,
          transactionsByStatus,
          weeklyTransactions,
          monthlyTransactions,
        };

        // Set state with processed data
        setDashboardData(processedDashboardData);
        setCompletedTransactions(transactionsData);

        // Generate chart data
        const chartData = groupTransactionsByDate(
          transactionsData,
          selectedTimeRange
        );
        setTransactionChartData(chartData);

        // Generate recent activity
        const activity = await generateRecentActivity(
          transactionsData,
          usersData
        );
        setRecentActivity(activity);

        console.log("Dashboard data processed successfully");
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedTimeRange.label]); // Add specific dependency

  // Update chart data when time range changes
  useEffect(() => {
    if (completedTransactions.length > 0) {
      const chartData = groupTransactionsByDate(
        completedTransactions,
        selectedTimeRange
      );
      setTransactionChartData(chartData);
    }
  }, [selectedTimeRange, completedTransactions]);

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<any, any>) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-gray-100"
        >
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}:</span>
              <span className="font-medium">
                {entry.name === "Revenue"
                  ? `₱${entry.value?.toLocaleString()}`
                  : entry.value}
              </span>
            </div>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  // Loading state UI
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 bg-white/80 backdrop-blur-sm p-12 rounded-3xl shadow-2xl border border-white/20"
        >
          <div className="relative">
            <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-blue-200 rounded-full mx-auto animate-pulse"></div>
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-gray-900">
              Loading Dashboard
            </h3>
            <p className="text-gray-600">Analyzing your data...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state UI
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-white p-10 rounded-3xl shadow-2xl border border-red-100 max-w-md w-full"
        >
          <div className="text-red-500 mb-6">
            <Activity size={56} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  // Helper to compute period totals for BarChart
  function computePeriodTotals(transactions: Transaction[]) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    transactions.forEach((t) => {
      if (t.createdAt && isValidTimestamp(t.createdAt)) {
        const date = t.createdAt.toDate();
        if (date >= oneDayAgo) {
          daily += t.amount || 0;
        }
        if (date >= sevenDaysAgo) {
          weekly += t.amount || 0;
        }
        if (date >= thirtyDaysAgo) {
          monthly += t.amount || 0;
        }
      }
    });

    return { daily, weekly, monthly };
  }

  // Colors for charts
  const chartColors = {
    primary: "#10b981",
    secondary: "#3b82f6",
    accent: "#8b5cf6",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
  };

  // Pie chart data for transaction status
  const statusData = [
    {
      name: "Completed",
      value: dashboardData.transactionsByStatus.completed,
      color: chartColors.success,
    },
    {
      name: "Pending",
      value: dashboardData.transactionsByStatus.pending,
      color: chartColors.warning,
    },
    {
      name: "Rejected",
      value: dashboardData.transactionsByStatus.rejected,
      color: chartColors.danger,
    },
    {
      name: "Refunded",
      value: dashboardData.transactionsByStatus.refunded,
      color: chartColors.secondary,
    },
  ];

  // FIXED: Main component return statement
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-teal-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-2xl animate-bounce"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 relative"
        >
          <div className="inline-flex items-center gap-4 mb-6 relative">
            {/* Glowing icon container */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-md opacity-60 group-hover:opacity-80 transition-opacity animate-pulse"></div>
              <div className="relative p-4 bg-gradient-to-br from-blue-500 via-purple-600 to-teal-600 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <Activity size={40} className="text-white drop-shadow-lg" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-6xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent mb-2 tracking-tight">
                Admin Dashboard
              </h1>
              <div className="flex items-center gap-4">
                <p className="text-xl text-gray-600 font-medium">
                  Real-time insights and performance analytics
                </p>
              </div>
            </div>
          </div>

          {/* Enhanced decorative line */}
          <div className="flex justify-center items-center gap-2 mb-4">
            <div className="w-8 h-1 bg-gradient-to-r from-transparent to-blue-500 rounded-full"></div>
            <div className="w-16 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-teal-500 rounded-full shadow-lg"></div>
            <div className="w-8 h-1 bg-gradient-to-r from-teal-500 to-transparent rounded-full"></div>
          </div>

          {/* Status indicator */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-white/20 shadow-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">
              Live Dashboard
            </span>
          </div>
        </motion.div>
        <div className="flex justify-end items-center mb-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 text-gray-600 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 hover:bg-white hover:shadow-md transition-all disabled:opacity-50 disabled:hover:bg-white/80 disabled:hover:shadow-sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {/* Enhanced Key Metrics */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12"
        >
          {/* Enhanced Total Users Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-0 text-white hover:shadow-2xl transition-all duration-500 p-3 hover:scale-105 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent"></div>
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:blur-xl transition-all duration-500"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-300 to-blue-100"></div>

            <CardHeader className="p-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-blue-100 flex items-center gap-3">
                <div className="p-3 bg-white/25 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors shadow-lg">
                  <Users size={22} className="drop-shadow-sm" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">
                    Total Users
                  </div>
                  <div className="text-xs text-blue-200">
                    Platform community
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pb-6">
              <div className="text-5xl  font-black mb-3 text-white  drop-shadow-lg">
                {formatNumber(dashboardData.totalUsers)}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-100 flex items-center gap-2">
                  <Target size={16} />
                  Active members
                </div>
                <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">
                  +12% growth
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Total Revenue Card */}
          <Card className="relative p-3 overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-teal-700 border-0 text-white hover:shadow-2xl transition-all duration-500 hover:scale-105 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent"></div>
            <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-300 to-teal-200"></div>

            <CardHeader className="p-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-emerald-100 flex items-center gap-3">
                <div className="p-3 bg-white/25 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors shadow-lg">
                  <PhilippinePeso size={22} className="drop-shadow-sm" />
                </div>

                <div>
                  <div className="text-base font-bold text-white">
                    Total Revenue
                  </div>
                  <div className="text-xs text-emerald-200">
                    Lifetime earnings
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pb-6">
              <div className="text-5xl font-black mb-3 text-white drop-shadow-lg">
                ₱{formatNumber(dashboardData.totalRevenue)}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-emerald-200 flex items-center gap-2">
                  <Calendar size={14} />
                  Last: {dashboardData.lastTransactionDate}
                </div>
                <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">
                  +8.5% month
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Transactions Card */}
          <Card className="relative p-3 overflow-hidden bg-gradient-to-br from-purple-500 via-indigo-600 to-indigo-700 border-0 text-white hover:shadow-2xl transition-all duration-500 hover:scale-105 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-transparent"></div>
            <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full blur-2xl group-hover:blur-xl transition-all duration-500"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-300 to-indigo-200"></div>

            <CardHeader className="p-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-purple-100 flex items-center gap-3">
                <div className="p-3 bg-white/25 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-colors shadow-lg">
                  <CreditCard size={22} className="drop-shadow-sm" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">
                    Transactions
                  </div>
                  <div className="text-xs text-purple-200">
                    Payment processing
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pb-6">
              <div className="text-5xl font-black mb-3 text-white drop-shadow-lg">
                {formatNumber(dashboardData.totalTransactions)}
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-purple-100">
                  {formatNumber(dashboardData.successfulTransactions)}{" "}
                  successful
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="w-full bg-white/20 rounded-full h-2 mr-3">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-1000 ease-out shadow-sm"
                    style={{
                      width: `${
                        dashboardData.totalTransactions > 0
                          ? Math.round(
                              (dashboardData.successfulTransactions /
                                dashboardData.totalTransactions) *
                                100
                            )
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="text-xs bg-white/25 px-3 py-1 rounded-full font-bold backdrop-blur-sm">
                  {dashboardData.totalTransactions > 0
                    ? `${Math.round(
                        (dashboardData.successfulTransactions /
                          dashboardData.totalTransactions) *
                          100
                      )}%`
                    : "0%"}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Enhanced Period Comparison Chart */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full"
        >
          <Card className="bg-gradient-to-br from-white/90 via-white/80 to-blue-50/40 backdrop-blur-lg border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 relative overflow-hidden">
            {/* Card background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/20"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100/30 to-transparent rounded-full blur-3xl"></div>

            <CardHeader className="relative z-10 border-b border-gray-100/50 bg-white/40 backdrop-blur-sm">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                      <BarChart3
                        size={28}
                        className="text-white drop-shadow-md"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                      Weekly Performance
                    </h3>
                    <p className="text-base text-gray-600 font-medium mt-1">
                      Daily transaction amounts compared to your weekly average
                    </p>
                  </div>
                </div>

                {/* Enhanced period selector */}
                <div className="hidden md:flex gap-2 bg-white/60 backdrop-blur-sm p-1 rounded-xl shadow-inner">
                  {timeRangeOptions.map((period) => (
                    <button
                      key={period.label}
                      onClick={() => setSelectedTimeRange(period)}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-300 ${
                        selectedTimeRange.label === period.label
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                          : "text-gray-600 hover:bg-white/80 hover:text-indigo-700 hover:shadow-md"
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="relative z-10 p-8">
              <div className="relative">
                {/* Enhanced background pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-transparent to-indigo-50/30 rounded-2xl"></div>
                <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-inner"></div>

                <div className="relative h-[380px] p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={[
                        {
                          day: "Mon",
                          today:
                            computePeriodTotals(completedTransactions).daily *
                            0.8,
                          average:
                            computePeriodTotals(completedTransactions).weekly /
                            7,
                        },
                        {
                          day: "Tue",
                          today:
                            computePeriodTotals(completedTransactions).daily *
                            1.2,
                          average:
                            computePeriodTotals(completedTransactions).weekly /
                            7,
                        },
                        {
                          day: "Wed",
                          today:
                            computePeriodTotals(completedTransactions).daily *
                            1.5,
                          average:
                            computePeriodTotals(completedTransactions).weekly /
                            7,
                        },
                        {
                          day: "Thu",
                          today:
                            computePeriodTotals(completedTransactions).daily *
                            0.9,
                          average:
                            computePeriodTotals(completedTransactions).weekly /
                            7,
                        },
                        {
                          day: "Fri",
                          today:
                            computePeriodTotals(completedTransactions).daily *
                            1.1,
                          average:
                            computePeriodTotals(completedTransactions).weekly /
                            7,
                        },
                        {
                          day: "Sat",
                          today:
                            computePeriodTotals(completedTransactions).daily *
                            0.7,
                          average:
                            computePeriodTotals(completedTransactions).weekly /
                            7,
                        },
                        {
                          day: "Sun",
                          today:
                            computePeriodTotals(completedTransactions).daily *
                            0.9,
                          average:
                            computePeriodTotals(completedTransactions).weekly /
                            7,
                        },
                      ]}
                      margin={{ top: 30, right: 40, left: 30, bottom: 30 }}
                    >
                      <defs>
                        {/* Enhanced gradients for line chart */}
                        <linearGradient
                          id="todayGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3b82f6"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="100%"
                            stopColor="#3b82f6"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                        <linearGradient
                          id="averageGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#6b7280"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor="#6b7280"
                            stopOpacity={0.1}
                          />
                        </linearGradient>

                        {/* Enhanced glow effect */}
                        <filter
                          id="glow"
                          x="-50%"
                          y="-50%"
                          width="200%"
                          height="200%"
                        >
                          <feGaussianBlur
                            stdDeviation="3"
                            result="coloredBlur"
                          />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-gray-300/30"
                        vertical={false}
                        horizontal={true}
                      />
                      <XAxis
                        dataKey="day"
                        className="text-sm"
                        tick={{
                          fontSize: 13,
                          fill: "#6b7280",
                          fontWeight: 600,
                        }}
                        interval={selectedTimeRange.label === "Month" ? 2 : 0}
                        axisLine={false}
                        tickLine={false}
                        tickMargin={15}
                      />
                      <YAxis
                        className="text-sm"
                        tick={{
                          fontSize: 13,
                          fill: "#6b7280",
                          fontWeight: 600,
                        }}
                        tickFormatter={(value) =>
                          `₱${(value / 1000).toFixed(0)}k`
                        }
                        axisLine={false}
                        tickLine={false}
                        tickMargin={10}
                        domain={["dataMin - 1000", "dataMax + 1000"]}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const currentDay = new Date().toLocaleDateString(
                              "en-US",
                              { weekday: "long" }
                            );
                            const isToday =
                              label === currentDay.substring(0, 3);

                            return (
                              <div className="bg-gray-900/95 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700/50 min-w-[200px] text-white">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                  <p className="font-bold text-white text-base">
                                    {label === "Mon"
                                      ? "Monday"
                                      : label === "Tue"
                                      ? "Tuesday"
                                      : label === "Wed"
                                      ? "Wednesday"
                                      : label === "Thu"
                                      ? "Thursday"
                                      : label === "Fri"
                                      ? "Friday"
                                      : label === "Sat"
                                      ? "Saturday"
                                      : "Sunday"}
                                    {isToday && (
                                      <span className="ml-2 text-xs bg-blue-500 px-2 py-1 rounded-full">
                                        Today
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="space-y-3">
                                  {payload.map((entry, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{
                                            backgroundColor: entry.color,
                                          }}
                                        ></div>
                                        <span className="text-sm font-medium text-gray-300">
                                          {entry.dataKey === "today"
                                            ? "Today"
                                            : "Average"}
                                        </span>
                                      </div>
                                      <span className="font-bold text-white">
                                        ₱
                                        {entry.value?.toLocaleString?.() ?? "0"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{
                          stroke: "#3b82f6",
                          strokeWidth: 2,
                          strokeDasharray: "5 5",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="today"
                        stroke="#3b82f6"
                        strokeWidth={4}
                        dot={{
                          fill: "#3b82f6",
                          strokeWidth: 3,
                          stroke: "#ffffff",
                          r: 6,
                          filter: "url(#glow)",
                        }}
                        activeDot={{
                          r: 8,
                          fill: "#3b82f6",
                          stroke: "#ffffff",
                          strokeWidth: 3,
                          filter: "url(#glow)",
                        }}
                        name="Today"
                      />
                      <Line
                        type="monotone"
                        dataKey="average"
                        stroke="#6b7280"
                        strokeWidth={3}
                        strokeDasharray="8 4"
                        dot={{
                          fill: "#6b7280",
                          strokeWidth: 2,
                          stroke: "#ffffff",
                          r: 5,
                        }}
                        activeDot={{
                          r: 7,
                          fill: "#6b7280",
                          stroke: "#ffffff",
                          strokeWidth: 2,
                        }}
                        name="Average"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>

                {/* Enhanced value indicators */}
                <div className="flex justify-between mt-6 px-6">
                  <div className="text-center group cursor-pointer bg-white/40 backdrop-blur-sm p-4 rounded-xl hover:bg-white/60 transition-all duration-300 border border-white/30">
                    <div className="flex items-center justify-center mb-2">
                      <div className="w-3 h-3 rounded-full mr-2 bg-blue-500 shadow-lg"></div>
                      <p className="text-sm font-bold text-gray-700">Today</p>
                    </div>
                    <p className="font-black text-lg text-blue-600 mb-1">
                      ₱
                      {computePeriodTotals(
                        completedTransactions
                      ).daily?.toLocaleString?.() ?? "0"}
                    </p>
                    <p className="text-xs text-green-600 font-semibold">
                      Current
                    </p>
                  </div>

                  <div className="text-center group cursor-pointer bg-white/40 backdrop-blur-sm p-4 rounded-xl hover:bg-white/60 transition-all duration-300 border border-white/30">
                    <div className="flex items-center justify-center mb-2">
                      <div className="w-3 h-3 rounded-full mr-2 bg-gray-500 shadow-lg"></div>
                      <p className="text-sm font-bold text-gray-700">Average</p>
                    </div>
                    <p className="font-black text-lg text-gray-600 mb-1">
                      ₱
                      {Math.round(
                        computePeriodTotals(completedTransactions).weekly / 7
                      )?.toLocaleString?.() ?? "0"}
                    </p>
                    <p className="text-xs text-gray-500 font-semibold">
                      Daily avg
                    </p>
                  </div>

                  <div className="text-center group cursor-pointer bg-white/40 backdrop-blur-sm p-4 rounded-xl hover:bg-white/60 transition-all duration-300 border border-white/30">
                    <div className="flex items-center justify-center mb-2">
                      <div className="w-3 h-3 rounded-full mr-2 bg-purple-500 shadow-lg"></div>
                      <p className="text-sm font-bold text-gray-700">Weekly</p>
                    </div>
                    <p className="font-black text-lg text-purple-600 mb-1">
                      ₱
                      {computePeriodTotals(
                        completedTransactions
                      ).weekly?.toLocaleString?.() ?? "0"}
                    </p>
                    <p className="text-xs text-purple-600 font-semibold">
                      7 days
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Activity Cards Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
        >
          {/* New Users Activity Card */}
          <Card className="bg-white/90 backdrop-blur-lg border- p-5 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            <CardHeader className="border-b border-gray-100/60 bg-white/60 backdrop-blur-sm relative z-10">
              <CardTitle className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Users size={20} className="text-white drop-shadow-md" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">New Users</h3>
                  <p className="text-sm text-gray-600">Recent registrations</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 relative z-10">
              <div className="space-y-4">
                {recentActivity
                  .filter((activity) => activity.type === "user_action")
                  .map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm rounded-xl hover:shadow-md transition-all duration-300 group border border-white/50"
                    >
                      <div className="p-2 bg-white rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                        <User size={18} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="truncate">{activity.user}</span>
                          <span>•</span>
                          <span>{formatTimestamp(activity.timestamp)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Transactions Activity Card */}
          <Card className="bg-white/90 p-5 backdrop-blur-lg border-0 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <CardHeader className="border-b border-gray-100/60 bg-white/60 backdrop-blur-sm relative z-10">
              <CardTitle className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                    <CreditCard
                      size={20}
                      className="text-white drop-shadow-md"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Transactions
                  </h3>
                  <p className="text-sm text-gray-600">Recent payments</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 relative z-10">
              <div className="space-y-4">
                {recentActivity
                  .filter((activity) => activity.type === "transaction")
                  .map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm rounded-xl hover:shadow-md transition-all duration-300 group border border-white/50"
                    >
                      <div className="p-2 bg-white rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                        <PhilippinePeso
                          size={18}
                          className="text-emerald-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="truncate">{activity.user}</span>
                          <span>•</span>
                          <span>{formatTimestamp(activity.timestamp)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusIcon(activity.status)}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Support Tickets Activity Card */}
          <Card className="bg-white/90 backdrop-blur-lg p-5 border-0 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <CardHeader className="border-b border-gray-100/60 bg-white/60 backdrop-blur-sm relative z-10">
              <CardTitle className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl blur-sm opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                    <FileText size={20} className="text-white drop-shadow-md" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Support Tickets
                  </h3>
                  <p className="text-sm text-gray-600">Recent inquiries</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 relative z-10">
              <div className="space-y-4">
                {supportTickets.map((ticket, index) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm rounded-xl hover:shadow-md transition-all duration-300 group border border-white/50"
                  >
                    <div className="p-2 bg-white rounded-lg shadow-md group-hover:shadow-lg transition-shadow">
                      <FileText size={18} className="text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {ticket.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span className="truncate">{ticket.userId}</span>
                        <span>•</span>
                        <span>{formatTimestamp(ticket.createdAt)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div style={{ height: "600px" }}>
          <ItemsMap />
        </div>
      </div>
    </div>
  );
}
