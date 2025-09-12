"use client";

import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/app/firebase/config";

type UserLogEntry = {
  id: string;
  email?: string;
  uid?: string;
  adminRole?: string;
  loginLogs: {
    lastLogin?: Date | null;
    lastLogout?: Date | null;
  }[];
  timestamp?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: any;
};

type SessionRow = {
  rowId: string; // unique for React key
  parentId: string; // original doc id
  email: string;
  uid: string;
  adminRole: string;
  lastLogin: Date | null;
  lastLogout: Date | null;
  activityTime: number; // numeric timestamp for sorting
  isOnline: boolean;
};

const UserLogsPage = () => {
  const [logs, setLogs] = useState<UserLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  // Function to fetch admin role from admin collection
  const fetchAdminRole = async (
    uid: string,
    email: string
  ): Promise<string> => {
    try {
      if (uid) {
        const adminDocRef = doc(db, "admin", uid);
        const adminDoc = await getDoc(adminDocRef);
        if (adminDoc.exists()) {
          return adminDoc.data()?.role || adminDoc.data()?.adminRole || "user";
        }
      }

      if (email) {
        const adminCollection = collection(db, "admin");
        const adminSnapshot = await getDocs(adminCollection);

        for (const adminDoc of adminSnapshot.docs) {
          const adminData = adminDoc.data();
          if (adminData.email === email) {
            return adminData.role || adminData.adminRole || "user";
          }
        }
      }

      return "user";
    } catch (error) {
      console.error("Error fetching admin role:", error);
      return "user";
    }
  };

  // Fetch user logs from Firebase (unchanged logic for reading + date conversions)
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const userLogsCollection = collection(db, "userLogs");
        const q = query(userLogsCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const logsData: UserLogEntry[] = [];

        // Process each document
        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data();

          // Convert Firestore timestamps to readable dates
          const processDate = (dateField: any) => {
            if (dateField === null) return null; // explicit null preserved
            if (!dateField && dateField !== 0) return null; // undefined / falsy -> null
            if (dateField?.toDate) return dateField.toDate();
            if (typeof dateField === "string") {
              const date = new Date(dateField);
              return isNaN(date.getTime()) ? null : date;
            }
            if (typeof dateField === "number") return new Date(dateField);
            return null;
          };

          // Initialize loginLogs array if it doesn't exist or is not an array
          let processedLoginLogs: {
            lastLogin?: Date | null;
            lastLogout?: Date | null;
          }[] = [];

          if (data.loginLogs) {
            const logsArray = Array.isArray(data.loginLogs)
              ? data.loginLogs
              : Object.values(data.loginLogs);
            processedLoginLogs = logsArray.map((logEntry: any) => ({
              lastLogin: processDate(logEntry.lastLogin),
              lastLogout: logEntry.hasOwnProperty("lastLogout") // preserve explicit null
                ? processDate(logEntry.lastLogout)
                : undefined,
            }));
          } else {
            const singleEntry = {
              lastLogin: processDate(data.lastLogin),
              lastLogout: data.hasOwnProperty("lastLogout")
                ? processDate(data.lastLogout)
                : undefined,
            };
            processedLoginLogs = [singleEntry];
          }

          const adminRole = await fetchAdminRole(
            data.uid || "",
            data.email || ""
          );

          const logEntry: UserLogEntry = {
            id: docSnapshot.id,
            email: data.email || "",
            uid: data.uid || "",
            adminRole: adminRole,
            loginLogs: processedLoginLogs,
            timestamp:
              processDate(data.updatedAt) || processDate(data.createdAt),
            createdAt: processDate(data.createdAt),
            updatedAt: processDate(data.updatedAt),
            ...data,
          };

          logsData.push(logEntry);
        }

        setLogs(logsData);
      } catch (err) {
        const errorMsg =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : String(err);
        setError("Failed to fetch user logs: " + errorMsg);
        console.error("Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Helper: determine if a single session is online
  const isSessionOnline = (session: {
    lastLogin?: Date | null;
    lastLogout?: Date | null;
  }) => {
    if (!session?.lastLogin) return false;
    // explicit null in lastLogout => still logged in
    if (session.lastLogout === null) return true;
    // if no explicit lastLogout, treat as offline (so we don't accidentally mark unknown as online)
    if (!session.lastLogout) return false;
    return (
      new Date(session.lastLogin).getTime() >
      new Date(session.lastLogout).getTime()
    );
  };

  // Flatten logs -> session rows (one row per loginLogs entry)
  const sessionRows: SessionRow[] = logs.flatMap((log) => {
    const sessionsSource =
      log.loginLogs && Array.isArray(log.loginLogs) && log.loginLogs.length > 0
        ? log.loginLogs
        : [{ lastLogin: log.lastLogin || null, lastLogout: log.lastLogout }];
    return sessionsSource.map((session, idx) => {
      const loginTime = session?.lastLogin
        ? new Date(session.lastLogin).getTime()
        : 0;
      const logoutTime = session?.lastLogout
        ? new Date(session.lastLogout).getTime()
        : 0;
      const activityTime = Math.max(loginTime, logoutTime, 0);

      return {
        rowId: `${log.id}-${idx}`,
        parentId: log.id,
        email: log.email || "N/A",
        uid: log.uid || "N/A",
        adminRole: log.adminRole || "user",
        lastLogin: session?.lastLogin ?? null,
        lastLogout: session?.lastLogout ?? null,
        activityTime,
        isOnline: isSessionOnline(session),
      };
    });
  });

  // Apply search, role, status filter and sort
  const filteredSortedSessions = (() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = sessionRows.filter((s) => {
      const matchesSearch =
        !term ||
        s.email.toLowerCase().includes(term) ||
        s.adminRole.toLowerCase().includes(term) ||
        s.uid.toLowerCase().includes(term);
      const matchesRole = roleFilter === "all" || s.adminRole === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "online" && s.isOnline) ||
        (statusFilter === "offline" && !s.isOnline);
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort: online first, then offline by most recent activity (desc)
    filtered.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return b.activityTime - a.activityTime;
    });

    return filtered;
  })();

  // Pagination for session rows
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSortedSessions.length / itemsPerPage)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSessions = filteredSortedSessions.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Unique roles for role filter (from session rows so it matches displayed rows)
  const uniqueRoles = [
    ...new Set(sessionRows.map((r) => r.adminRole).filter(Boolean)),
  ];

  // Format date (works with Date or null)
  const formatDate = (date: Date | string | number | undefined | null) => {
    if (!date) return "Never";
    try {
      return new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  // Keep unique user counts (same logic as before: choose latest timestamp per user)
  const getUniqueUsers = () => {
    const userMap = new Map<string, { timestamp?: Date }>();

    logs.forEach((log) => {
      const identifier = log.email || log.uid;
      if (!identifier) return;

      const existing = userMap.get(identifier);
      if (
        !existing ||
        (log.timestamp &&
          existing.timestamp &&
          log.timestamp > existing.timestamp) ||
        (log.timestamp && !existing.timestamp)
      ) {
        userMap.set(identifier, { timestamp: log.timestamp });
      }
    });

    return Array.from(userMap.keys());
  };

  const uniqueUsers = getUniqueUsers();
  // Compute how many unique users currently online (if any of their sessions is online)
  const uniqueUserOnlineCount = (() => {
    const map = new Map<string, boolean>();
    logs.forEach((log) => {
      const id = log.email || log.uid;
      if (!id) return;
      const anyOnline = (log.loginLogs || []).some((s) => isSessionOnline(s));
      if (map.has(id)) {
        if (!map.get(id) && anyOnline) map.set(id, true);
      } else {
        map.set(id, anyOnline);
      }
    });
    return Array.from(map.values()).filter(Boolean).length;
  })();

  const onlineUsers = uniqueUserOnlineCount;
  const offlineUsers = Math.max(0, uniqueUsers.length - onlineUsers);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

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
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
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
            User Login Logs
          </h1>
          <p className="text-slate-600">
            Monitor user login and logout activities from userLogs collection
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
                  placeholder="Search by email, role, or UID..."
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
                  {sessionRows.length}
                </div>
                <div className="text-slate-500">Total Logs</div>
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
                    User Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Last Login
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Last Logout
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedSessions.map((row, idx) => {
                  const sequentialNumber = startIndex + idx + 1;

                  return (
                    <tr
                      key={row.rowId}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                          {sequentialNumber}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {(row.email?.charAt(0) || "U").toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-slate-900">
                              {row.email}
                            </div>
                            <div className="text-sm text-slate-500">
                              UID: {row.uid}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            row.adminRole === "superAdmin"
                              ? "bg-purple-100 text-purple-800"
                              : row.adminRole === "admin"
                              ? "bg-blue-100 text-blue-800"
                              : row.adminRole === "moderator"
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {row.adminRole}
                        </span>
                      </td>

                      <td className="px-6 py-4">{formatDate(row.lastLogin)}</td>

                      <td className="px-6 py-4">
                        {row.lastLogout === null ? (
                          <span className="text-green-600 font-medium">
                            Still logged in
                          </span>
                        ) : row.lastLogout ? (
                          formatDate(row.lastLogout)
                        ) : (
                          "No logout"
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.isOnline
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                              row.isOnline ? "bg-green-400" : "bg-slate-400"
                            }`}
                          />
                          {row.isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredSortedSessions.length === 0 && !loading && (
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
                No user logs match your current filters.
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-700">
                  Showing {startIndex + 1} to{" "}
                  {Math.min(
                    startIndex + itemsPerPage,
                    filteredSortedSessions.length
                  )}{" "}
                  of {filteredSortedSessions.length} results
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

                  <div className="flex space-x-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={`page-${page}`}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          {page}
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
