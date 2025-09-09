"use client";

import { useState, useEffect } from "react";
import { Announcement } from "@/app/types/announcement"; // Adjust the import path as necessary
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase/config"; // Adjust the import path as necessary
import { motion } from "framer-motion";
import { Pencil, Trash2, Upload } from "lucide-react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<{
    [key: string]: boolean;
  }>({});

  // Real-time fetch
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "announcements"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title,
            message: d.message,

            imageUrl: d.imageUrl,
            createdAt:
              d.createdAt instanceof Timestamp
                ? d.createdAt.toDate()
                : new Date(),
            isActive: d.isActive,
          } as Announcement;
        });
        setAnnouncements(data);
      }
    );

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setEditingId(null);
    setImage(null);
    setImageUrl("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    setImage(file);

    try {
      setIsUploading(true);
      const storage = getStorage();
      const storageRef = ref(
        storage,
        `announcements/${Date.now()}_${file.name}`
      );

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    const announcementData = {
      title,
      message,
      imageUrl,
      createdAt: Timestamp.now(),
      isActive: true,
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "announcements", editingId), announcementData);
      } else {
        await addDoc(collection(db, "announcements"), announcementData);
      }
      resetForm();
    } catch (error) {
      console.error("Error saving announcement:", error);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setTitle(announcement.title);
    setMessage(announcement.message);

    setEditingId(announcement.id);
    setImageUrl(announcement.imageUrl ?? "");
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "announcements", id));
    if (editingId === id) resetForm();
  };

  const toggleStatus = async (id: string, active: boolean) => {
    const ref = doc(db, "announcements", id);
    await updateDoc(ref, {
      isActive: active,
    });
  };

  const toggleMessage = (id: string) => {
    setExpandedMessages((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="p-6 bg-gray-50">
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
              Manage Announcements
            </h1>
            <p className="text-lg text-gray-600 mt-2">
              Manage and analyze user announcements
            </p>
          </div>
        </div>
        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"></div>
      </motion.div>

      {/* Two-panel layout */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Left Panel - Add Announcement Details */}
        <div className="border-2 border-purple-200 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-bold mb-6 text-purple-700">
            Add Announcement Details
          </h2>

          <div className="space-y-6">
            {/* Image Upload - Moved to top */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Upload Image
              </label>
              <div className="mt-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  {isUploading ? "Uploading..." : "Choose Image"}
                </label>
                {/* Fixed height container for image preview */}
                <div className="mt-2 w-full h-48 bg-gray-50 rounded-md overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                placeholder="Announcement Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea
                placeholder="Announcement Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-32"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={isUploading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-md hover:from-purple-700 hover:to-blue-700 transition duration-200 disabled:from-purple-300 disabled:to-blue-300 disabled:cursor-not-allowed"
            >
              {isUploading
                ? "Uploading..."
                : editingId
                ? "Update Announcement"
                : "Add Announcement"}
            </button>
          </div>
        </div>

        {/* Right Panel - Realtime View */}
        <div className="border-2 border-blue-400 rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-2xl font-bold mb-6 text-blue-700">
            Realtime View
          </h2>

          <motion.div
            className="rounded-lg overflow-hidden shadow-lg border-2 border-blue-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 bg-white">
              {/* Fixed height container for preview image */}
              <div className="w-full h-48 bg-gray-100 rounded-md overflow-hidden mb-4">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Announcement"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No image uploaded
                  </div>
                )}
              </div>

              <div className="text-center">
                <h2 className="text-xl font-bold text-black">
                  {title || "Your Announcement Title"}
                </h2>
                <p className="text-black mt-2">
                  {message || "Your announcement message will appear here"}
                </p>
                <p className="text-black mt-3 text-sm italic">
                  {new Date().toLocaleString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
                <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-black font-semibold border border-blue-300">
                  Active
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* List of Announcements */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
          All Announcements
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((a) => (
            <motion.div
              key={a.id}
              className="rounded-lg overflow-hidden shadow-lg flex flex-col h-full border border-gray-200 hover:shadow-xl transition-shadow"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={` p-4 flex-1`}>
                {/* Image Container */}
                {a.imageUrl && (
                  <div className="w-full h-48 rounded-md overflow-hidden mb-4">
                    <img
                      src={a.imageUrl}
                      alt="Announcement"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content Container */}
                <div className="text-center flex flex-col h-full">
                  <h2 className="text-xl font-bold text-black mb-2 line-clamp-2">
                    {a.title}
                  </h2>
                  <div className="text-black flex-1 mb-4">
                    <p className={expandedMessages[a.id] ? "" : "line-clamp-3"}>
                      {a.message}
                    </p>
                    {a.message.length > 150 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleMessage(a.id);
                        }}
                        className="text-black/80 hover:text-black text-sm mt-1 underline"
                      >
                        {expandedMessages[a.id] ? "See less" : "See more"}
                      </button>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <p className="text-black/80 text-sm italic whitespace-nowrap">
                      {a.createdAt.toLocaleString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ml-2
            ${
              a.isActive
                ? "bg-green-400 text-green-900"
                : "bg-gray-400 text-gray-900"
            } font-semibold`}
                    >
                      {a.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Container */}
              <div className="flex items-center justify-between p-3 bg-white border-t border-gray-100">
                <button
                  onClick={() => handleEdit(a)}
                  className="flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2 py-1 rounded-md transition-colors"
                >
                  <Pencil size={16} /> Edit
                </button>
                <button
                  onClick={() => toggleStatus(a.id, !a.isActive)}
                  className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
                    a.isActive
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }`}
                >
                  {a.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
