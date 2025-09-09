"use client";

import { useEffect, useState } from "react";
import { auth, storage, db } from "@/app/firebase/config";
import { updateProfile, onAuthStateChanged, User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  collection,
  deleteDoc,
} from "firebase/firestore";
import Image from "next/image";
import { format } from "date-fns";
import {
  Camera,
  User as UserIcon,
  Shield,
  Mail,
  UserCheck,
  MapPin,
  Phone,
  Loader2,
  Edit3,
  CheckCircle,
  AlertCircle,
  Calendar,
  Activity,
  Settings,
  Bell,
  Eye,
  EyeOff,
} from "lucide-react";
import { ArrowRight, Lock, Save, X } from "lucide-react";
import router from "next/router";

// Interface definition
interface AdminProfile {
  email: string;
  adminRole: "superAdmin" | "manageUsers" | "support";
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address: string;
  profileImageUrl: string;
  updatedAt: string;
  uid?: string;
  isFirstLogin?: boolean;
  temporaryPassword?: boolean;
}

// Utility functions (moved outside component but not hooks)
const createInitialAdminDocument = async (user: User) => {
  try {
    console.log("📝 Creating initial admin document for UID:", user.uid);
    const docRef = doc(db, "admin", user.uid);

    // Get the admin document to check if it exists
    const adminDoc = await getDoc(docRef);

    // If document exists, don't create a new one
    if (adminDoc.exists()) {
      console.log("⚠️ Admin document already exists");
      return adminDoc.data();
    }

    // Check for existing document with same email
    const emailQuery = query(
      collection(db, "admin"),
      where("email", "==", user.email)
    );
    const emailDocs = await getDocs(emailQuery);

    if (!emailDocs.empty) {
      console.log("⚠️ Admin document with this email already exists");
      return emailDocs.docs[0].data();
    }

    // Do not set a default role - this should be set during signup
    const initialData = {
      uid: user.uid,
      email: user.email || "",
      username: user.displayName || "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      address: "",
      profileImageUrl: user.photoURL || "",
      adminRole: "", // This should be set during signup
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFirstLogin: true,
      temporaryPassword: true,
    };

    await setDoc(docRef, initialData);
    console.log("✅ Initial admin document created successfully");
    return initialData;
  } catch (error) {
    console.error("❌ Error creating initial admin document:", error);
    throw error;
  }
};

// Fetch admin data by UID first, then by email if not found
const fetchAdminData = async (uid: string, email: string | null) => {
  // Try to get by UID
  const docRef = doc(db, "admin", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  }
  // If not found by UID, try by email
  if (email) {
    const emailQuery = query(
      collection(db, "admin"),
      where("email", "==", email)
    );
    const emailDocs = await getDocs(emailQuery);
    if (!emailDocs.empty) {
      return emailDocs.docs[0].data();
    }
  }
  return null;
};

const styles = {
  container:
    "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4 sm:p-6 lg:p-8",
  header:
    "max-w-7xl mx-auto mb-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/50 p-6 lg:p-8",
  profileGrid: "max-w-7xl mx-auto grid lg:grid-cols-[420px,1fr] gap-8",
  card: "bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1",
  inputBase:
    "w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/80",
  inputDisabled:
    "w-full border border-slate-200 rounded-xl px-4 py-3 bg-gray-100 cursor-not-allowed text-gray-600",
  inputError:
    "w-full border border-red-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/80",
  button:
    "inline-flex items-center justify-center bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 disabled:opacity-50 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:scale-95",
  successToast:
    "fixed top-4 right-4 bg-green-500 text-white p-4 rounded-xl shadow-lg z-50 transform transition-all duration-300",
  errorToast:
    "fixed top-4 right-4 bg-red-500 text-white p-4 rounded-xl shadow-lg z-50 transform transition-all duration-300",
};

