"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { auth, db } from "@/app/firebase/config";
import {
  collection,
  getDocs,
  doc,
  query,
  where,
  getDoc,
  updateDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import {
  FiUsers,
  FiFilter,
  FiDownload,
  FiEye,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiStar,
  FiX,
  FiChevronDown,
  FiUserCheck,
  FiUserX,
  FiTrendingUp,
  FiGrid,
  FiList,
  FiBell,
  FiPackage,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

// Extend UserData interface
interface UserData {
  uid: string;
  email: string;
  firstname: string;
  lastname: string;
  middlename?: string;
  birthday?: any;
  contactNumber?: string;
  location: {
    address: string;
    latitude?: string;
    longitude?: string;
    updated?: string;
  };
  role: string;
  currentPlan: {
    planType: "Free" | "Basic" | "Premium";
    status: "Active" | "Inactive" | "Expired";
    subscriptionId?: string;
  };
  profileImage?: string;
  rate: number;
  createdAt: any;
  lastActive?: any;
  isVerified?: boolean;
  accountStatus?: "Active" | "Suspended" | "Pending";
  totalSpent?: number;
  loginCount?: number;
  idVerified?: { idImage: string; idType: string };
  sex?: string;
}

interface SubscriptionDates {
  startDate: any;
  endDate: any;
}

interface UserStats {
  total: number;
  active: number;
  premium: number;
  basic: number;
  free: number;
  verified: number;
  suspended: number;
}

interface SortConfig {
  key: keyof UserData | "name" | "plan" | "date";
  direction: "asc" | "desc";
}

interface Filters {
  status: string;
  plan: string;
  verification: string;
  accountStatus: string;
}

interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  description: string;
  category: "harassment" | "fraud" | "inappropriate_content" | "spam" | "other";
  status: "pending" | "investigating" | "resolved" | "dismissed";
  createdAt: any;
  evidence?: string[];
  adminNotes?: string;
  actionTaken?:
    | "none"
    | "warning"
    | "temporary_suspension"
    | "permanent_suspension";
}

interface SuspensionReason {
  reportId?: string;
  category: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  duration?: number;
  adminId: string;
  createdAt: any;
}

interface UserItem {
  id: string;
  itemName: string;
  itemPrice: number;
  itemStatus: string;
  images: string[];
  owner: {
    id: string;
  };
}

interface ConfirmationAction {
  type: "suspend" | "activate";
  userId: string;
}
interface ConfirmationModalProps {
  confirmAction: ConfirmationAction | null;
  showConfirmModal: boolean;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowUserModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleUpdateUserStatus: (userId: string, newStatus: string) => Promise<void>;
}

interface UserModalProps {
  selectedUser: UserData | null;
  showUserModal: boolean;
  setShowUserModal: React.Dispatch<React.SetStateAction<boolean>>;
  userItems: UserItem[];
  selectedUserReports: UserReport[];
  subscriptionDates: { [key: string]: SubscriptionDates };
  formatDate: (timestamp: any) => string;
  getProfileImage: (imagePath: string | undefined) => string;
  handleImageError: (
    event: React.SyntheticEvent<HTMLImageElement, Event>
  ) => void;
  getPlanColorClass: (planType: string) => string;
  setShowSuspensionModal: React.Dispatch<React.SetStateAction<boolean>>;
  setConfirmAction: React.Dispatch<
    React.SetStateAction<ConfirmationAction | null>
  >;
  setShowConfirmModal: React.Dispatch<React.SetStateAction<boolean>>;
  setSuspensionReason: React.Dispatch<React.SetStateAction<SuspensionReason>>;
  setShowReportsModal: React.Dispatch<React.SetStateAction<boolean>>;
}

const USERS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// Fixed UserModal Component - moved outside main component
const UserModal: React.FC<UserModalProps> = ({
  selectedUser,
  showUserModal,
  setShowUserModal,
  userItems,
  selectedUserReports,
  subscriptionDates,
  formatDate,
  getProfileImage,
  handleImageError,
  getPlanColorClass,
  setShowSuspensionModal,
  setConfirmAction,
  setShowConfirmModal,
  setSuspensionReason,
  setShowReportsModal,
}) => {
  if (!selectedUser) return null;

  const isUserSuspended = selectedUser.accountStatus === "Suspended";

  // User Reports Section Component
  const UserReportsSection = () => (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900">
          Reports Against This User
        </h4>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            selectedUserReports.length > 0
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {selectedUserReports.length}{" "}
          {selectedUserReports.length === 1 ? "Report" : "Reports"}
        </span>
      </div>

      {selectedUserReports.length === 0 ? (
        <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
          <FiShield className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-green-700 font-medium">Clean Record</p>
          <p className="text-green-600 text-sm">
            No reports found against this user
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {selectedUserReports.map((report) => (
            <div
              key={report.id}
              className="border border-gray-200 rounded-lg p-4 bg-red-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.category === "harassment"
                          ? "bg-red-100 text-red-700"
                          : report.category === "fraud"
                          ? "bg-orange-100 text-orange-700"
                          : report.category === "inappropriate_content"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {(report.category || "other")
                        .replace("_", " ")
                        .toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(report.createdAt)}
                    </span>
                  </div>
                  <h5 className="font-medium text-gray-900 mb-1">
                    {report.reason}
                  </h5>
                  <p className="text-sm text-gray-600 mb-2">
                    {report.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    Reported by: {report.reporterName}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    report.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : report.status === "investigating"
                      ? "bg-blue-100 text-blue-700"
                      : report.status === "resolved"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {report.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
            <button
              onClick={() => setShowUserModal(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Profile Section */}
            <div className="flex items-center space-x-4">
              <img
                src={getProfileImage(selectedUser.profileImage)}
                onError={handleImageError}
                alt={`${selectedUser.firstname} ${selectedUser.lastname}`}
                className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
              />
              <div>
                <h3 className="text-xl font-semibold">
                  {selectedUser.firstname} {selectedUser.lastname}
                </h3>
                <p className="text-gray-600">{selectedUser.email}</p>
                <div className="flex items-center mt-2 space-x-2">
                  <span
                    className={`${getPlanColorClass(
                      selectedUser.currentPlan.planType
                    )} px-3 py-1 rounded-full text-sm font-medium`}
                  >
                    {selectedUser.currentPlan.planType}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedUser.currentPlan.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedUser.currentPlan.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact and Account Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">
                  Contact Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <FiMail className="w-5 h-5 text-gray-400" />
                    <span>{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FiPhone className="w-5 h-5 text-gray-400" />
                    <span>{selectedUser.contactNumber || "Not provided"}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FiMapPin className="w-5 h-5 text-gray-400" />
                    <span className="text-sm">
                      {selectedUser.location.address}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FiCalendar className="w-5 h-5 text-gray-400" />
                    <span className="text-sm">
                      {new Date(selectedUser.birthday).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Account Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <FiCalendar className="w-5 h-5 text-gray-400" />
                    <span>Joined: {formatDate(selectedUser.createdAt)}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FiStar className="w-5 h-5 text-gray-400" />
                    <span>Rating: {selectedUser.rate}/5</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FiUserCheck className="w-5 h-5 text-gray-400" />
                    <span>
                      Status: {selectedUser.accountStatus || "Active"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FiUserCheck className="w-5 h-5 text-gray-400" />
                    <span>Sex: {selectedUser.sex}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            {selectedUser.currentPlan.subscriptionId && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Subscription Details
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Start Date</p>
                      <p className="font-medium">
                        {subscriptionDates[
                          selectedUser.currentPlan.subscriptionId
                        ]?.startDate
                          ? formatDate(
                              subscriptionDates[
                                selectedUser.currentPlan.subscriptionId
                              ].startDate
                            )
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">End Date</p>
                      <p className="font-medium">
                        {subscriptionDates[
                          selectedUser.currentPlan.subscriptionId
                        ]?.endDate
                          ? formatDate(
                              subscriptionDates[
                                selectedUser.currentPlan.subscriptionId
                              ].endDate
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Items Section */}
            <div className="mt-8">
              <h4 className="font-semibold text-gray-900 mb-4">User Items</h4>
              {userItems.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No items found for this user</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                        <img
                          src={item.images[0] || "/placeholder-item.png"}
                          alt={item.itemName}
                          className="object-cover w-full h-48"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-item.png";
                          }}
                        />
                      </div>

                      <div className="p-4">
                        <h5 className="font-medium text-gray-900 mb-1 truncate">
                          {item.itemName}
                        </h5>
                        <div className="flex items-center justify-between">
                          <span className="text-green-600 font-medium">
                            ₱{item.itemPrice?.toFixed(2) ?? "0.00"}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.itemStatus === "Available"
                                ? "bg-green-100 text-green-700"
                                : item.itemStatus === "Rented"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.itemStatus || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Reports Section */}
            <UserReportsSection />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
              {isUserSuspended ? (
                <button
                  onClick={() => {
                    setConfirmAction({
                      type: "activate",
                      userId: selectedUser.uid,
                    });
                    setShowConfirmModal(true);
                  }}
                  className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center">
                    <FiUserCheck className="w-4 h-4 mr-2" />
                    Activate User
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSuspensionReason({
                      category: "",
                      description: "",
                      severity: "medium",
                      adminId: auth.currentUser?.uid || "",
                      createdAt: null,
                    });
                    setShowSuspensionModal(true);
                  }}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center">
                    <FiUserX className="w-4 h-4 mr-2" />
                    Suspend User
                  </div>
                </button>
              )}

              {selectedUserReports.length > 0 && (
                <button
                  onClick={() => setShowReportsModal(true)}
                  className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <div className="flex items-center">
                    <FiBell className="w-4 h-4 mr-2" />
                    View All Reports ({selectedUserReports.length})
                  </div>
                </button>
              )}

              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReportsModal = ({
  show,
  onClose,
  reports,
  formatDate,
}: {
  show: boolean;
  onClose: () => void;
  reports: UserReport[];
  formatDate: (timestamp: any) => string;
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto relative">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          User Reports
        </h3>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <FiX className="w-6 h-6" />
        </button>
        {reports.length === 0 ? (
          <p className="text-gray-600">No reports found for this user.</p>
        ) : (
          <ul className="space-y-4">
            {reports.map((report) => (
              <li key={report.id} className="border-b pb-2">
                <div className="font-medium">{report.reason}</div>
                <div className="text-xs text-gray-500">
                  {report.category} • {formatDate(report.createdAt)}
                </div>
                <div className="text-sm text-gray-700">
                  {report.description}
                </div>
                <div className="text-xs text-gray-400">
                  Status: {report.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default function EnhancedUsersPage() {
  // Core state
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // View and pagination state
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [pendingSuspendReason, setPendingSuspendReason] =
    useState<SuspensionReason | null>(null);

  // Report and suspension state
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedUserReports, setSelectedUserReports] = useState<UserReport[]>(
    []
  );
  const [suspensionReason, setSuspensionReason] = useState<SuspensionReason>({
    category: "",
    description: "",
    severity: "medium",
    adminId: "",
    createdAt: null,
  });
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    plan: "all",
    verification: "all",
    accountStatus: "all",
  });
  const [filterOpen, setFilterOpen] = useState(false);

  // Selection state for bulk actions
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Data state
  const [subscriptionDates, setSubscriptionDates] = useState<{
    [key: string]: SubscriptionDates;
  }>({});
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    active: 0,
    premium: 0,
    basic: 0,
    free: 0,
    verified: 0,
    suspended: 0,
  });

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmationAction | null>(
    null
  );

  // User items state
  const [userItems, setUserItems] = useState<UserItem[]>([]);

  // Filter ref
  const filterRef = useRef<HTMLDivElement>(null);

  // Utility functions
  const isValidTimestamp = (timestamp: any): boolean => {
    return (
      timestamp &&
      typeof timestamp === "object" &&
      "seconds" in timestamp &&
      "nanoseconds" in timestamp &&
      typeof timestamp.toDate === "function"
    );
  };

  const formatDate = useCallback((timestamp: any): string => {
    try {
      if (!timestamp) return "N/A";

      if (isValidTimestamp(timestamp)) {
        return timestamp.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }

      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }

      if (typeof timestamp === "string") {
        return new Date(timestamp).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }

      return "Invalid Date";
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  }, []);

  const getPlanColorClass = (planType: string) => {
    switch (planType) {
      case "Premium":
        return "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200";
      case "Basic":
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200";
      case "Free":
        return "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-200";
    }
  };

  // Fixed dynamic color classes
  const getStatColorClass = (color: string) => {
    switch (color) {
      case "blue":
        return "text-blue-600";
      case "green":
        return "text-green-600";
      case "purple":
        return "text-purple-600";
      case "red":
        return "text-red-600";
      case "gray":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatIconColorClass = (color: string) => {
    switch (color) {
      case "blue":
        return "text-blue-500";
      case "green":
        return "text-green-500";
      case "purple":
        return "text-purple-500";
      case "red":
        return "text-red-500";
      case "gray":
        return "text-gray-500";
      default:
        return "text-gray-500";
    }
  };

  const getProfileImage = (imagePath: string | undefined) => {
    return imagePath || "/profile/profile.png";
  };

  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    event.currentTarget.src = "/profile/profile.png";
  };

  // Fetch user reports
  const fetchUserReports = useCallback(async (userId?: string) => {
    try {
      const reportsRef = collection(db, "reports");
      let q = query(reportsRef);
      if (userId) {
        q = query(reportsRef, where("reportedUserId", "==", userId));
      }
      const querySnapshot = await getDocs(q);
      const reports: UserReport[] = [];

      // Collect all unique reporterIds and reportedUserIds
      const userIdsSet = new Set<string>();
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.reporterId) userIdsSet.add(data.reporterId);
        if (data.reportedUserId) userIdsSet.add(data.reportedUserId);
      });

      // Fetch all user docs in one go
      const userIdArr = Array.from(userIdsSet);
      const userDocs = await Promise.all(
        userIdArr.map((uid) => getDoc(doc(db, "users", uid)))
      );
      const userMap: Record<string, { firstname: string; lastname: string }> =
        {};
      userDocs.forEach((userDoc, idx) => {
        if (userDoc.exists()) {
          const d = userDoc.data();
          userMap[userIdArr[idx]] = {
            firstname: d.firstname || "",
            lastname: d.lastname || "",
          };
        }
      });

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reports.push({
          id: docSnap.id,
          reporterId: data.reporterId,
          reporterName: userMap[data.reporterId]
            ? `${userMap[data.reporterId].firstname} ${
                userMap[data.reporterId].lastname
              }`
            : "Unknown",
          reportedUserId: data.reportedUserId,
          reportedUserName: userMap[data.reportedUserId]
            ? `${userMap[data.reportedUserId].firstname} ${
                userMap[data.reportedUserId].lastname
              }`
            : "Unknown",
          reason: data.reason,
          description: data.description,
          category: data.category,
          status: data.status,
          createdAt: data.createdAt,
          evidence: data.evidence,
          adminNotes: data.adminNotes,
          actionTaken: data.actionTaken,
        });
      });

      setUserReports(reports);
      if (userId) {
        setSelectedUserReports(reports);
      }
    } catch (error) {
      console.error("Error fetching user reports:", error);
    }
  }, []);

  // Enhanced fetch users function
  const fetchUsers = useCallback(async () => {
    try {
      setRefreshing(true);
      const q = query(collection(db, "users"), where("role", "==", "user"));
      const querySnapshot = await getDocs(q);
      const userList: UserData[] = [];
      const datesMap: { [key: string]: SubscriptionDates } = {};

      for (const userDoc of querySnapshot.docs) {
        try {
          const data = userDoc.data();
          const currentPlan = {
            planType:
              data.currentPlan?.planType?.charAt(0).toUpperCase() +
                data.currentPlan?.planType?.slice(1).toLowerCase() || "Free",
            status: data.currentPlan?.status || "Inactive",
            subscriptionId: data.currentPlan?.subscriptionId || "",
          };

          if (currentPlan.subscriptionId) {
            try {
              const subscriptionDoc = await getDoc(
                doc(db, "subscription", currentPlan.subscriptionId)
              );

              if (subscriptionDoc.exists()) {
                const subData = subscriptionDoc.data();
                const startDate = isValidTimestamp(subData.startDate)
                  ? subData.startDate
                  : new Timestamp(
                      new Date(subData.startDate).getTime() / 1000,
                      0
                    );
                const endDate = isValidTimestamp(subData.endDate)
                  ? subData.endDate
                  : new Timestamp(
                      new Date(subData.endDate).getTime() / 1000,
                      0
                    );

                datesMap[currentPlan.subscriptionId] = { startDate, endDate };
                currentPlan.status =
                  endDate.toDate() > new Date() ? "Active" : "Expired";
              }
            } catch (subError) {
              console.error("Error fetching subscription:", subError);
            }
          }

          userList.push({
            uid: userDoc.id,
            email: data.email || "",
            firstname: data.firstname || "",
            lastname: data.lastname || "",
            middlename: data.middlename,
            birthday: data.birthday,
            contactNumber: data.contactNumber,
            location: data.location || {
              address: "No address provided",
            },
            role: data.role || "user",
            currentPlan: currentPlan as any,
            profileImage: data.profileImage || "/profile.png",
            rate: data.rate || 0,
            createdAt: data.createdAt || "",
            lastActive: data.lastActive,
            isVerified: data.isVerified || false,
            accountStatus: data.accountStatus || "Active",
            totalSpent: data.totalSpent || 0,
            loginCount: data.loginCount || 0,
            idVerified: data.idVerified || { idImage: "", idType: "" },
            sex: data.sex || "",
          });
        } catch (userError) {
          console.error("Error processing user:", userError);
        }
      }

      // Calculate enhanced stats
      const stats: UserStats = {
        total: userList.length,
        active: userList.filter((u) => u.currentPlan.status === "Active")
          .length,
        premium: userList.filter((u) => u.currentPlan.planType === "Premium")
          .length,
        basic: userList.filter((u) => u.currentPlan.planType === "Basic")
          .length,
        free: userList.filter((u) => u.currentPlan.planType === "Free").length,
        verified: userList.filter(
          (u) => u.isVerified || u.currentPlan.status === "Active"
        ).length,
        suspended: userList.filter((u) => u.accountStatus === "Suspended")
          .length,
      };

      setUsers(userList);
      setSubscriptionDates(datesMap);
      setUserStats(stats);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch user items
  const fetchUserItems = async (userId: string) => {
    try {
      const itemsRef = collection(db, "items");
      const q = query(itemsRef, where("owner.id", "==", userId));
      const querySnapshot = await getDocs(q);

      const items: UserItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as UserItem);
      });

      setUserItems(items);
    } catch (error) {
      console.error("Error fetching user items:", error);
    }
  };

  // Handle view user
  const handleViewUser = async (user: UserData) => {
    setSelectedUser(user);
    setShowUserModal(true);
    await fetchUserItems(user.uid);
    await fetchUserReports(user.uid);
  };

  // Enhanced handleUpdateUserStatus with reason tracking
  const handleUpdateUserStatusWithReason = async (
    userId: string,
    newStatus: string,
    reason: SuspensionReason
  ) => {
    try {
      const batch = writeBatch(db);

      // Update user status
      const userRef = doc(db, "users", userId);
      batch.update(userRef, {
        accountStatus: newStatus,
        suspensionReason: newStatus === "Suspended" ? reason : null,
        suspendedAt: newStatus === "Suspended" ? Timestamp.now() : null,
        suspendedUntil:
          newStatus === "Suspended" && reason.duration
            ? Timestamp.fromDate(
                new Date(Date.now() + reason.duration * 24 * 60 * 60 * 1000)
              )
            : null,
      });

      // If suspending based on a report, update the report status
      if (reason.reportId && newStatus === "Suspended") {
        const reportRef = doc(db, "reports", reason.reportId);
        batch.update(reportRef, {
          status: "resolved",
          actionTaken: reason.duration
            ? "temporary_suspension"
            : "permanent_suspension",
          adminNotes: reason.description,
          resolvedAt: Timestamp.now(),
          resolvedBy: reason.adminId,
        });
      }

      // Create suspension log entry
      if (newStatus === "Suspended") {
        const suspensionLogRef = doc(collection(db, "suspensionLogs"));
        batch.set(suspensionLogRef, {
          userId,
          reason,
          suspendedAt: Timestamp.now(),
          suspendedBy: reason.adminId,
          status: "active",
        });
      }

      await batch.commit();
      await fetchUsers();
      setShowSuspensionModal(false);
      setShowUserModal(false);
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  // Memoized filtered and sorted users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      const searchString =
        `${user.firstname} ${user.lastname} ${user.email} ${user.uid}`.toLowerCase();
      const matchesSearch = searchString.includes(searchTerm.toLowerCase());

      const matchesStatus =
        filters.status === "all" || user.currentPlan.status === filters.status;
      const matchesPlan =
        filters.plan === "all" || user.currentPlan.planType === filters.plan;
      const matchesVerification =
        filters.verification === "all" ||
        (filters.verification === "verified" &&
          (user.isVerified || user.currentPlan.status === "Active")) ||
        (filters.verification === "pending" &&
          !user.isVerified &&
          user.currentPlan.status !== "Active");
      const matchesAccountStatus =
        filters.accountStatus === "all" ||
        user.accountStatus === filters.accountStatus;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPlan &&
        matchesVerification &&
        matchesAccountStatus
      );
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any = "";
        let bValue: any = "";

        switch (sortConfig.key) {
          case "name":
            aValue = `${a.firstname} ${a.lastname}`.toLowerCase();
            bValue = `${b.firstname} ${b.lastname}`.toLowerCase();
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
          case "rate":
            aValue = a.rate;
            bValue = b.rate;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [users, searchTerm, filters, sortConfig, subscriptionDates]);

  // Pagination calculations
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredAndSortedUsers.slice(
    indexOfFirstUser,
    indexOfLastUser
  );
  const totalPages = Math.ceil(filteredAndSortedUsers.length / usersPerPage);

  // Event handlers
  const handleSort = (column: SortConfig["key"]) => {
    setSortConfig((prev) => ({
      key: column,
      direction:
        prev.key === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === currentUsers.length) {
      setSelectedUsers(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedUsers(new Set(currentUsers.map((user) => user.uid)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.size === 0) return;

    try {
      const batch = writeBatch(db);
      const selectedUserIds = Array.from(selectedUsers);

      switch (action) {
        case "activate":
          selectedUserIds.forEach((userId) => {
            batch.update(doc(db, "users", userId), { accountStatus: "Active" });
          });
          break;
        case "suspend":
          selectedUserIds.forEach((userId) => {
            batch.update(doc(db, "users", userId), {
              accountStatus: "Suspended",
            });
          });
          break;
        case "verify":
          selectedUserIds.forEach((userId) => {
            batch.update(doc(db, "users", userId), { isVerified: true });
          });
          break;
      }

      await batch.commit();
      await fetchUsers();
      setSelectedUsers(new Set());
      setShowBulkActions(false);
    } catch (error) {
      console.error("Error performing bulk action:", error);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        accountStatus: newStatus,
      });
      await fetchUsers();
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Plan Type",
      "Status",
      "Account Status",
      "Verification",
      "Join Date",
      "Contact Number",
      "Location",
      "Rating",
      "Total Spent",
      "Login Count",
    ];

    const csvData = filteredAndSortedUsers.map((user) => [
      `${user.firstname} ${user.lastname}`,
      user.email,
      user.currentPlan.planType,
      user.currentPlan.status,
      user.accountStatus || "Active",
      user.isVerified || user.currentPlan.status === "Active"
        ? "Verified"
        : "Pending",
      formatDate(user.createdAt),
      user.contactNumber || "N/A",
      user.location.address,
      user.rate,
      user.totalSpent || 0,
      user.loginCount || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Effects
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Components
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {[
        {
          label: "Total Users",
          value: userStats.total,
          icon: FiUsers,
          color: "blue",
        },
        {
          label: "Active",
          value: userStats.active,
          icon: FiUserCheck,
          color: "green",
        },
        {
          label: "Premium",
          value: userStats.premium,
          icon: FiTrendingUp,
          color: "purple",
        },
        { label: "Basic", value: userStats.basic, icon: FiStar, color: "blue" },
        { label: "Free", value: userStats.free, icon: FiUserX, color: "gray" },
        {
          label: "Suspended",
          value: userStats.suspended,
          icon: FiUserX,
          color: "red",
        },
      ].map((stat, index) => (
        <div
          key={index}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p
                className={`text-2xl font-bold ${getStatColorClass(
                  stat.color
                )}`}
              >
                {stat.value}
              </p>
            </div>
            <stat.icon
              className={`w-8 h-8 ${getStatIconColorClass(stat.color)}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
  // Rental-specific violation categories and suspension system
  const RENTAL_VIOLATION_CATEGORIES = {
    item_damage: {
      name: "Item Damage/Destruction",
      description: "Intentional or negligent damage to rental items",
      severityLevels: {
        low: {
          description: "Minor damage that doesn't affect item functionality",
          suspensionDays: 3,
          examples: ["Small scratches", "Minor wear beyond normal use"],
        },
        medium: {
          description: "Moderate damage requiring repair or replacement",
          suspensionDays: 14,
          examples: [
            "Broken parts",
            "Significant cosmetic damage",
            "Missing accessories",
          ],
        },
        high: {
          description: "Severe damage making item unusable",
          suspensionDays: 30,
          examples: [
            "Complete destruction",
            "Intentional vandalism",
            "Irreparable damage",
          ],
        },
        critical: {
          description: "Malicious destruction or theft of rental items",
          suspensionDays: "permanent",
          examples: ["Theft", "Arson", "Malicious destruction with intent"],
        },
      },
    },
    payment_fraud: {
      name: "Payment/Billing Fraud",
      description: "Fraudulent payment activities or billing disputes",
      severityLevels: {
        low: {
          description: "Minor payment irregularities or disputes",
          suspensionDays: 7,
          examples: ["Late payment", "Disputed charges", "Insufficient funds"],
        },
        medium: {
          description: "Fraudulent payment methods or chargebacks",
          suspensionDays: 21,
          examples: [
            "Using stolen cards",
            "False chargeback claims",
            "Payment reversals",
          ],
        },
        high: {
          description:
            "Systematic payment fraud affecting multiple transactions",
          suspensionDays: 60,
          examples: [
            "Multiple fraudulent transactions",
            "Identity theft for payments",
          ],
        },
        critical: {
          description: "Criminal payment fraud or money laundering",
          suspensionDays: "permanent",
          examples: [
            "Criminal financial activity",
            "Money laundering",
            "Large-scale fraud",
          ],
        },
      },
    },
    item_misrepresentation: {
      name: "Item Misrepresentation",
      description: "False or misleading information about rental items",
      severityLevels: {
        low: {
          description: "Minor inaccuracies in item description",
          suspensionDays: 1,
          examples: ["Slightly inaccurate condition", "Minor detail omissions"],
        },
        medium: {
          description:
            "Significant misrepresentation of item condition or features",
          suspensionDays: 10,
          examples: [
            "Hidden damage",
            "False specifications",
            "Misleading photos",
          ],
        },
        high: {
          description:
            "Deliberate deception about item safety or functionality",
          suspensionDays: 30,
          examples: [
            "Safety hazards not disclosed",
            "Non-functional items",
            "Fake brands",
          ],
        },
        critical: {
          description: "Dangerous items or illegal goods listed as rentals",
          suspensionDays: "permanent",
          examples: ["Illegal weapons", "Stolen goods", "Hazardous materials"],
        },
      },
    },
    rental_abuse: {
      name: "Rental Process Abuse",
      description: "Misuse of the rental system or platform features",
      severityLevels: {
        low: {
          description: "Minor violations of rental terms",
          suspensionDays: 2,
          examples: [
            "Late returns",
            "Minor rule violations",
            "Communication issues",
          ],
        },
        medium: {
          description: "Systematic abuse of rental terms or no-shows",
          suspensionDays: 14,
          examples: [
            "Repeated no-shows",
            "Subletting without permission",
            "Violating usage terms",
          ],
        },
        high: {
          description:
            "Severe abuse affecting other users or platform integrity",
          suspensionDays: 45,
          examples: [
            "Using items for illegal activities",
            "Repeated violations",
            "Platform manipulation",
          ],
        },
        critical: {
          description: "Criminal use of rental items or platform exploitation",
          suspensionDays: "permanent",
          examples: [
            "Using items in crimes",
            "Platform hacking",
            "Systematic exploitation",
          ],
        },
      },
    },
    safety_violations: {
      name: "Safety Violations",
      description: "Actions that compromise user or public safety",
      severityLevels: {
        low: {
          description: "Minor safety oversights or negligence",
          suspensionDays: 5,
          examples: [
            "Not following safety guidelines",
            "Minor safety oversights",
          ],
        },
        medium: {
          description: "Reckless behavior that could cause harm",
          suspensionDays: 21,
          examples: [
            "Unsafe item modifications",
            "Ignoring safety warnings",
            "Reckless usage",
          ],
        },
        high: {
          description: "Dangerous behavior that endangers others",
          suspensionDays: 60,
          examples: [
            "Public endangerment",
            "Serious safety violations",
            "Causing accidents",
          ],
        },
        critical: {
          description:
            "Actions that cause serious injury or pose extreme danger",
          suspensionDays: "permanent",
          examples: [
            "Causing serious injuries",
            "Extreme public endangerment",
            "Terrorist activities",
          ],
        },
      },
    },
    harassment_rental: {
      name: "Harassment in Rental Context",
      description: "Harassment of renters, owners, or other platform users",
      severityLevels: {
        low: {
          description: "Minor inappropriate communication or behavior",
          suspensionDays: 3,
          examples: [
            "Rude messages",
            "Minor disrespect",
            "Unprofessional communication",
          ],
        },
        medium: {
          description: "Persistent harassment or inappropriate advances",
          suspensionDays: 14,
          examples: [
            "Sexual harassment",
            "Stalking behavior",
            "Persistent unwanted contact",
          ],
        },
        high: {
          description: "Severe harassment affecting user safety or wellbeing",
          suspensionDays: 45,
          examples: ["Threats of violence", "Doxxing", "Severe intimidation"],
        },
        critical: {
          description:
            "Criminal harassment or actions posing serious safety threats",
          suspensionDays: "permanent",
          examples: [
            "Physical violence",
            "Credible death threats",
            "Criminal stalking",
          ],
        },
      },
    },
    fake_listings: {
      name: "Fake/Scam Listings",
      description: "Creating fraudulent or non-existent rental listings",
      severityLevels: {
        low: {
          description: "Accidentally inactive or outdated listings",
          suspensionDays: 1,
          examples: [
            "Forgetting to remove unavailable items",
            "Outdated availability",
          ],
        },
        medium: {
          description: "Deliberately fake listings to attract users",
          suspensionDays: 21,
          examples: [
            "Bait and switch",
            "Items that don't exist",
            "False availability",
          ],
        },
        high: {
          description: "Systematic fake listing operation",
          suspensionDays: 60,
          examples: [
            "Multiple fake accounts",
            "Large-scale scam operation",
            "Identity theft",
          ],
        },
        critical: {
          description: "Criminal fraud operation using fake listings",
          suspensionDays: "permanent",
          examples: [
            "Money laundering",
            "Criminal fraud network",
            "Organized crime",
          ],
        },
      },
    },
    review_manipulation: {
      name: "Review/Rating Manipulation",
      description: "Fake reviews or rating system abuse",
      severityLevels: {
        low: {
          description: "Minor review violations or inappropriate feedback",
          suspensionDays: 2,
          examples: ["Irrelevant reviews", "Minor review guideline violations"],
        },
        medium: {
          description: "Fake reviews or coordinated rating manipulation",
          suspensionDays: 14,
          examples: [
            "Fake positive/negative reviews",
            "Review trading",
            "Sock puppet accounts",
          ],
        },
        high: {
          description: "Systematic review fraud affecting platform integrity",
          suspensionDays: 30,
          examples: [
            "Review farm operations",
            "Large-scale manipulation",
            "Competitor sabotage",
          ],
        },
        critical: {
          description:
            "Criminal defamation or systematic platform manipulation",
          suspensionDays: "permanent",
          examples: [
            "Criminal defamation",
            "Platform-wide manipulation",
            "Extortion via reviews",
          ],
        },
      },
    },
  };

  // Function to determine suspension duration based on user's report history
  const calculateSuspensionDuration = (
    category: string,
    severity: string,
    userReports: UserReport[],
    baseTemplate: any
  ): number | "permanent" => {
    const baseDuration =
      baseTemplate.severityLevels[severity]?.suspensionDays || 1;

    if (baseDuration === "permanent") {
      return "permanent";
    }

    // Count previous violations by category
    const categoryViolations = userReports.filter(
      (report) => report.category === category && report.status === "resolved"
    ).length;

    // Count total resolved reports
    const totalViolations = userReports.filter(
      (report) => report.status === "resolved"
    ).length;

    // Escalation multipliers
    let multiplier = 1;

    // Category-specific escalation
    if (categoryViolations >= 3) {
      return "permanent"; // 3+ violations in same category = permanent
    } else if (categoryViolations === 2) {
      multiplier *= 3; // 3x duration for second offense
    } else if (categoryViolations === 1) {
      multiplier *= 2; // 2x duration for repeat offense
    }

    // Total violations escalation
    if (totalViolations >= 5) {
      return "permanent"; // 5+ total violations = permanent
    } else if (totalViolations >= 3) {
      multiplier *= 1.5; // 1.5x for multiple different violations
    }

    return Math.min(365, Math.floor(baseDuration * multiplier)); // Cap at 1 year
  };

  // Enhanced template generation function
  const generateSuspensionTemplate = (
    category: string,
    severity: string,
    userReports: UserReport[],
    reportCount: number = 0
  ): string => {
    const template =
      RENTAL_VIOLATION_CATEGORIES[
        category as keyof typeof RENTAL_VIOLATION_CATEGORIES
      ];

    if (!template) {
      return "User violated platform terms and conditions.";
    }

    const severityInfo =
      template.severityLevels[severity as keyof typeof template.severityLevels];

    if (!severityInfo) {
      return `User committed ${template.name.toLowerCase()} violation.`;
    }

    const isRepeatOffender = reportCount > 0;
    const duration = calculateSuspensionDuration(
      category,
      severity,
      userReports,
      template
    );

    let baseMessage = severityInfo.description;

    // Add context for repeat offenders
    if (isRepeatOffender) {
      baseMessage += ` This is a repeat violation (${
        reportCount + 1
      } total reports).`;
    }

    // Add duration context
    if (duration === "permanent") {
      baseMessage +=
        " Due to the severity and/or repeat nature of this violation, account access is permanently revoked.";
    } else if (typeof duration === "number" && duration > 0) {
      baseMessage += ` Account suspended for ${duration} day${
        duration > 1 ? "s" : ""
      } to ensure platform safety and integrity.`;
    }

    baseMessage +=
      " User may appeal this decision through official support channels.";

    return baseMessage;
  };

  // Updated SUSPENSION_REASON_TEMPLATES for rental context
  const RENTAL_SUSPENSION_TEMPLATES = {
    item_damage: {
      low: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "item_damage",
          "low",
          reports,
          reports.length
        ),
      medium: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "item_damage",
          "medium",
          reports,
          reports.length
        ),
      high: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "item_damage",
          "high",
          reports,
          reports.length
        ),
      critical: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "item_damage",
          "critical",
          reports,
          reports.length
        ),
    },
    payment_fraud: {
      low: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "payment_fraud",
          "low",
          reports,
          reports.length
        ),
      medium: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "payment_fraud",
          "medium",
          reports,
          reports.length
        ),
      high: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "payment_fraud",
          "high",
          reports,
          reports.length
        ),
      critical: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "payment_fraud",
          "critical",
          reports,
          reports.length
        ),
    },
    item_misrepresentation: {
      low: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "item_misrepresentation",
          "low",
          reports,
          reports.length
        ),
      medium: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "item_misrepresentation",
          "medium",
          reports,
          reports.length
        ),
      high: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "item_misrepresentation",
          "high",
          reports,
          reports.length
        ),
      critical: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "item_misrepresentation",
          "critical",
          reports,
          reports.length
        ),
    },
    rental_abuse: {
      low: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "rental_abuse",
          "low",
          reports,
          reports.length
        ),
      medium: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "rental_abuse",
          "medium",
          reports,
          reports.length
        ),
      high: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "rental_abuse",
          "high",
          reports,
          reports.length
        ),
      critical: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "rental_abuse",
          "critical",
          reports,
          reports.length
        ),
    },
    safety_violations: {
      low: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "safety_violations",
          "low",
          reports,
          reports.length
        ),
      medium: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "safety_violations",
          "medium",
          reports,
          reports.length
        ),
      high: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "safety_violations",
          "high",
          reports,
          reports.length
        ),
      critical: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "safety_violations",
          "critical",
          reports,
          reports.length
        ),
    },
    harassment_rental: {
      low: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "harassment_rental",
          "low",
          reports,
          reports.length
        ),
      medium: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "harassment_rental",
          "medium",
          reports,
          reports.length
        ),
      high: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "harassment_rental",
          "high",
          reports,
          reports.length
        ),
      critical: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "harassment_rental",
          "critical",
          reports,
          reports.length
        ),
    },
    fake_listings: {
      low: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "fake_listings",
          "low",
          reports,
          reports.length
        ),
      medium: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "fake_listings",
          "medium",
          reports,
          reports.length
        ),
      high: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "fake_listings",
          "high",
          reports,
          reports.length
        ),
      critical: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "fake_listings",
          "critical",
          reports,
          reports.length
        ),
    },
    review_manipulation: {
      low: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "review_manipulation",
          "low",
          reports,
          reports.length
        ),
      medium: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "review_manipulation",
          "medium",
          reports,
          reports.length
        ),
      high: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "review_manipulation",
          "high",
          reports,
          reports.length
        ),
      critical: (reports: UserReport[]) =>
        generateSuspensionTemplate(
          "review_manipulation",
          "critical",
          reports,
          reports.length
        ),
    },
  };

  // Enhanced Suspension Modal with rental-specific violations
  const EnhancedSuspensionModal = () => {
    const [customReason, setCustomReason] = useState("");
    const [useTemplate, setUseTemplate] = useState(true);

    if (!showSuspensionModal) return null;

    const handleReasonChange = (category: string, severity: string) => {
      if (useTemplate && category && severity) {
        const templateFunc =
          RENTAL_SUSPENSION_TEMPLATES[
            category as keyof typeof RENTAL_SUSPENSION_TEMPLATES
          ]?.[severity as keyof typeof RENTAL_SUSPENSION_TEMPLATES.item_damage];
        if (templateFunc) {
          const generatedReason = templateFunc(selectedUserReports);
          setSuspensionReason((prev) => ({
            ...prev,
            description: generatedReason,
          }));
        }
      }
    };

    const handleCategoryChange = (category: string) => {
      setSuspensionReason((prev) => ({
        ...prev,
        category,
      }));
      if (useTemplate && category && suspensionReason.severity) {
        handleReasonChange(category, suspensionReason.severity);
      }
    };

    const handleSeverityChange = (severity: string) => {
      const newSeverity = severity as "low" | "medium" | "high" | "critical";

      // Calculate automatic duration based on violation and user history
      let autoDuration: number | undefined;
      if (suspensionReason.category && newSeverity !== "critical") {
        const calculatedDuration = calculateSuspensionDuration(
          suspensionReason.category,
          severity,
          selectedUserReports,
          RENTAL_VIOLATION_CATEGORIES[
            suspensionReason.category as keyof typeof RENTAL_VIOLATION_CATEGORIES
          ]
        );
        autoDuration =
          calculatedDuration === "permanent" ? undefined : calculatedDuration;
      }

      setSuspensionReason((prev) => ({
        ...prev,
        severity: newSeverity,
        duration: newSeverity === "critical" ? undefined : autoDuration,
      }));

      if (useTemplate && suspensionReason.category && severity) {
        handleReasonChange(suspensionReason.category, severity);
      }
    };

    const handleCustomReasonChange = (value: string) => {
      setCustomReason(value);
      setSuspensionReason((prev) => ({
        ...prev,
        description: value,
      }));
    };

    const currentViolationInfo = suspensionReason.category
      ? RENTAL_VIOLATION_CATEGORIES[
          suspensionReason.category as keyof typeof RENTAL_VIOLATION_CATEGORIES
        ]
      : null;

    const currentSeverityInfo =
      currentViolationInfo && suspensionReason.severity
        ? currentViolationInfo.severityLevels[
            suspensionReason.severity as keyof typeof currentViolationInfo.severityLevels
          ]
        : null;

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSuspensionModal(false);
          }
        }}
      >
        <div
          className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Suspend User Account
            </h3>
            <button
              onClick={() => setShowSuspensionModal(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* User Report Summary */}
          {selectedUserReports.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800">
                User has {selectedUserReports.length} existing report(s)
              </p>
              <p className="text-xs text-yellow-700">
                This will affect the suspension duration calculation
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Violation Category
              </label>
              <select
                value={suspensionReason.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                required
              >
                <option value="">Select violation category</option>
                {Object.entries(RENTAL_VIOLATION_CATEGORIES).map(
                  ([key, category]) => (
                    <option key={key} value={key}>
                      {category.name}
                    </option>
                  )
                )}
              </select>
              {currentViolationInfo && (
                <p className="text-xs text-gray-600 mt-1">
                  {currentViolationInfo.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity Level
              </label>
              <select
                value={suspensionReason.severity}
                onChange={(e) => handleSeverityChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="low">Low - Warning/Short Suspension</option>
                <option value="medium">Medium - Temporary Suspension</option>
                <option value="high">High - Extended Suspension</option>
                <option value="critical">
                  Critical - Permanent Suspension
                </option>
              </select>
              {currentSeverityInfo && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <p className="font-medium text-gray-700">
                    Recommended Duration:{" "}
                    {currentSeverityInfo.suspensionDays === "permanent"
                      ? "Permanent"
                      : `${calculateSuspensionDuration(
                          suspensionReason.category,
                          suspensionReason.severity,
                          selectedUserReports,
                          currentViolationInfo
                        )} days`}
                  </p>
                  <p className="text-gray-600 mt-1">
                    Examples: {currentSeverityInfo.examples.join(", ")}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suspension Duration (Days)
              </label>
              <select
                value={suspensionReason.duration || ""}
                onChange={(e) =>
                  setSuspensionReason((prev) => ({
                    ...prev,
                    duration: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  }))
                }
                className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={suspensionReason.severity === "critical"}
              >
                <option value="">Permanent</option>
                <option value="1">1 Day</option>
                <option value="3">3 Days</option>
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="21">21 Days</option>
                <option value="30">30 Days</option>
                <option value="45">45 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
              </select>
              {suspensionReason.severity === "critical" && (
                <p className="text-xs text-red-600 mt-1">
                  Critical violations result in permanent suspension
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Suspension Reason
                </label>
                <div className="flex items-center space-x-2">
                  <label className="flex items-center text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={useTemplate}
                      onChange={(e) => {
                        setUseTemplate(e.target.checked);
                        if (
                          e.target.checked &&
                          suspensionReason.category &&
                          suspensionReason.severity
                        ) {
                          handleReasonChange(
                            suspensionReason.category,
                            suspensionReason.severity
                          );
                        } else if (!e.target.checked) {
                          setSuspensionReason((prev) => ({
                            ...prev,
                            description: customReason,
                          }));
                        }
                      }}
                      className="rounded border-gray-300 mr-1"
                    />
                    Auto-generate
                  </label>
                </div>
              </div>

              {useTemplate ? (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {suspensionReason.description ||
                      "Select category and severity to generate suspension reason"}
                  </p>
                  {suspensionReason.description && (
                    <button
                      type="button"
                      onClick={() => {
                        setUseTemplate(false);
                        setCustomReason(suspensionReason.description);
                      }}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Edit this message
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    value={customReason}
                    onChange={(e) => handleCustomReasonChange(e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    rows={5}
                    placeholder="Type your custom reason for suspension..."
                    required
                    maxLength={1000}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {customReason.length}/1000 characters
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setUseTemplate(true);
                        if (
                          suspensionReason.category &&
                          suspensionReason.severity
                        ) {
                          handleReasonChange(
                            suspensionReason.category,
                            suspensionReason.severity
                          );
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Use auto-generated template
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedUserReports.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Related Report (Optional)
                </label>
                <select
                  value={suspensionReason.reportId || ""}
                  onChange={(e) =>
                    setSuspensionReason((prev) => ({
                      ...prev,
                      reportId: e.target.value || undefined,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Not related to a specific report</option>
                  {selectedUserReports.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.reason} - {formatDate(report.createdAt)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => {
                setShowSuspensionModal(false);
                setSuspensionReason({
                  category: "",
                  description: "",
                  severity: "medium",
                  adminId: "",
                  createdAt: null,
                });
                setCustomReason("");
                setUseTemplate(true);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (
                  !suspensionReason.category ||
                  !suspensionReason.description.trim()
                ) {
                  alert("Please fill in all required fields");
                  return;
                }

                if (suspensionReason.description.length > 1000) {
                  alert("Reason must be 1000 characters or less");
                  return;
                }

                // Auto-calculate duration if not manually set
                let finalDuration = suspensionReason.duration;
                if (
                  !finalDuration &&
                  suspensionReason.severity !== "critical" &&
                  suspensionReason.category
                ) {
                  const calculated = calculateSuspensionDuration(
                    suspensionReason.category,
                    suspensionReason.severity,
                    selectedUserReports,
                    RENTAL_VIOLATION_CATEGORIES[
                      suspensionReason.category as keyof typeof RENTAL_VIOLATION_CATEGORIES
                    ]
                  );
                  finalDuration =
                    calculated === "permanent" ? undefined : calculated;
                }

                setPendingSuspendReason({
                  ...suspensionReason,
                  duration: finalDuration,
                  adminId: auth.currentUser?.uid || "",
                  createdAt: Timestamp.now(),
                });
                setShowSuspendConfirm(true);
              }}
              disabled={
                !suspensionReason.category ||
                !suspensionReason.description.trim()
              }
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suspend User
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Confirmation Modal Component
  const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    confirmAction,
    showConfirmModal,
    setShowConfirmModal,
    setShowUserModal,
    handleUpdateUserStatus,
  }) => {
    if (!confirmAction) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {confirmAction.type === "suspend"
              ? "Suspend User"
              : "Activate User"}
          </h3>
          <p className="text-gray-600 mb-6">
            {confirmAction.type === "suspend"
              ? "Are you sure you want to suspend this user? They will not be able to access their account."
              : "Are you sure you want to activate this user? They will regain access to their account."}
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await handleUpdateUserStatus(
                  confirmAction.userId,
                  confirmAction.type === "suspend" ? "Suspended" : "Active"
                );
                setShowConfirmModal(false);
                setShowUserModal(false);
              }}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${
                confirmAction.type === "suspend"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              Yes, {confirmAction.type === "suspend" ? "Suspend" : "Activate"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Pagination = () => {
    const maxVisiblePages = 5;
    const startPage = Math.max(
      1,
      currentPage - Math.floor(maxVisiblePages / 2)
    );
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{indexOfFirstUser + 1}</span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(indexOfLastUser, filteredAndSortedUsers.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium">{filteredAndSortedUsers.length}</span>{" "}
            users
          </p>
          <select
            value={usersPerPage}
            onChange={(e) => {
              setUsersPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {USERS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} per page
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          {[...Array(endPage - startPage + 1)].map((_, idx) => {
            const pageNumber = startPage + idx;
            return (
              <button
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentPage === pageNumber
                    ? "bg-blue-50 border border-blue-500 text-blue-600"
                    : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  const badgeStyles = {
    base: "inline-block px-3 py-1 rounded-full font-medium border text-xs",
  };

  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <img
                  src={user.profileImage}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {user.firstname} {user.lastname}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">{user.email}</p>
                  <p className="text-xs text-gray-500">ID: {user.uid}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span
                    className={`${getPlanColorClass(
                      user.currentPlan.planType
                    )} ${badgeStyles.base} text-xs`}
                  >
                    {user.currentPlan.planType}
                  </span>
                  <span
                    className={`${
                      isExpired
                        ? "bg-red-100 text-red-700"
                        : user.currentPlan.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-800"
                    } ${badgeStyles.base} text-xs`}
                  >
                    {isExpired ? "Expired" : user.currentPlan.status}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <div className="flex items-center space-x-2 mb-1">
                    <FiPhone className="w-4 h-4" />
                    <span>{user.contactNumber || "Not provided"}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiCalendar className="w-4 h-4" />
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-1">
                    <FiStar className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">{user.rate}</span>
                  </div>
                  <button
                    onClick={() => handleViewUser(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const columnHeaders: { label: string; key?: string }[] = [
    { label: "User", key: "name" },
    { label: "Email/Location", key: "email" },
    { label: "Plan", key: "plan" },
    { label: "Account Status", key: undefined },
    { label: "Subscription", key: "date" },
    { label: "Joined", key: undefined },
    { label: "Rating", key: undefined },
    { label: "Actions", key: undefined },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Enhanced Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-0"
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
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
                  Manage Users
                </h1>
                <p className="text-gray-600 mt-1">
                  View, Filter and Manage all Registered Users
                </p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  className="pl-12 pr-4 py-3 w-full bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                  placeholder="Search by name, email, ID, or plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div
              className="flex items-center space-x-2 relative"
              ref={filterRef}
            >
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <FiFilter className="mr-2" />
                Filters
                {Object.values(filters).some((value) => value !== "all") && (
                  <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
              </button>
              {filterOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900">
                        Filter Users
                      </h3>
                      <button
                        onClick={() => setFilterOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subscription Status
                        </label>
                        <select
                          value={filters.status}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              status: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Status</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Expired">Expired</option>
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
                          className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Plans</option>
                          <option value="Free">Free</option>
                          <option value="Basic">Basic</option>
                          <option value="Premium">Premium</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Verification Status
                        </label>
                        <select
                          value={filters.verification}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              verification: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Users</option>
                          <option value="verified">Verified Only</option>
                          <option value="pending">Pending Only</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Status
                        </label>
                        <select
                          value={filters.accountStatus}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              accountStatus: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="all">All Accounts</option>
                          <option value="Active">Active</option>
                          <option value="Suspended">Suspended</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setFilters({
                              status: "all",
                              plan: "all",
                              verification: "all",
                              accountStatus: "all",
                            });
                          }}
                          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={() => setFilterOpen(false)}
                          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Apply Filters
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Stats Cards */}
      <StatsCards />
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 bg-white rounded-lg shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      ) : (
        <>
          {/* View Toggle and Export */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FiList className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FiGrid className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchUsers}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <FiRefreshCw
                  className={`mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FiDownload className="mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Content based on view mode */}
          {viewMode === "table" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={
                            selectedUsers.size === currentUsers.length &&
                            currentUsers.length > 0
                          }
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      {columnHeaders.map((header) => (
                        <th
                          key={header.label}
                          onClick={() =>
                            header.key &&
                            handleSort(header.key as SortConfig["key"])
                          }
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                            header.key ? "cursor-pointer hover:bg-gray-100" : ""
                          } transition-colors`}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{header.label}</span>
                            {header.key && sortConfig.key === header.key && (
                              <FiChevronDown
                                className={`w-4 h-4 transition-transform ${
                                  sortConfig.direction === "desc"
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentUsers.map((user) => {
                      const subDates = user.currentPlan.subscriptionId
                        ? subscriptionDates[user.currentPlan.subscriptionId]
                        : null;
                      const isExpired = subDates?.endDate
                        ? subDates.endDate.toDate() < new Date()
                        : false;

                      return (
                        <tr
                          key={user.uid}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.uid)}
                              onChange={() => handleSelectUser(user.uid)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img
                                src={getProfileImage(user.profileImage)}
                                onError={handleImageError}
                                alt={`${user.firstname} ${user.lastname}`}
                                className="h-10 w-10 rounded-full mr-3 object-cover border-2 border-gray-200"
                              />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {user.firstname} {user.lastname}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {user.uid}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.contactNumber || "No phone"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.location.address.length > 30
                                ? user.location.address.substring(0, 30) + "..."
                                : user.location.address}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span
                                className={`${getPlanColorClass(
                                  user.currentPlan.planType
                                )} ${badgeStyles.base}`}
                              >
                                {user.currentPlan.planType}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span
                                className={`${
                                  user.accountStatus === "Active"
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : user.accountStatus === "Suspended"
                                    ? "bg-red-100 text-red-700 border border-red-200"
                                    : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                } ${badgeStyles.base}`}
                              >
                                {user.accountStatus || "Active"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span
                                className={`${
                                  isExpired
                                    ? "bg-red-100 text-red-700"
                                    : user.currentPlan.status === "Active"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-800"
                                } ${badgeStyles.base}`}
                              >
                                {isExpired
                                  ? "Expired"
                                  : user.currentPlan.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <FiStar className="w-4 h-4 text-yellow-500 mr-1" />
                              <span className="text-sm font-medium">
                                {user.rate}/5
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewUser(user)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-xs"
                                title="View Details"
                              >
                                View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <GridView />
          )}

          {/* Pagination */}
          <div className="mt-6">
            <Pagination />
          </div>
        </>
      )}
      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <div className="flex items-center space-x-3 bg-white shadow-lg border border-gray-200 rounded-xl px-6 py-3">
            <span className="font-medium text-gray-700">
              {selectedUsers.size} selected
            </span>
            <button
              onClick={() => handleBulkAction("activate")}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction("suspend")}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
            >
              Suspend
            </button>
            <button
              onClick={() => handleBulkAction("verify")}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
            >
              Verify
            </button>
            <button
              onClick={() => {
                setSelectedUsers(new Set());
                setShowBulkActions(false);
              }}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showUserModal && (
        <UserModal
          selectedUser={selectedUser}
          showUserModal={showUserModal}
          setShowUserModal={setShowUserModal}
          userItems={userItems}
          selectedUserReports={selectedUserReports}
          subscriptionDates={subscriptionDates}
          formatDate={formatDate}
          getProfileImage={getProfileImage}
          handleImageError={handleImageError}
          getPlanColorClass={getPlanColorClass}
          setShowSuspensionModal={setShowSuspensionModal}
          setConfirmAction={setConfirmAction}
          setShowConfirmModal={setShowConfirmModal}
          setSuspensionReason={setSuspensionReason}
          setShowReportsModal={setShowReportsModal}
        />
      )}
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmationModal
          confirmAction={confirmAction}
          showConfirmModal={showConfirmModal}
          setShowConfirmModal={setShowConfirmModal}
          setShowUserModal={setShowUserModal}
          handleUpdateUserStatus={handleUpdateUserStatus}
        />
      )}
      {/* Other modals */}
      {showSuspensionModal && <EnhancedSuspensionModal />}
      {showSuspendConfirm && pendingSuspendReason && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Confirm Suspension
            </h3>
            <p className="text-gray-700 mb-4">
              `` Are you sure you want to suspend this user?
            </p>
            <div className="mb-4">
              <div>
                <span className="font-medium">Category:</span>{" "}
                {pendingSuspendReason.category}
              </div>
              <div>
                <span className="font-medium">Reason:</span>{" "}
                {pendingSuspendReason.description}
              </div>
              {pendingSuspendReason.duration && (
                <div>
                  <span className="font-medium">Duration:</span>{" "}
                  {pendingSuspendReason.duration} day(s)
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSuspendConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleUpdateUserStatusWithReason(
                    selectedUser!.uid,
                    "Suspended",
                    pendingSuspendReason
                  );
                  setShowSuspendConfirm(false);
                  setShowSuspensionModal(false);
                  setPendingSuspendReason(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Suspend
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
          <div className="flex items-center space-x-3 bg-white shadow-lg border border-gray-200 rounded-xl px-6 py-3">
            <span className="font-medium text-gray-700">
              {selectedUsers.size} selected
            </span>
            <button
              onClick={() => handleBulkAction("activate")}
              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction("suspend")}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
            >
              Suspend
            </button>
            <button
              onClick={() => handleBulkAction("verify")}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
            >
              Verify
            </button>
            <button
              onClick={() => {
                setSelectedUsers(new Set());
                setShowBulkActions(false);
              }}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ReportsModal
        show={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        reports={selectedUserReports}
        formatDate={formatDate}
      />
    </div>
  );
}
