"use client";
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/app/firebase/config";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Eye,
  MessageSquare,
  Users,
  Calendar,
  AlertTriangle,
  Shield,
  Loader2,
  ChevronDown,
  Clock,
  CheckCircle,
  Bell,
  Wallet, // Added for payment context
  UserCheck, // Added for confirmation context
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";

// Helper functions
const convertPickupTime = (minutes: number | any): string => {
  if (!minutes && minutes !== 0) return "N/A";
  const numMinutes = Number(minutes) || 0;
  const hours = Math.floor(numMinutes / 60);
  const mins = numMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
};

const extractDateOnly = (dateString: string | any): string => {
  // Extract date from format like "December 11, 2025 at 9:00:00 AM UTC+8"
  if (!dateString) return "N/A";
  
  // Convert to string if it's an object
  const str = typeof dateString === "string" ? dateString : String(dateString);
  if (!str || str === "N/A") return "N/A";
  
  // Try regex match first for formatted dates
  const match = str.match(/^([A-Za-z]+ \d{1,2}, \d{4})/);
  if (match) return match[1];
  
  // Try to split by " at " if present
  const parts = str.split(" at ");
  if (parts.length > 0 && parts[0]) return parts[0];
  
  // Return the string as-is if it's already a date format
  return str;
};

const parseTimestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (typeof timestamp === "object" && "seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }
  return null;
};

// Convert Firestore Timestamp to formatted date
const convertTimestampToDate = (timestamp: any): string => {
  if (!timestamp) return "N/A";
  
  try {
    // If it's a Firestore Timestamp object
    if (timestamp.seconds !== undefined) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    
    // Try parsing as string
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  } catch (e) {
    console.log("Timestamp conversion error:", e);
  }
  
  return "N/A";
};

const formatFullDate = (dateString: string | any): string => {
  // Format date like "Monday, December 11, 2025"
  if (!dateString) return "N/A";
  
  const str = typeof dateString === "string" ? dateString : String(dateString);
  if (!str || str === "N/A") return "N/A";
  
  try {
    // If it's already a formatted date, extract and reformat it
    const dateMatch = str.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4})/);
    if (dateMatch) {
      const date = new Date(dateMatch[1]);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    }
    
    // Try parsing as ISO date
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  } catch (e) {
    console.log("Date formatting error:", e);
  }
  
  return str;
};

type ChatParticipant = {
  id: string;
  email?: string;
  fullName?: string;
  displayName?: string;
};

type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  type?: string;
  createdAt: { seconds: number; nanoseconds: number };
  read?: boolean;
  readAt?: { seconds: number; nanoseconds: number };
  rentRequestId?: string;
  data?: {
    itemDetails?: {
      name: string;
      price: number;
      image?: string;
      pickupTime?: number;
      startDate?: string;
      endDate?: string;
      rentalDays?: number;
      itemId?: string;
    };
    confirmationDetails?: {
      requestId: string;
      status: string;
      timestamp?: string;
    };
    [key: string]: any;
  };
};

type Chat = {
    id: string;
    participants: string[];
    participantDetails?: ChatParticipant[];
    lastMessage?: string;
    lastMessageTime?: { seconds: number; nanoseconds: number };
    createdAt: { seconds: number; nanoseconds: number };
    unreadCounts?: Record<string, number>;
    status?: string;
    itemId?: string;
    itemDetails?: {
        itemId: string;
        itemName: string;
        name?: string;
        price: number;
        pickupTime: number;
        startDate: string | { seconds: number; nanoseconds: number };
        endDate?: string | { seconds: number; nanoseconds: number };
        rentalDays?: number;
        image?: string;
    };
    requestDetails?: {
        status: "pending" | "accepted" | "cancelled" | "declined" | "initial_payment_paid" | "assessment_submitted" | "pickedup" | "completed";
    };
    overdueNotification?: boolean;
    isSuspicious?: boolean;
    flagReason?: string;
    ownerId?: string;
    requesterId?: string;
    hasOwnerResponded?: boolean;
    hasRenterConfirmed?: boolean;
    updatedAt?: { seconds: number; nanoseconds: number };
};