export default function ProfilePage() {
  // All hooks must be declared inside the component function
  const [adminData, setAdminData] = useState<AdminProfile>({
    username: "",
    email: "",
    adminRole: "support",
    firstName: "",
    lastName: "",
    profileImageUrl: "",
    phoneNumber: "",
    address: "",
    updatedAt: "",
    uid: "",
    isFirstLogin: false,
    temporaryPassword: false,
  });

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Enhanced error handling
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(""), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 5000);
  };

  // Fixed: Fetch admin data with better error handling and UID tracking
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          console.log("🔐 Authenticated user found:", user.uid);
          setCurrentUser(user);

          if (!user.email) {
            throw new Error("User email not found");
          }

          // Try to fetch existing admin data by both UID and email
          let adminDoc = await fetchAdminData(user.uid, user.email);

          if (adminDoc) {
            // If document exists but has different UID, update the UID
            if (adminDoc.uid !== user.uid) {
              console.log("📝 Updating admin document UID");
              if (adminDoc.uid) {
                const oldDocRef = doc(db, "admin", adminDoc.uid);
                const newDocRef = doc(db, "admin", user.uid);

                // Copy data to new document with correct UID
                await setDoc(newDocRef, {
                  ...adminDoc,
                  uid: user.uid,
                  updatedAt: new Date().toISOString(),
                });

                // Delete old document
                await deleteDoc(oldDocRef);
              }

              // Refresh admin data
              adminDoc = await fetchAdminData(user.uid, user.email);
            }
          } else {
            // Only create new document if none exists
            console.log("📝 Creating new admin document");
            const initialData = {
              uid: user.uid,
              email: user.email,
              username: user.displayName || "",
              firstName: "",
              lastName: "",
              phoneNumber: "",
              address: "",
              profileImageUrl: user.photoURL || "",
              adminRole: "", // This should be set during signup
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await setDoc(doc(db, "admin", user.uid), initialData);
            adminDoc = initialData as AdminProfile;
          }

          // Set the admin data
          if (adminDoc) {
            setAdminData({
              uid: user.uid,
              email: adminDoc.email,
              username: adminDoc.username,
              firstName: adminDoc.firstName || "",
              lastName: adminDoc.lastName || "",
              phoneNumber: adminDoc.phoneNumber || "",
              address: adminDoc.address || "",
              profileImageUrl: adminDoc.profileImageUrl || "",
              adminRole: adminDoc.adminRole || "support",
              updatedAt: adminDoc.updatedAt || new Date().toISOString(),
              isFirstLogin: adminDoc.isFirstLogin || false,
              temporaryPassword: adminDoc.temporaryPassword || false,
            });

            if (adminDoc.profileImageUrl) {
              setPreviewImage(adminDoc.profileImageUrl);
            }
          }

          console.log("✅ Admin data loaded successfully");
        } catch (error) {
          console.error("❌ Failed to fetch/create admin data:", error);
          showError(
            "Failed to load profile data. Please check your connection and try again."
          );
        } finally {
          setInitialLoading(false);
        }
      } else {
        console.log("❌ No authenticated user found");
        setCurrentUser(null);
        showError("No authenticated user found. Please log in again.");
        setInitialLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError("Image size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        showError("Please select a valid image file");
        return;
      }

      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
      console.log("✅ Image selected:", file.name);
    }
  };

  // Validation functions for each field
  const validations: { [K in keyof AdminProfile]?: (value: string) => string } =
    {
      username: (value) =>
        !value.trim()
          ? "Username is required"
          : value.length < 3
          ? "Username must be at least 3 characters"
          : "",
      firstName: (value) =>
        !value.trim()
          ? "First name is required"
          : value.length < 2
          ? "First name must be at least 2 characters"
          : "",
      lastName: (value) =>
        !value.trim()
          ? "Last name is required"
          : value.length < 2
          ? "Last name must be at least 2 characters"
          : "",
      phoneNumber: (value) =>
        value && !/^\+?\d{7,15}$/.test(value)
          ? "Enter a valid phone number"
          : "",
      address: (value) =>
        value && value.length > 200
          ? "Address must be less than 200 characters"
          : "",
      email: () => "", // Email is not editable
      adminRole: () => "", // Role is not editable here
      profileImageUrl: () => "",
      updatedAt: () => "",
      uid: () => "",
    };

  // Handle input changes with real-time validation
  const handleInputChange = (field: keyof AdminProfile, value: string) => {
    setAdminData((prev) => ({ ...prev, [field]: value }));

    // Only validate if we have a validation function and we're in edit mode
    if (editMode && validations[field as keyof typeof validations]) {
      const validationFn = validations[field as keyof typeof validations];
      const error = validationFn ? validationFn(value) : "";
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  // Validate all fields before submission
  const validateAllFields = () => {
    const newErrors: { [key: string]: string } = {};
    let hasErrors = false;

    // Validate required fields
    Object.keys(validations).forEach((field) => {
      const validationFn = validations[field as keyof typeof validations];
      const value = adminData[field as keyof AdminProfile];
      let error = "";
      if (typeof validationFn === "function") {
        // Ensure value is always a string for validation
        error = validationFn(
          typeof value === "string"
            ? value
            : value === undefined || value === null
            ? ""
            : String(value)
        );
      }
      if (error) {
        newErrors[field] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  // Fixed: Enhanced form submission with proper UID handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAllFields()) {
      showError("Please fix the validation errors");
      return;
    }

    if (!currentUser) {
      showError("No authenticated user found. Please log in again.");
      return;
    }

    setLoading(true);
    try {
      console.log("🔍 Checking admin document existence...");

      // First check by email
      const emailQuery = query(
        collection(db, "admin"),
        where("email", "==", adminData.email)
      );
      const emailQuerySnapshot = await getDocs(emailQuery);

      let docRef;
      let existingDocId = null;

      // Check for existing documents
      if (!emailQuerySnapshot.empty) {
        existingDocId = emailQuerySnapshot.docs[0].id;
        console.log(
          "📝 Found existing admin document by email with ID:",
          existingDocId
        );

        // If document exists but has different ID, use the existing one
        if (existingDocId !== currentUser.uid) {
          console.log(
            "⚠️ Document exists with different ID. Using existing document."
          );
          docRef = doc(db, "admin", existingDocId);
        } else {
          docRef = doc(db, "admin", currentUser.uid);
        }
      } else {
        // Check by UID if not found by email
        const uidDoc = await getDoc(doc(db, "admin", currentUser.uid));
        if (uidDoc.exists()) {
          console.log("📝 Found admin document by UID");
          docRef = doc(db, "admin", currentUser.uid);
        } else {
          console.log("📝 No existing document found, using current UID");
          docRef = doc(db, "admin", currentUser.uid);
        }
      }

      // Handle image upload if a new image is selected
      let profileImageUrl = adminData.profileImageUrl;
      if (profileImage) {
        console.log("📤 Starting image upload...");
        setUploadProgress(25);

        const storageRef = ref(
          storage,
          `admin-profiles/${docRef.id}-${Date.now()}`
        );

        try {
          await uploadBytes(storageRef, profileImage);
          setUploadProgress(75);
          profileImageUrl = await getDownloadURL(storageRef);
          console.log("✅ Image uploaded successfully");
          setUploadProgress(90);
        } catch (uploadError) {
          console.error("❌ Image upload failed:", uploadError);
          throw new Error("Failed to upload image. Please try again.");
        }
      }

      // Prepare update data
      const updateData = {
        uid: docRef.id, // Use the document ID consistently
        email: adminData.email,
        username: adminData.username.trim(),
        firstName: adminData.firstName.trim(),
        lastName: adminData.lastName.trim(),
        phoneNumber: adminData.phoneNumber?.trim() || "",
        address: adminData.address?.trim() || "",
        profileImageUrl: profileImageUrl,
        adminRole: adminData.adminRole,
        updatedAt: new Date().toISOString(),
        isFirstLogin: false,
        temporaryPassword: false,
      };

      // Update the document
      console.log("📝 Updating admin document:", docRef.id);
      await setDoc(docRef, updateData, { merge: true });

      // If we found a duplicate document with different ID, delete it
      if (existingDocId && existingDocId !== currentUser.uid) {
        const duplicateDoc = doc(db, "admin", currentUser.uid);
        await deleteDoc(duplicateDoc);
        console.log("🗑️ Removed duplicate document");
      }

      // Update Auth profile
      console.log("👤 Updating auth profile...");
      await updateProfile(currentUser, {
        displayName: adminData.username.trim(),
        photoURL: profileImageUrl,
      });

      // Update local state
      setAdminData((prev) => ({
        ...prev,
        ...updateData,
      }));

      setUploadProgress(100);
      showSuccess("Profile updated successfully! 🎉");
      setEditMode(false);
      setProfileImage(null);
      console.log("✅ Profile update completed successfully");
    } catch (error: any) {
      console.error("❌ Profile update failed:", error);
      showError(error.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Function to get input class based on validation state
  const getInputClass = (
    field: keyof AdminProfile,
    disabled: boolean = false
  ) => {
    if (disabled) return styles.inputDisabled;
    if (editMode && errors[field]) return styles.inputError;
    return styles.inputBase;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Success Toast */}
      {success && (
        <div className={styles.successToast}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
            <button onClick={() => setSuccess("")}>
              <X className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className={styles.errorToast}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <X className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Header Section */}
      <div className={styles.header}>
        <div className="flex flex-col lg:flex-row lg:items-center text-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                Profile Settings
              </h1>
              <p className="text-gray-600 text-lg">
                Manage your account settings and personal information
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.profileGrid}>
        {/* Enhanced Left Column - Profile Card */}
        <div className="space-y-6">
          {/* Main Profile Card */}
          <div className={`${styles.card} p-8`}>
            <div className="flex flex-col items-center">
              {/* Enhanced Profile Image */}
              <div className="relative group mb-8">
                <div className="w-[240px] h-[240px] rounded-full overflow-hidden border-4 border-white shadow-2xl group-hover:shadow-3xl transition-all duration-500 ring-4 ring-blue-100">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt="Profile"
                      width={240}
                      height={240}
                      className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 flex items-center justify-center">
                      <UserIcon className="w-24 h-24 text-blue-400" />
                    </div>
                  )}
                </div>
                {editMode && (
                  <label
                    htmlFor="profile-photo"
                    className="absolute bottom-4 right-4 p-4 bg-white rounded-full shadow-xl cursor-pointer hover:bg-blue-50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl ring-2 ring-blue-100 hover:ring-blue-200"
                  >
                    <Camera className="w-6 h-6 text-blue-600" />
                  </label>
                )}
                <input
                  type="file"
                  id="profile-photo"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={!editMode}
                />
              </div>

              {/* Enhanced Profile Info */}
              <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">
                {adminData.firstName && adminData.lastName
                  ? `${adminData.firstName} ${adminData.lastName}`
                  : adminData.username || "Admin User"}
              </h2>
              <p className="text-gray-500 flex items-center gap-2 mb-2 text-lg">
                <Mail className="w-5 h-5 text-blue-500" />
                {adminData.email}
              </p>
              <p className="text-gray-500 flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-500" />
                {adminData.adminRole}
              </p>
              {adminData.address && (
                <p className="text-gray-500 flex items-center gap-2 mb-6">
                  <MapPin className="w-4 h-4 text-green-500" />
                  {adminData.address}
                </p>
              )}
              {adminData.updatedAt && (
                <p className="text-gray-400 text-sm flex items-center gap-2 mb-6">
                  <Calendar className="w-4 h-4" />
                  Last updated:{" "}
                  {(() => {
                    try {
                      const date = new Date(adminData.updatedAt);
                      if (isNaN(date.getTime())) {
                        return "Invalid date";
                      }
                      return format(date, "MMM dd, yyyy");
                    } catch (error) {
                      console.error("Date formatting error:", error);
                      return "Invalid date";
                    }
                  })()}
                </p>
              )}

              {/* Enhanced Status Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-sm font-semibold mb-8 border border-green-200">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-3 animate-pulse shadow-lg" />
                Online & Active
              </div>

              {/* First Login Alert */}
              {adminData.isFirstLogin && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-4 border border-orange-200">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  First Login: Please update your profile and password.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Right Column - Form */}
        <div className={`${styles.card} p-8`}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Edit3 className="w-6 h-6 text-blue-600" />
              Profile Information
            </h3>
            <button
              onClick={() => {
                setEditMode(!editMode);
                if (!editMode) {
                  // Clear errors when entering edit mode
                  setErrors({});
                }
              }}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-all duration-300 flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              {editMode ? "Cancel Edit" : "Edit Profile"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Progress Bar */}
            {loading && uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={getInputClass("username", !editMode)}
                  value={adminData.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                  disabled={!editMode}
                  required
                  placeholder="Enter username"
                />
                {errors.username && (
                  <p className="text-sm text-red-500 mt-1">{errors.username}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  className={getInputClass("email", true)}
                  value={adminData.email}
                  disabled
                />
                <p className="text-xs text-gray-500">
                  Email cannot be modified
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={getInputClass("firstName", !editMode)}
                  value={adminData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  disabled={!editMode}
                  required
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={getInputClass("lastName", !editMode)}
                  value={adminData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  disabled={!editMode}
                  required
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admin Role
                </label>
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full ${
                    adminData.adminRole === "superAdmin"
                      ? "bg-purple-100 text-purple-800 border-purple-200"
                      : adminData.adminRole === "manageUsers"
                      ? "bg-blue-100 text-blue-800 border-blue-200"
                      : adminData.adminRole === "support"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-800 border-gray-200"
                  } border`}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="font-medium">
                    {adminData.adminRole || "No Role Assigned"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Your role determines your access permissions in the system
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className={getInputClass("phoneNumber", !editMode)}
                  value={adminData.phoneNumber || ""}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  disabled={!editMode}
                  placeholder="+1234567890"
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={adminData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className={getInputClass("address", !editMode)}
                disabled={!editMode}
                rows={3}
                placeholder="Enter your full address"
              />
              {errors.address && (
                <p className="text-sm text-red-500 mt-1">{errors.address}</p>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              Security & Privacy
            </h3>
            <div className="space-y-3 shadow-lg">
              <a
                href="/auth/forgotPassword"
                className="w-full flex items-center shadow-lg justify-between p-4 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-all duration-300 group"
                onClick={(e) => {
                  e.preventDefault();
                  if (auth.currentUser) {
                    window.location.href = "/auth/changePassword";
                  } else {
                    window.location.href = "/auth/login";
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-blue-500 group-hover:text-blue-600" />
                  <span className="text-gray-700 font-medium">
                    Change Password
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all duration-300" />
              </a>
            </div>

            {editMode && (
              <div className="flex justify-end gap-4 pt-8 border-t border-gray-200 ">
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setErrors({});
                    setProfileImage(null);
                    if (previewImage && !adminData.profileImageUrl) {
                      setPreviewImage(null);
                    } else if (adminData.profileImageUrl) {
                      setPreviewImage(adminData.profileImageUrl);
                    }
                  }}
                  className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.button}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
