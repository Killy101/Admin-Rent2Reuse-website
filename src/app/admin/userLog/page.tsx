"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/app/firebase/config";

type LoginLog = {
  timestamp: Date;
  [key: string]: any;
};

type AdminLog = {
  id: string;
  email?: string;
  adminRole?: string;
  lastLogin?: Date;
  lastLogout?: Date;
  loginLogs?: LoginLog[];
  [key: string]: any;
};

const UserLogsPage = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState("lastLogout");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const itemsPerPage = 10;

  // Fetch admin logs from Firebase
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const adminCollection = collection(db, "admin");

        let q = query(adminCollection);

        // Add ordering
        if (sortField === "lastLogout" || sortField === "lastLogin") {
          q = query(adminCollection, orderBy(sortField, sortDirection));
        }

        const querySnapshot = await getDocs(q);
        const logsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            ...data,
            // Convert Firestore timestamps to readable dates
            lastLogin:
              data.lastLogin?.toDate?.() ||
              (data.lastLogin ? new Date(data.lastLogin) : null),
            lastLogout:
              data.lastLogout?.toDate?.() ||
              (data.lastLogout ? new Date(data.lastLogout) : null),
          };
        });

        setLogs(logsData);
      } catch (err) {
        const errorMsg =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : String(err);
        setError("Failed to fetch admin logs: " + errorMsg);
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [sortField, sortDirection]);

  // Filter and search logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adminRole?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || log.adminRole === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && isUserOnline(log)) ||
      (statusFilter === "offline" && !isUserOnline(log));
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Get unique roles for filter dropdown
  const uniqueRoles = [
    ...new Set(logs.map((log) => log.adminRole).filter(Boolean)),
  ];

  // Handle sorting
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Format date
  const formatDate = (date: Date | string | number | undefined | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Check if user is online (has logged in but not logged out, or logout is older than login)
  const isUserOnline = (log: AdminLog) => {
    // If no lastLogin, user is offline
    if (!log.lastLogin) return false;

    // If no lastLogout, user is online (logged in but never logged out)
    if (!log.lastLogout) return true;

    // Compare last login and last logout times
    const lastLoginTime = new Date(log.lastLogin).getTime();
    const lastLogoutTime = new Date(log.lastLogout).getTime();

    // User is online if last login is more recent than last logout
    return lastLoginTime > lastLogoutTime;
  };

  // Count online and offline users
  const onlineUsers = logs.filter((log) => isUserOnline(log)).length;
  const offlineUsers = logs.length - onlineUsers;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded-lg w-64 mb-6"></div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-red-800">
                  Error Loading Logs
                </h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Admin User Logs
          </h1>
          <p className="text-slate-600">
            Monitor admin login and logout activities
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by email or role..."
                  className="pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-80"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Role Filter */}
              <select
                className="px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                className="px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="online">Online Only</option>
                <option value="offline">Offline Only</option>
              </select>
            </div>

            {/* User Status Stats */}
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {onlineUsers}
                </div>
                <div className="text-slate-500">Online</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-600">
                  {offlineUsers}
                </div>
                <div className="text-slate-500">Offline</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {logs.length}
                </div>
                <div className="text-slate-500">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    #
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    <button
                      onClick={() => handleSort("email")}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Admin Email
                      <svg
                        className={`h-4 w-4 transition-transform ${
                          sortField === "email" && sortDirection === "desc"
                            ? "rotate-180"
                            : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 10l5 5 5-5"
                        />
                      </svg>
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    <button
                      onClick={() => handleSort("adminRole")}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Role
                      <svg
                        className={`h-4 w-4 transition-transform ${
                          sortField === "adminRole" && sortDirection === "desc"
                            ? "rotate-180"
                            : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 10l5 5 5-5"
                        />
                      </svg>
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    <button
                      onClick={() => handleSort("lastLogin")}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Last Login
                      <svg
                        className={`h-4 w-4 transition-transform ${
                          sortField === "lastLogin" && sortDirection === "desc"
                            ? "rotate-180"
                            : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 10l5 5 5-5"
                        />
                      </svg>
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    <button
                      onClick={() => handleSort("lastLogout")}
                      className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                    >
                      Last Logout
                      <svg
                        className={`h-4 w-4 transition-transform ${
                          sortField === "lastLogout" && sortDirection === "desc"
                            ? "rotate-180"
                            : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 10l5 5 5-5"
                        />
                      </svg>
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedLogs.map((log, index) => {
                  const isOnline = isUserOnline(log);
                  const sequentialNumber = startIndex + index + 1;

                  return (
                    <tr
                      key={`${log.id}-${index}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                            {sequentialNumber}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {log.email?.charAt(0).toUpperCase() || "A"}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-slate-900">
                              {log.email || "N/A"}
                            </div>
                            <div className="text-sm text-slate-500">
                              ID: {log.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            log.adminRole === "super_admin"
                              ? "bg-purple-100 text-purple-800"
                              : log.adminRole === "admin"
                              ? "bg-blue-100 text-blue-800"
                              : log.adminRole === "moderator"
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {log.adminRole || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">
                          {formatDate(log.lastLogin)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">
                          {formatDate(log.lastLogout)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isOnline
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                              isOnline ? "bg-green-400" : "bg-slate-400"
                            }`}
                          ></span>
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-semibold text-slate-900">
                No logs found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                No admin logs match your current filters.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-700">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(startIndex + itemsPerPage, filteredLogs.length)} of{" "}
                  {filteredLogs.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex space-x-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserLogsPage;