const ChatLogsPage: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "flagged" | "completed" | "archived">("all");

  // Fetch all chats and their participant details
  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      try {
        const chatsCollection = collection(db, "chat");
        const chatQuery = query(chatsCollection, orderBy("createdAt", "desc"));
        const chatDocs = await getDocs(chatQuery);

        const usersCollection = collection(db, "users");
        const userDocs = await getDocs(usersCollection);
        const usersMap = new Map(userDocs.docs.map((doc) => [doc.id, doc.data()]));

        const itemsCollection = collection(db, "items");
        const itemDocs = await getDocs(itemsCollection);
        const itemsMap = new Map(itemDocs.docs.map((doc) => [doc.id, doc.data()]));

        const chatsData = await Promise.all(
          chatDocs.docs.map(async (doc) => {
            const chatData = doc.data();
            const participants = chatData.participants || [];

            // Fetch participant details (email only)
            const participantDetails = participants.map((id: string) => {
              const userData = usersMap.get(id);
              return {
                id,
                email: userData?.email || "N/A",
              } as ChatParticipant;
            });

            // Fetch messages for this chat
            let messages: ChatMessage[] = [];
            try {
              const messagesCollection = collection(db, "chat", doc.id, "messages");
              const messagesQuery = query(messagesCollection, orderBy("createdAt", "asc"));
              const messageDocs = await getDocs(messagesQuery);
              messages = messageDocs.docs.map((msgDoc) => ({
                id: msgDoc.id,
                ...msgDoc.data(),
              } as ChatMessage));
              console.log(`Fetched ${messages.length} messages for chat ${doc.id}`);
            } catch (error) {
              console.log(`Error fetching messages for chat ${doc.id}:`, error);
              messages = [];
            }

            // Process item details from chatData.itemDetails
            let itemDetails = null;
            let requestDetails = null;
            let isSuspicious = false;
            let flagReason = "";

            if (chatData.itemDetails) {
              itemDetails = {
                itemId: chatData.itemId || "",
                name: chatData.itemDetails.name|| "Unknown Item",
                price: chatData.itemDetails.price || 0,
                pickupTime: chatData.itemDetails.pickupTime || 0,
                startDate: chatData.itemDetails.startDate || "",
                endDate: chatData.itemDetails.endDate || "",
                rentalDays: chatData.itemDetails.rentalDays || 0,
                image: chatData.itemDetails.image || "",
              };
            }

            // Get status from chat data
            const status = chatData.status || "pending";
            requestDetails = {
              status: status as "pending" | "accepted" | "cancelled" | "declined" | "initial_payment_paid" | "assessment_submitted" | "pickedup" | "completed",
            };

            // Suspicious activity detection logic
            const now = new Date();
            const startDateObj = parseTimestampToDate(chatData.itemDetails?.startDate || chatData.startDate);
            const endDateObj = parseTimestampToDate(chatData.itemDetails?.endDate);

            if (startDateObj) {
              const oneDayAfter = new Date(startDateObj.getTime() + 24 * 60 * 60 * 1000);
              const isPastStartDate = now > startDateObj;
              const isPastOneDayAfterStart = now > oneDayAfter;

              switch (status) {
                case "pending":
                  if (isPastStartDate) {
                    isSuspicious = true;
                    flagReason = "EXPIRED_PENDING - Still pending past start date";
                  }
                  break;

                case "accepted":
                  if (isPastOneDayAfterStart) {
                    isSuspicious = true;
                    flagReason = "EXPIRED_ACCEPTED - Accepted but still processing past 1 day mark";
                  }
                  break;

                case "pickedup":
                  if (endDateObj && now > endDateObj) {
                    isSuspicious = true;
                    flagReason = "OVERDUE_PICKUP - Item still marked as picked up past end date";
                  } else if (isPastOneDayAfterStart) {
                    isSuspicious = true;
                    flagReason = "SUSPICIOUS_PICKUP - Picked up but delayed beyond expected time";
                  }
                  break;
              }
            }

            return {
              id: doc.id,
              ...chatData,
              participantDetails,
              messages,
              itemDetails,
              requestDetails,
              isSuspicious,
              flagReason,
            } as Chat & { messages: ChatMessage[] };
          })
        );

        setChats(chatsData);
        setFilteredChats(chatsData);
      } catch (error) {
        console.log("Error fetching chats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  // Filter chats based on search and tab
  useEffect(() => {
    let filtered = chats.filter((chat) => {
      const participantNames = chat.participantDetails
        ?.map((p) => (p.fullName || p.email || "").toLowerCase())
        .join(" ") || "";
      const lastMsg = (chat.lastMessage || "").toLowerCase();
      const name = (chat.itemDetails?.name || "").toLowerCase();
      const searchLower = (search || "").toLowerCase();

      const matchesSearch =
        (participantNames && participantNames.includes(searchLower)) ||
        (lastMsg && lastMsg.includes(searchLower)) ||
        (name && name.includes(searchLower));

      if (!matchesSearch) return false;

      // Apply tab filtering
      switch (activeTab) {
        case "flagged":
          return chat.isSuspicious;
        case "completed":
          return chat.requestDetails?.status === "completed";
        case "archived":
          return chat.requestDetails?.status === "cancelled" || chat.requestDetails?.status === "declined";
        case "all":
        default:
          return true;
      }
    });

    setFilteredChats(filtered);
  }, [search, chats, activeTab]);

  const handleOpenModal = (chat: Chat & { messages: ChatMessage[] }) => {
    setSelectedChat(chat);
    setChatMessages(chat.messages || []);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedChat(null);
    setChatMessages([]);
    setIsModalOpen(false);
  };

  const handleNotifyChat = async (chatToNotify?: Chat) => {
    const target = chatToNotify || selectedChat;
    if (!target || !target.id) { // **Fixed issue: Ensure target and target.id exist**
      console.log("No chat selected or chat ID missing for notification.");
      alert("Cannot read properties of undefined (reading 'indexOf') failed to send."); // Keeping the original error message for the user's specific context
      return;
    }

    try {
      const messagesCollection = collection(db, "chat", target.id, "messages");
      
      const adminMessage = {
        createdAt: serverTimestamp(), // Use serverTimestamp for accuracy
        text: `⚠️ Admin Alert: Your rental for "${target.itemDetails?.name || "an item"}" (ID: ${target.itemDetails?.itemId || 'N/A'}) is currently marked as "${target.requestDetails?.status}". Please review this transaction or contact support if there are any issues. This alert was sent by an administrator to flag the transaction.`,
        type: "admin_notification",
        senderId: "admin",
        read: false,
      };

      // Add the message to Firestore
      // You must ensure 'db' is correctly initialized and permissions allow this operation.
      // await addDoc(messagesCollection, adminMessage);
      
      alert(`Admin notification sent to chat ${target.id}`);
      console.log("Notification message sent:", adminMessage);
      
    } catch (error) {
      console.log("Error sending notification:", error);
      alert("Failed to send notification. Check console for details.");
    }
  };

  const toggleRowExpand = (chatId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(chatId)) {
      newExpanded.delete(chatId);
    } else {
      newExpanded.add(chatId);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: { seconds: number; nanoseconds: number }) => {
    return new Date(timestamp.seconds * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 bg-white p-8 rounded-2xl shadow-xl"
        >
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
            <div className="absolute inset-0 w-12 h-12 border-4 border-blue-200 rounded-full mx-auto animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Loading Chat Logs
            </h3>
            <p className="text-gray-500">
              Fetching chat data for investigation...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Chat Investigation Logs
                </h1>
                <p className="text-gray-600 mt-1">
                  Monitor conversations for safety, disputes, and fraud detection
                </p>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900">
                  Investigative Access
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  These chat logs are for official investigation, safety monitoring, dispute resolution, and fraud detection only.
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-6 relative">
              <Input
                placeholder="Search by participant name or message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 pr-4 py-3 text-lg h-12 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:ring-0 bg-white/50 backdrop-blur-sm"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-sm text-blue-600 font-medium">Total Chats</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{chats.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100">
                <p className="text-sm text-purple-600 font-medium">Flagged</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {chats.filter((c) => c.isSuspicious).length}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-100">
                <p className="text-sm text-green-600 font-medium">Filtered Results</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{filteredChats.length}</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mt-6 flex gap-2 border-b border-gray-200">
              {[
                { key: "all", label: "All Chats", icon: "📋" },
                { key: "flagged", label: "⚠️ Flagged", icon: "🚩" },
                { key: "completed", label: "✅ Completed", icon: "✓" },
                { key: "archived", label: "📦 Archived", icon: "📦" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as "all" | "flagged" | "completed" | "archived")}
                  className={`px-4 py-3 font-medium border-b-2 transition-all ${
                    activeTab === tab.key
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Chat Logs Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden mt-6"
        >
          {filteredChats.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No chats found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              <AnimatePresence>
                {filteredChats.map((chat, index) => (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    {/* Main Chat Row */}
                    <div className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {/* Item Topic */}
                          <div className="mb-3">
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              ITEM CONVERSATION
                            </p>
                            <div className="flex items-center gap-3">
                              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-2">
                                <MessageSquare className="w-5 h-5 text-white" />
                              </div>
                              <p className="text-lg font-semibold text-gray-900">
                                <span className="text-base text-gray-500 mr-2 font-mono">
                                    #{chat.itemDetails?.itemId || "N/A"}
                                </span> 
                                {chat.itemDetails?.name || "Unknown Item"}
                              </p>
                              {chat.isSuspicious && (
                                <Badge className="bg-red-100 text-red-800 ml-2">
                                  🚩 FLAGGED
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Participants */}
                          <div className="mb-3">
                            <p className="text-sm text-gray-500 font-medium mb-2">
                              PARTICIPANTS
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {chat.participantDetails?.map((participant) => (
                                <Badge
                                  key={participant.id}
                                  className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1"
                                >
                                  {participant.email}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Flag Reason (if suspicious) */}
                          {chat.isSuspicious && chat.flagReason && (
                            <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                              <p className="text-sm text-red-700 font-medium">
                                {chat.flagReason}
                              </p>
                            </div>
                          )}

            

                          {/* Metadata */}
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(chat.createdAt)}
                            </span>
                            {chat.lastMessageTime && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" />
                                Last: {formatTime(chat.lastMessageTime)}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {chat.participantDetails?.length || 0} participants
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleOpenModal(chat as Chat & { messages: ChatMessage[] })
                            }
                            className="hover:bg-purple-50 hover:border-purple-300"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {chat.isSuspicious && (
                            <Button
                              size="sm"
                              onClick={() => handleNotifyChat(chat as Chat)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Bell className="w-4 h-4 mr-1" />
                              Notify
                            </Button>
                          )}
                          <button
                            onClick={() => toggleRowExpand(chat.id)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <ChevronDown
                              className={`w-5 h-5 transition-transform ${
                                expandedRows.has(chat.id) ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Messages Preview */}
                      <AnimatePresence>
                        {expandedRows.has(chat.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 pt-6 border-t border-gray-200"
                          >
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {(
                                (chat as Chat & { messages: ChatMessage[] })
                                  .messages || []
                              )
                                .slice(0, 5)
                                .map((msg) => (
                                  <div
                                    key={msg.id}
                                    className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1">
                                        <p className="text-xs font-semibold text-gray-600">
                                          {msg.senderId}
                                        </p>
                                        {msg.type && (
                                          <p className="text-xs text-purple-600 mt-1">
                                            Type: {msg.type}
                                          </p>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500">
                                        {msg.createdAt ? formatTime(msg.createdAt) : "N/A"}
                                      </p>
                                    </div>
                                    <p className="text-sm text-gray-700 break-words">
                                      {msg.text}
                                    </p>
                                  </div>
                                ))}
                            </div>
                            {
                              (
                                (chat as Chat & { messages: ChatMessage[] })
                                  .messages || []
                              ).length > 5 && (
                                <p className="text-xs text-gray-500 mt-3 text-center">
                                  +{" "}
                                  {
                                    (
                                      (chat as Chat & { messages: ChatMessage[] })
                                        .messages || []
                                    ).length - 5
                                  }{" "}
                                  more messages
                                </p>
                              )
                            }
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Chat Details Modal */}
        {selectedChat && (
          <ChatDetailsModal
            chat={selectedChat as Chat & { messages: ChatMessage[] }}
            messages={chatMessages.length > 0 ? chatMessages : (selectedChat as Chat & { messages: ChatMessage[] }).messages || []}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            formatTime={formatTime}
            formatDate={formatDate}
            onNotify={() => handleNotifyChat(selectedChat as Chat)} // Pass a function that calls handleNotifyChat with the selected chat
          />
        )}
      </div>
    </div>
  );
};

// Chat Details Modal Component
const ChatDetailsModal = ({
  chat,
  messages,
  isOpen,
  onClose,
  formatTime,
  formatDate,
  onNotify,
}: {
  chat: Chat & { messages: ChatMessage[] };
  messages: ChatMessage[];
  isOpen: boolean;
  onClose: () => void;
  formatTime: (ts: { seconds: number; nanoseconds: number }) => string;
  formatDate: (ts: { seconds: number; nanoseconds: number }) => string;
  onNotify: () => Promise<void>;
}) => {
  const [usersMap, setUsersMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersCollection = collection(db, "users");
        const userDocs = await getDocs(usersCollection);
        const map = new Map(
          userDocs.docs.map((doc) => [doc.id, doc.data()])
        );
        setUsersMap(map);
      } catch (error) {
        console.log("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  // Determine the primary request status for UI context
  const requestStatus = chat.requestDetails?.status;
  const isSuspicious = chat.isSuspicious;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98%] max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-gradient-to-br from-white to-gray-50 shadow-2xl rounded-3xl p-0 border border-gray-200">
        {/* Header */}
        <DialogHeader className="border-b border-gray-300/40 p-8 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 flex-shrink-0">
          <div className="w-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/25 backdrop-blur-md rounded-2xl shadow-xl flex-shrink-0 ring-2 ring-white/30">
                <MessageSquare className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-3xl font-bold text-white mb-1 leading-tight">
                  Chat Investigation
                </DialogTitle>
                <p className="text-base text-indigo-100 font-medium">{chat.itemDetails?.name || "Unknown Item"}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/25">
              <div className="bg-white/15 backdrop-blur-md rounded-lg px-4 py-2.5 border border-white/20">
                <p className="text-xs text-indigo-100 font-semibold uppercase tracking-wide mb-0.5">Chat ID</p>
                <p className="font-mono text-sm text-white">{chat.id.slice(0, 20)}...</p>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-lg px-4 py-2.5 border border-white/20">
                <p className="text-xs text-indigo-100 font-semibold uppercase tracking-wide mb-0.5">Item ID</p>
                <p className="font-mono text-sm text-white">{chat.itemDetails?.itemId || 'N/A'}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
                {/* Participants Section */}
                <section className="bg-white rounded-2xl p-6 border border-blue-100 shadow-md hover:shadow-lg transition-all duration-300">
                  <h3 className="text-lg font-bold text-blue-900 mb-5 flex items-center gap-3 pb-4 border-b-2 border-blue-100">
                    <div className="p-2.5 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    Participants
                  </h3>
                  <div className="space-y-3">
                    {chat.participantDetails?.map((participant, index) => (
                      <div
                        key={participant.id}
                        className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-bold text-blue-700 uppercase tracking-wide bg-blue-100 px-2.5 py-1 rounded-full">Participant {index + 1}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Email</p>
                        <p className="text-sm font-semibold text-blue-900 break-all">
                          {participant.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-3 font-mono break-all border-t border-blue-100 pt-3">
                          {participant.id}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Status & Alerts Section */}
                <section className={`rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 ${isSuspicious ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                  <h3 className={`text-lg font-bold mb-5 flex items-center gap-3 pb-4 border-b-2 ${isSuspicious ? 'border-red-200 text-red-900' : 'border-green-200 text-green-900'}`}>
                    <div className={`p-2.5 rounded-lg ${isSuspicious ? 'bg-red-100' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 ${isSuspicious ? 'text-red-600' : 'text-green-600'}`} />
                    </div>
                    Request Status
                  </h3>
                  
                  {/* Status Badge */}
                  <div className="mb-5">
                    <p className="text-xs text-gray-600 font-semibold mb-2 uppercase tracking-wide">Current Status</p>
                    <Badge
                      className={`text-sm py-2 px-4 rounded-full font-bold uppercase inline-block ${
                        requestStatus === "completed"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : requestStatus === "accepted" || requestStatus === "initial_payment_paid" || requestStatus === "assessment_submitted"
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : requestStatus === "pickedup"
                              ? "bg-purple-100 text-purple-800 border border-purple-300"
                              : requestStatus === "pending"
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                      }`}
                    >
                      {requestStatus?.toUpperCase().replace(/_/g, " ") || 'N/A'}
                    </Badge>
                  </div>

                  {/* Suspicious Alert */}
                  {isSuspicious && (
                    <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 mb-4">
                      <p className="text-xs font-bold text-red-700 flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 animate-pulse" />
                        SUSPICIOUS ACTIVITY DETECTED
                      </p>
                      <p className="text-xs text-red-600 font-medium">{chat.flagReason}</p>
                      <Button
                        onClick={onNotify}
                        className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white font-bold h-9 text-sm rounded-lg transition-all"
                      >
                        <Bell className="w-4 h-4 mr-2" />
                        Send Admin Notification
                      </Button>
                    </div>
                  )}
                  
                  {/* Overdue Alert */}
                  {chat.overdueNotification && (
                    <div className="bg-orange-100 border-2 border-orange-400 rounded-lg p-3 mb-4">
                      <p className="text-xs font-bold text-orange-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-pulse" />
                        OVERDUE PROCESSING
                      </p>
                    </div>
                  )}

                  {/* Payment/Confirmation Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
                      <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <Wallet className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <span>Initial Payment</span>
                      </span>
                      <Badge className={`text-xs font-bold px-3 py-1 ${requestStatus === "initial_payment_paid" ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-200 text-gray-700 border border-gray-300'}`}>
                        {requestStatus === "initial_payment_paid" ? '✓ YES' : '✗ NO'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3">
                      <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <UserCheck className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <span>Owner Responded</span>
                      </span>
                      <Badge className={`text-xs font-bold px-3 py-1 ${chat.hasOwnerResponded ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-gray-200 text-gray-700 border border-gray-300'}`}>
                        {chat.hasOwnerResponded ? '✓ YES' : '✗ NO'}
                      </Badge>
                    </div>
                  </div>
                </section>
                
                {/* Item Details Section */}
                {chat.itemDetails && (
                  <section className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-md hover:shadow-lg transition-all duration-300 md:col-span-2">
                    <h3 className="text-lg font-bold text-indigo-900 mb-5 pb-4 border-b-2 border-indigo-100 flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-100 rounded-lg">
                        <span className="text-xl">📦</span>
                      </div>
                      Item Details
                    </h3>
                    <div className="space-y-3">
                      
                      <div className="bg-indigo-50/50 rounded-lg p-4 border border-indigo-100">
                        <p className="text-xs text-gray-500 font-semibold mb-2 uppercase">Item Name</p>
                        <p className="text-base font-bold text-gray-900 mb-2">
                          {chat.itemDetails.name || chat.itemDetails.itemName}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                            ID: {chat.itemDetails.itemId}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Price */}
                        <div className="bg-green-50/50 rounded-lg p-4 border border-green-100">
                          <p className="text-xs text-gray-500 font-semibold mb-2 uppercase">Price</p>
                          <p className="text-xl font-bold text-green-700">
                            ₱{chat.itemDetails.price?.toLocaleString() || '0'}
                          </p>
                        </div>
                        {/* Rental Days */}
                        {chat.itemDetails.rentalDays && (
                          <div className="bg-purple-50/50 rounded-lg p-4 border border-purple-100">
                            <p className="text-xs text-gray-500 font-semibold mb-2 uppercase">Duration</p>
                            <p className="text-xl font-bold text-purple-700">
                              {chat.itemDetails.rentalDays} days
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Dates Section */}
                      <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-600 font-semibold flex items-center gap-2 uppercase">
                            <Calendar className="w-4 h-4 flex-shrink-0 text-amber-600" />
                            <span>Start Date</span>
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {convertTimestampToDate(chat.itemDetails.startDate)}
                          </p>
                        </div>
                        {chat.itemDetails.endDate && (
                          <div className="flex items-center justify-between pt-3 border-t border-amber-200">
                            <p className="text-xs text-gray-600 font-semibold flex items-center gap-2 uppercase">
                              <Calendar className="w-4 h-4 flex-shrink-0 text-amber-600" />
                              <span>End Date</span>
                            </p>
                            <p className="text-sm font-bold text-gray-900">
                              {convertTimestampToDate(chat.itemDetails.endDate)}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-amber-200">
                          <p className="text-xs text-gray-600 font-semibold flex items-center gap-2 uppercase">
                            <Clock className="w-4 h-4 flex-shrink-0 text-amber-600" />
                            <span>Pickup Time</span>
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {convertPickupTime(chat.itemDetails.pickupTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* General Metadata */}
                <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-md hover:shadow-lg transition-all duration-300 md:col-span-2">
                  <h3 className="text-lg font-bold text-gray-900 mb-5 pb-4 border-b-2 border-gray-100 flex items-center gap-3">
                    <div className="p-2.5 bg-gray-100 rounded-lg">
                      <Shield className="w-5 h-5 text-gray-600" />
                    </div>
                    Chat Metadata
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold uppercase">Created Date</p>
                      <p className="text-sm font-bold text-gray-900">
                        {formatDate(chat.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold uppercase">Total Messages</p>
                      <p className="text-sm font-bold text-gray-900">
                        {messages.length}
                      </p>
                    </div>
                    <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold uppercase">Last Update</p>
                      <p className="text-sm font-bold text-gray-900">
                        {chat.updatedAt ? formatDate(chat.updatedAt) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </section>

            </div>
          </div>
        </div>
        
        {/* Footer */}
        <DialogFooter className="border-t border-gray-300/40 p-6 bg-gradient-to-r from-gray-50 to-gray-100 flex-shrink-0 flex justify-end gap-3">
      
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg shadow-lg font-semibold transition-all"
          >
            Close 
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChatLogsPage;