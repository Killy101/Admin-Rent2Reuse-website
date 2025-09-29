"use client"; // Enable client-side rendering in Next.js

// Import necessary dependencies
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/app/firebase/config";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import emailjs from "@emailjs/browser";
import { Shield, MoreVertical, Download, Archive, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from "@/app/firebase/config"; // Import auth from Firebase
import { useRouter } from "next/navigation";

// Interface for message structure
interface Message {
  message: string;
  sender: string;
  timestamp: string;
}

// Interface for support ticket data structure
interface SupportTicket {
  id: string;
  userId: string;
  email: string;
  subject: string;
  messages: Message[];
  priority: "Low" | "Medium" | "High";
  status: "open" | "in_progress" | "resolved" | "closed";
  date: string;
  description: string;
  isUnread: boolean;
  lastReadAt?: string;
  lastReadBy?: {
    admin?: string;
  };
  ticketId?: string; // Optional field for ticket ID in notifications
}

// Interface for notification structure
interface Notification {
  id?: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: "support";
  ticketId: string;
}

interface CSVReport {
  ticketId: string;
  subject: string;
  email: string;
  status: string;
  priority: string;
  dateCreated: string;
  lastUpdated: string;
  messageCount: number;
  resolution: string;
}

const AdminSupportPage = () => {
  // State management for tickets and UI controls
  const [tickets, setTickets] = useState<SupportTicket[]>([]); // All support tickets
  const [selectedStatus, setSelectedStatus] = useState("All"); // Filter by status
  const [search, setSearch] = useState(""); // Search input
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  ); // Currently selected ticket
  const [replyMessage, setReplyMessage] = useState(""); // Reply message content
  const [statusUpdate, setStatusUpdate] = useState(""); // Status update for ticket
  const [currentPage, setCurrentPage] = useState(1);
  const [ticketsPerPage] = useState(9); // 9 cards for 3x3 grid
  const [sortField, setSortField] = useState<"date" | "priority" | "status">(
    "date"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [unreadCount, setUnreadCount] = useState(0); // Track unread tickets
  const [isLoading, setIsLoading] = useState(false); // Loading state for send button
  const [sentTickets, setSentTickets] = useState<Set<string>>(new Set()); // Track sent replies
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [archivedTickets, setArchivedTickets] = useState<SupportTicket[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const router = useRouter();

  // Helper function to format dates consistently
  const formatDate = (date: any) => {
    if (!date) return "N/A";
    if (date?.seconds) return new Date(date.seconds * 1000).toLocaleString();
    if (typeof date === "string") return new Date(date).toLocaleString();
    return new Date().toLocaleString();
  };

  // Generate ticket ID if not exists
  const generateTicketId = (docId: string, date: string) => {
    const dateStr = new Date(date).toISOString().slice(0, 10).replace(/-/g, "");
    return `TKT-${dateStr}-${docId.slice(-6).toUpperCase()}`;
  };

  // Fetch tickets when component mounts
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const ticketSnapshot = await getDocs(collection(db, "support"));
        const ticketData = ticketSnapshot.docs.map((doc) => {
          const data = doc.data();
          const ticketDate = formatDate(data.date) || formatDate(new Date());
          const ticketId =
            data.ticketId || generateTicketId(doc.id, ticketDate);

          return {
            id: doc.id,
            userId: data.userId || "",
            email: data.email || "",
            subject: data.subject || "",
            ticketId: ticketId, // Ensure ticketId is always present
            messages: (data.messages || []).map((msg: any) => ({
              ...msg,
              timestamp: formatDate(msg.timestamp),
            })),
            priority: data.priority || "Medium",
            status: data.status || "open",
            date: ticketDate,
            description: data.description || "",
            isUnread:
              !data.lastReadBy?.admin ||
              new Date(data.lastReadAt) <
                new Date(data.messages?.[data.messages.length - 1]?.timestamp),
            lastReadAt: data.lastReadAt || null,
            lastReadBy: data.lastReadBy || {},
          };
        }) as SupportTicket[];

        // Separate active and archived tickets
        const { active, archived } = ticketData.reduce(
          (acc, ticket) => {
            if (ticket.status === "closed") {
              acc.archived.push(ticket);
            } else {
              acc.active.push(ticket);
            }
            return acc;
          },
          { active: [] as SupportTicket[], archived: [] as SupportTicket[] }
        );

        setTickets(active);
        setArchivedTickets(archived);
        setUnreadCount(active.filter((t) => t.isUnread).length);

        // Update tickets in Firestore if they don't have ticketId
        const updatePromises = ticketData
          .filter(
            (ticket) =>
              !ticketSnapshot.docs.find((doc) => doc.id === ticket.id)?.data()
                .ticketId
          )
          .map((ticket) => {
            const ticketRef = doc(db, "support", ticket.id);
            return updateDoc(ticketRef, { ticketId: ticket.ticketId });
          });

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log(`Updated ${updatePromises.length} tickets with ticketId`);
        }
      } catch (error) {
        console.log("Error fetching tickets:", error);
        toast.error("Failed to load support tickets");
      }
    };

    fetchTickets();
  }, []);

  // Initialize EmailJS for email notifications
  useEffect(() => {
    emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_PUBLIC_KEY!);
  }, []);

  // Function to send email notifications to users
  const sendEmailNotification = async (
    toEmail: string,
    subject: string,
    message: string,
    ticketSubject: string,
    ticketId: string
  ) => {
    try {
      const templateParams = {
        to_email: toEmail,
        to_name: toEmail.split("@")[0], // Extract name from email
        from_name: "R2R Support Team",
        subject: `Re: ${ticketSubject}`,
        ticketId: ticketId, // ← Changed from ticket_id to ticketId
        message: message,
        ticket_subject: ticketSubject,
        support_email: "rentoreuse.2025@gmail.com",
        // Don't use reply_to field, let EmailJS handle the from address
      };

      console.log("Sending email with params:", templateParams);
      console.log("Ticket ID being sent:", ticketId); // Debug log

      const response = await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_TEMPLATE_ID!,
        templateParams,
        process.env.NEXT_PUBLIC_EMAILJS_SUPPORT_PUBLIC_KEY!
      );

      if (response.status === 200) {
        console.log("Email sent successfully to:", toEmail);
        toast.success(`Email sent to ${toEmail}`);
        return true;
      } else {
        throw new Error(`Email send failed with status: ${response.status}`);
      }
    } catch (error) {
      console.log("EmailJS Error:", error);
      toast.error("Failed to send email notification");
      throw error;
    }
  };

  // Function to send in-app notifications to users
  const sendNotificationToUser = async (
    userId: string,
    ticketId: string,
    subject: string,
    message: string
  ) => {
    try {
      const notificationsRef = collection(db, "notifications");
      const notification: Omit<Notification, "id"> = {
        userId,
        title: `Support Ticket Update: ${subject}`,
        message: `Your support ticket (${ticketId}) has been updated: ${message}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        type: "support",
        ticketId,
      };

      await addDoc(notificationsRef, notification);
      console.log("In-app notification sent to user:", userId);
      return true;
    } catch (error) {
      console.log("Error sending notification:", error);
      throw error;
    }
  };

  // Handle sending replies to support tickets
  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) {
      toast.error("Please enter a reply message");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Sending reply to ticket:", selectedTicket.id);
      console.log("User email:", selectedTicket.email);
      console.log("Ticket ID:", selectedTicket.ticketId); // Debug log

      const ticketRef = doc(db, "support", selectedTicket.id);
      const newMessage: Message = {
        message: replyMessage,
        sender: "admin",
        timestamp: new Date().toISOString(),
      };

      // Ensure ticketId is present
      const ticketIdToUse =
        selectedTicket.ticketId ||
        generateTicketId(selectedTicket.id, selectedTicket.date);

      // Update Firestore first
      await updateDoc(ticketRef, {
        messages: arrayUnion(newMessage),
        status: statusUpdate || "in_progress",
        ticketId: ticketIdToUse, // Ensure ticketId is saved
      });

      // Send notifications with proper error handling
      const [emailResult, notificationResult] = await Promise.allSettled([
        sendEmailNotification(
          selectedTicket.email,
          `Support Ticket Update: ${selectedTicket.subject}`,
          replyMessage,
          selectedTicket.subject,
          ticketIdToUse // Use the ensured ticketId
        ),
        sendNotificationToUser(
          selectedTicket.userId,
          ticketIdToUse, // Use the ensured ticketId
          selectedTicket.subject,
          replyMessage
        ),
      ]);

      // Check results
      let successCount = 0;
      if (emailResult.status === "fulfilled") successCount++;
      if (notificationResult.status === "fulfilled") successCount++;

      if (successCount > 0) {
        toast.success(
          `Reply sent successfully! (${successCount}/2 notifications sent)`
        );

        // Add to sent tickets set to disable button
        setSentTickets((prev) => new Set(prev).add(selectedTicket.id));
      } else {
        toast.error("Reply saved but notifications failed");
      }

      // Update local state
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? {
                ...t,
                messages: [...t.messages, newMessage],
                status: (statusUpdate ||
                  "in_progress") as SupportTicket["status"],
                ticketId: ticketIdToUse,
              }
            : t
        )
      );

      // Reset form
      setReplyMessage("");
      setSelectedTicket(null);
      setStatusUpdate("");
    } catch (error) {
      console.log("Error sending reply:", error);
      toast.error("Failed to send reply. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ticket status changes
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;

    try {
      const ticketRef = doc(db, "support", selectedTicket.id);
      await updateDoc(ticketRef, { status: newStatus });
      setStatusUpdate(newStatus);
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, status: newStatus as SupportTicket["status"] }
            : t
        )
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      console.log("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  // Sort tickets based on selected field and direction
  const sortTickets = (tickets: SupportTicket[]) => {
    return [...tickets].sort((a, b) => {
      if (sortField === "date") {
        return sortDirection === "desc"
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortField === "priority") {
        const priorityWeight = { Low: 1, Medium: 2, High: 3 };
        return sortDirection === "desc"
          ? priorityWeight[b.priority] - priorityWeight[a.priority]
          : priorityWeight[a.priority] - priorityWeight[b.priority];
      }
      // status sorting
      return sortDirection === "desc"
        ? b.status.localeCompare(a.status)
        : a.status.localeCompare(b.status);
    });
  };

  // Filter tickets based on search and status
  const filteredTickets = (showArchived ? archivedTickets : tickets).filter(
    (ticket) => {
      const matchesStatus =
        selectedStatus === "All" || ticket.status === selectedStatus;
      const matchesSearch = ticket.subject
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    }
  );

  const sortedTickets = sortTickets(filteredTickets);

  // Pagination logic
  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = sortedTickets.slice(
    indexOfFirstTicket,
    indexOfLastTicket
  );

  // Component for sorting controls
  const SortingControls = () => {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={sortField}
          onValueChange={(value: "date" | "priority" | "status") =>
            setSortField(value)
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          onClick={() =>
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
          }
          className="flex items-center gap-1"
        >
          {sortDirection === "asc" ? "↑" : "↓"}
        </Button>
      </div>
    );
  };

  // Pagination component
  const Pagination = () => {
    const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-600">
          Showing{" "}
          {Math.min(
            (currentPage - 1) * ticketsPerPage + 1,
            filteredTickets.length
          )}
          {" to "}
          {Math.min(
            currentPage * ticketsPerPage,
            filteredTickets.length
          )} of {filteredTickets.length} tickets
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  // Mark ticket as read
  const markTicketAsRead = async (ticketId: string) => {
    try {
      const ticketRef = doc(db, "support", ticketId);
      await updateDoc(ticketRef, {
        lastReadAt: new Date().toISOString(),
        lastReadBy: {
          admin: "admin", // You could use actual admin ID here
        },
        isUnread: false,
      });

      // Update local state
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, isUnread: false, lastReadAt: new Date().toISOString() }
            : t
        )
      );

      // Update unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.log("Error marking ticket as read:", error);
      toast.error("Failed to mark ticket as read");
    }
  };

  // Statistics component for ticket overview
  const TicketStats = () => {
    const stats = {
      total: filteredTickets.length,
      unread: filteredTickets.filter((t) => t.isUnread).length,
      open: filteredTickets.filter((t) => t.status === "open").length,
      inProgress: filteredTickets.filter((t) => t.status === "in_progress")
        .length,
      resolved: filteredTickets.filter((t) => t.status === "resolved").length,
    };

    const statsArray = [
      { label: "Total", value: stats.total, color: "bg-gray-100" },
      { label: "Unread", value: stats.unread, color: "bg-blue-100" },
      { label: "Open", value: stats.open, color: "bg-yellow-100" },
      {
        label: "In Progress",
        value: stats.inProgress,
        color: "bg-purple-100",
      },
      { label: "Resolved", value: stats.resolved, color: "bg-green-100" },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statsArray.map(({ label, value, color }) => (
          <div key={label} className={`${color} rounded-lg p-4 text-center`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-600">{label}</div>
          </div>
        ))}
      </div>
    );
  };

  function handleExportCSV(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ): void {
    // Prepare CSV data from tickets
    const csvRows: string[] = [];
    const headers = [
      "Ticket ID",
      "Subject",
      "Email",
      "Status",
      "Priority",
      "Date Created",
      "Last Updated",
      "Message Count",
      "Resolution",
    ];
    csvRows.push(headers.join(","));

    // Use filteredTickets for export (matches current view)
    filteredTickets.forEach((ticket) => {
      const lastMsg = ticket.messages?.[ticket.messages.length - 1];
      const lastUpdated = lastMsg ? lastMsg.timestamp : ticket.date;
      const resolution =
        ticket.status === "resolved" || ticket.status === "closed"
          ? ticket.messages?.[ticket.messages.length - 1]?.message || ""
          : "";
      const row = [
        `"${ticket.ticketId || ""}"`,
        `"${ticket.subject.replace(/"/g, '""')}"`,
        `"${ticket.email}"`,
        `"${ticket.status}"`,
        `"${ticket.priority}"`,
        `"${ticket.date}"`,
        `"${lastUpdated}"`,
        `${ticket.messages?.length || 0}`,
        `"${resolution.replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    // Create CSV file and trigger download
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `support_tickets_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully!");
  }

  async function handleArchiveTicket(id: string): Promise<void> {
    try {
      const ticketRef = doc(db, "support", id);
      await updateDoc(ticketRef, {
        status: "closed",
        archivedAt: new Date().toISOString(),
      });

      // Move ticket from active to archived
      const ticketToArchive = tickets.find((t) => t.id === id);
      if (ticketToArchive) {
        const updatedTicket = {
          ...ticketToArchive,
          status: "closed" as SupportTicket["status"],
          archivedAt: new Date().toISOString(),
        };
        setArchivedTickets((prev) => [...prev, updatedTicket]);
        setTickets((prev) => prev.filter((t) => t.id !== id));
      }

      toast.success("Ticket archived successfully!");
    } catch (error) {
      console.log("Error archiving ticket:", error);
      toast.error("Failed to archive ticket");
    }
  }

  async function handleUnarchiveTicket(id: string): Promise<void> {
    try {
      const ticketRef = doc(db, "support", id);
      await updateDoc(ticketRef, {
        status: "open",
        archivedAt: null,
      });

      // Move ticket from archived back to active
      const ticketToUnarchive = archivedTickets.find((t) => t.id === id);
      if (ticketToUnarchive) {
        const updatedTicket = {
          ...ticketToUnarchive,
          status: "open" as SupportTicket["status"],
          archivedAt: null,
        };
        setTickets((prev) => [...prev, updatedTicket]);
        setArchivedTickets((prev) => prev.filter((t) => t.id !== id));
      }

      toast.success("Ticket unarchived successfully!");
    } catch (error) {
      console.log("Error unarchiving ticket:", error);
      toast.error("Failed to unarchive ticket");
    }
  }

  async function handleDeleteTicket(id: string): Promise<void> {
    try {
      const ticketRef = doc(db, "support", id);
      await deleteDoc(ticketRef);
      setTickets((prev) => prev.filter((t) => t.id !== id));
      toast.success("Ticket deleted successfully!");
    } catch (error) {
      console.log("Error deleting ticket:", error);
      toast.error("Failed to delete ticket");
    }
  }

  // Main render
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header section with title and unread count */}
      <div className="flex justify-between items-center">
        {/* Enhanced Header */}
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
                Support Tickets
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Manage and analyze user support tickets
              </p>
            </div>
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"></div>
        </motion.div>
        {unreadCount > 0 && (
          <Badge variant="default" className="bg-blue-500">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      {/* Statistics overview */}
      <TicketStats />

      {/* Main content area */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        {/* Search and filter controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <div className="flex gap-2 items-center flex-1">
            <Input
              placeholder="Search by subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <SortingControls />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-2 ${
                showArchived ? "bg-gray-100" : ""
              }`}
            >
              <Archive className="h-4 w-4" />
              {showArchived
                ? "Show Active Tickets"
                : `Show Archived (${archivedTickets.length})`}
            </Button>
          </div>
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
            <TabsList>
              {["All", "open", "in_progress", "resolved", "closed"].map(
                (status) => (
                  <TabsTrigger key={status} value={status}>
                    {status.replace(/_/g, " ").toUpperCase()}
                  </TabsTrigger>
                )
              )}
            </TabsList>
          </Tabs>
        </div>

        {/* Ticket grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortTickets(filteredTickets)
            .slice(
              (currentPage - 1) * ticketsPerPage,
              currentPage * ticketsPerPage
            )
            .map((ticket) => (
              <Card
                key={ticket.id}
                className={`${
                  ticket.isUnread
                    ? "border-l-4 border-l-blue-500 shadow-md"
                    : ""
                } hover:shadow-lg transition-shadow duration-200`}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h2 className="font-semibold flex items-center gap-2">
                      {ticket.isUnread && (
                        <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                      )}
                      {ticket.subject}
                    </h2>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          ticket.status === "closed"
                            ? "bg-gray-100 text-gray-700"
                            : ticket.priority === "High"
                            ? "bg-red-100 text-red-700"
                            : ticket.priority === "Medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {showArchived ? "Archived" : ticket.priority}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {showArchived ? (
                            <DropdownMenuItem
                              onClick={() => handleUnarchiveTicket(ticket.id)}
                            >
                              <Archive className="mr-2 h-4 w-4 rotate-180" />
                              Unarchive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleArchiveTicket(ticket.id)}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteTicket(ticket.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    From: ({ticket.email})
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Ticket Id: {ticket.ticketId || "Generating..."}
                  </p>
                  <p className="text-sm line-clamp-3">{ticket.description}</p>
                  <div className="text-sm">
                    Status: <strong>{ticket.status}</strong>
                  </div>
                  <div className="text-sm">Submitted: {ticket.date}</div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full mt-2"
                        variant="outline"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          if (ticket.isUnread) {
                            markTicketAsRead(ticket.id);
                          }
                        }}
                      >
                        View & Reply
                      </Button>
                    </DialogTrigger>
                    {selectedTicket?.id === ticket.id && (
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{selectedTicket.subject}</DialogTitle>
                          <p className="text-sm text-gray-600">
                            From: {selectedTicket.email} | Ticket ID:{" "}
                            {selectedTicket.ticketId}
                          </p>
                        </DialogHeader>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Update Status:</span>
                          <Select
                            defaultValue={selectedTicket.status}
                            onValueChange={handleStatusChange}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Change Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {[
                                "open",
                                "in_progress",
                                "resolved",
                                "closed",
                              ].map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status.replace(/_/g, " ").toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-4">
                          <div className="text-sm font-medium mb-2">
                            Original Message:
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md mb-4">
                            {selectedTicket.description}
                          </div>

                          {selectedTicket.messages &&
                            selectedTicket.messages.length > 0 && (
                              <>
                                <div className="text-sm font-medium mb-2">
                                  Conversation History:
                                </div>
                                {selectedTicket.messages.map((msg, i) => (
                                  <div
                                    key={i}
                                    className={`text-sm p-3 rounded-md ${
                                      msg.sender === "admin"
                                        ? "bg-blue-50 border-l-4 border-blue-500"
                                        : "bg-gray-50 border-l-4 border-gray-300"
                                    }`}
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <strong>
                                        {msg.sender === "admin"
                                          ? "Support Team"
                                          : "Customer"}
                                      </strong>
                                      <span className="text-xs text-gray-500">
                                        {new Date(
                                          msg.timestamp
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                    <div>{msg.message}</div>
                                  </div>
                                ))}
                              </>
                            )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Your Reply:
                          </label>
                          <Textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your reply here..."
                            rows={4}
                            disabled={sentTickets.has(selectedTicket.id)}
                          />
                          {sentTickets.has(selectedTicket.id) && (
                            <p className="text-sm text-green-600">
                              ✓ Reply has been sent to this ticket
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedTicket(null);
                              setReplyMessage("");
                              setStatusUpdate("");
                            }}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSendReply}
                            disabled={
                              !replyMessage.trim() ||
                              isLoading ||
                              sentTickets.has(selectedTicket.id)
                            }
                          >
                            {isLoading
                              ? "Sending..."
                              : sentTickets.has(selectedTicket.id)
                              ? "Reply Sent"
                              : "Send Reply"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    )}
                  </Dialog>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Show message if no tickets found */}
        {filteredTickets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No tickets found matching your filters.
            </p>
          </div>
        )}

        {/* Pagination controls */}
        <Pagination />
      </div>
    </div>
  );
};

// Add this component after your imports
const AccessDenied = () => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
      <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-6">
        Sorry, only Super Admins and Support team can access this page.
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

export default AdminSupportPage;
