"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Calendar, Zap } from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

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

interface TimeRange {
  label: "Week" | "Month" | "Year";
  days: number;
}

interface EnhancedWeeklyChartProps {
  completedTransactions: Transaction[];
  selectedTimeRange: TimeRange;
  setSelectedTimeRange: (range: TimeRange) => void;
  timeRangeOptions: TimeRange[];
  isValidTimestamp: (timestamp: any) => boolean;
}

// Helper to format day names
const formatDay = (date: Date): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

// Helper function to compute period totals
function computePeriodTotals(transactions: Transaction[], isValidTimestamp: (timestamp: any) => boolean) {
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

// Generate actual chart data from real transactions
function generateChartData(transactions: Transaction[], isValidTimestamp: (timestamp: any) => boolean) {
  const now = new Date();
  const chartData = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    
    const dayTransactions = transactions.filter((t) => {
      if (!isValidTimestamp(t.createdAt)) return false;
      const txDate = t.createdAt.toDate();
      return txDate >= date && txDate < nextDate;
    });
    
    const dayRevenue = dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    chartData.push({
      day: formatDay(date),
      today: dayRevenue,
      fullDate: date,
    });
  }
  
  const totalRevenue = chartData.reduce((sum, day) => sum + day.today, 0);
  const average = totalRevenue / 7;
  
  return chartData.map(day => ({
    ...day,
    average: average,
  }));
}

const EnhancedWeeklyPerformanceChart: React.FC<EnhancedWeeklyChartProps> = ({
  completedTransactions,
  selectedTimeRange,
  setSelectedTimeRange,
  timeRangeOptions,
  isValidTimestamp,
}) => {
  const totals = computePeriodTotals(completedTransactions, isValidTimestamp);
  const chartData = generateChartData(completedTransactions, isValidTimestamp);

  const avgRevenue = totals.weekly / 7;
  const todayRevenue = totals.daily;
  const percentChange = avgRevenue > 0 ? ((todayRevenue - avgRevenue) / avgRevenue) * 100 : 0;
  const isPositive = percentChange >= 0;

  const getDayName = (shortDay: string): string => {
    const dayMap: {[key: string]: string} = {
      'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
      'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday'
    };
    return dayMap[shortDay] || shortDay;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentDay = formatDay(new Date());
      const isToday = label === currentDay;

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-gray-700/50 min-w-[220px]"
        >
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/50">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg shadow-blue-500/50"></div>
            <p className="font-bold text-white text-base">
              {getDayName(label)}
              {isToday && (
                <span className="ml-2 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 px-2 py-1 rounded-full shadow-lg">
                  Today
                </span>
              )}
            </p>
          </div>
          <div className="space-y-3">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shadow-lg"
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-300">
                    {entry.dataKey === "today" ? "Revenue" : "Week Avg"}
                  </span>
                </div>
                <span className="font-bold text-white text-lg">
                  ₱{Math.round(entry.value || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      );
    }
    return null;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full"
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-white via-white to-blue-50/30 backdrop-blur-lg border-0 shadow-2xl hover:shadow-3xl transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-purple-50/40"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-200/20 via-purple-200/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-cyan-200/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"></div>

        <CardHeader className="relative z-10 border-b border-gray-100/60 bg-white/40 backdrop-blur-sm pb-6">
          <CardTitle className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 rounded-2xl blur-md opacity-60 group-hover:opacity-80 transition-opacity animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-blue-500 via-purple-600 to-cyan-600 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300">
                  <BarChart3 size={32} className="text-white drop-shadow-lg" />
                </div>
              </div>
              
              <div>
                <h3 className="text-3xl p-5 font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
                  Weekly Performance
                </h3>
                <p className="text-sm text-gray-600 font-medium flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500" />
                  Daily revenue tracking and trend analysis
                </p>
              </div>
            </div>

            <div className="flex gap-2 bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-white/40">
              {timeRangeOptions.map((period) => (
                <motion.button
                  key={period.label}
                  onClick={() => setSelectedTimeRange(period)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${
                    selectedTimeRange.label === period.label
                      ? "bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                      : "text-gray-600 hover:bg-white hover:text-blue-700 hover:shadow-md"
                  }`}
                >
                  {period.label}
                </motion.button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="relative z-10 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl blur-sm opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-blue-50 to-cyan-50/50 backdrop-blur-sm p-6 rounded-2xl border border-blue-200/50 hover:border-blue-300/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg shadow-lg">
                      <Zap size={18} className="text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-700">Today's Revenue</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isPositive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                  </div>
                </div>
                <p className="text-3xl font-black text-blue-600 mb-1">
                  ₱{totals.daily?.toLocaleString() ?? "0"}
                </p>
                <p className="text-xs text-gray-600 font-medium">Current day performance</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-sm opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-purple-50 to-pink-50/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-200/50 hover:border-purple-300/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
                      <TrendingUp size={18} className="text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-700">Daily Average</p>
                  </div>
                </div>
                <p className="text-3xl font-black text-purple-600 mb-1">
                  ₱{Math.round(avgRevenue)?.toLocaleString() ?? "0"}
                </p>
                <p className="text-xs text-gray-600 font-medium">7-day average revenue</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl blur-sm opacity-20 group-hover:opacity-30 transition-opacity"></div>
              <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50/50 backdrop-blur-sm p-6 rounded-2xl border border-emerald-200/50 hover:border-emerald-300/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-lg">
                      <BarChart3 size={18} className="text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-700">Weekly Total</p>
                  </div>
                </div>
                <p className="text-3xl font-black text-emerald-600 mb-1">
                  ₱{totals.weekly?.toLocaleString() ?? "0"}
                </p>
                <p className="text-xs text-gray-600 font-medium">Last 7 days combined</p>
              </div>
            </motion.div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white/20 to-purple-50/30 rounded-3xl"></div>
            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-3xl border border-white/50 shadow-inner"></div>

            <div className="relative h-[400px] p-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 30, right: 40, left: 30, bottom: 30 }}
                >
                  <defs>
                    <linearGradient id="todayGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="averageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6b7280" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6b7280" stopOpacity={0.05} />
                    </linearGradient>

                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-gray-300/20"
                    vertical={false}
                    horizontal={true}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 14, fill: "#6b7280", fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={20}
                  />
                  <YAxis
                    tick={{ fontSize: 14, fill: "#6b7280", fontWeight: 700 }}
                    tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={15}
                    domain={[0, "dataMax + 1000"]}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: "#3b82f6",
                      strokeWidth: 2,
                      strokeDasharray: "5 5",
                      strokeOpacity: 0.5,
                    }}
                  />
                  
                  <Area
                    type="monotone"
                    dataKey="today"
                    stroke="#3b82f6"
                    strokeWidth={4}
                    fill="url(#todayGradient)"
                    dot={{
                      fill: "#3b82f6",
                      strokeWidth: 4,
                      stroke: "#ffffff",
                      r: 7,
                      filter: "url(#glow)",
                    }}
                    activeDot={{
                      r: 10,
                      fill: "#3b82f6",
                      stroke: "#ffffff",
                      strokeWidth: 4,
                      filter: "url(#glow)",
                    }}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#6b7280"
                    strokeWidth={3}
                    strokeDasharray="10 5"
                    dot={{
                      fill: "#6b7280",
                      strokeWidth: 3,
                      stroke: "#ffffff",
                      r: 6,
                    }}
                    activeDot={{
                      r: 8,
                      fill: "#6b7280",
                      stroke: "#ffffff",
                      strokeWidth: 3,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-8 mt-6 pb-4">
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/50 shadow-lg">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50"></div>
                <span className="text-sm font-bold text-gray-700">Daily Revenue</span>
              </div>
              <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/50 shadow-lg">
                <div className="w-4 h-1 bg-gray-500 rounded-full"></div>
                <span className="text-sm font-bold text-gray-700">Weekly Average</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
};

export default EnhancedWeeklyPerformanceChart;