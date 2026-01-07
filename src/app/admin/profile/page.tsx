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
    console.log("❌ Error creating initial admin document:", error);
    throw error;
  }
};

// Fetch admin data by UID first, then by email if not found
// Helper: fetchAdminData
// Attempts to load admin data first by UID, and if that fails falls back to querying by email.
// This is useful when accounts may have been created under a different UID or migrated.
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

// Simple local style tokens to keep JSX tidy. These are tailwind utility strings
// reused across multiple sections of the component for consistent visuals.
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
  // `adminData` holds the editable profile state mirrored to/from Firestore.

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

  // `profileImage` and `previewImage` track a file selected by the user and a local preview URL.
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

  // UX helpers: showError / showSuccess

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(""), 5000);
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 5000);
  };

  // Auth listener & initial data load
  // This `useEffect` subscribes to Firebase Auth state and then attempts to
  // - load an existing admin document (by UID or email)
  // - create an initial document if none exists
  // - handle UID mismatches by migrating/copying and deleting the old doc
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

          // If we successfully obtained an admin document (existing or newly created)
          // map it into our `adminData` state used by the form.
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

            // If the admin doc provides a profile image URL, show it as the preview
            if (adminDoc.profileImageUrl) {
              setPreviewImage(adminDoc.profileImageUrl);
            }
          }

          console.log("✅ Admin data loaded successfully");
        } catch (error) {
          console.log("❌ Failed to fetch/create admin data:", error);
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

  // Image selection handler
  // Validates the selected file (size/type) and creates a local preview URL
  // The actual upload happens later only when the user saves changes.
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

  // Field validation rules used by validateAllFields and live validation in edit mode.
  // Each function returns an empty string when valid or an error message when invalid.
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

  // Centralized input change handler
  // - updates `adminData` for the changed field
  // - runs the per-field validation when in `editMode` so errors show live
  const handleInputChange = (field: keyof AdminProfile, value: string) => {
    setAdminData((prev) => ({ ...prev, [field]: value }));

    // Only validate if we have a validation function and we're in edit mode
    if (editMode && validations[field as keyof typeof validations]) {
      const validationFn = validations[field as keyof typeof validations];
      const error = validationFn ? validationFn(value) : "";
      setErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  // Full-form validation
  // Iterates over `validations` and collects errors; returns `true` when the form is valid.
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

  // Form submission flow (Save profile)
  // Steps:
  // 1. Validate all fields
  // 2. Determine the correct Firestore document to update (by email or UID)
  // 3. Upload profile image to Storage (if provided)
  // 4. Write merged data to Firestore and update the Firebase Auth profile
  // 5. Clean up and show success / error messages
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

      // Image upload section:
      // If the user selected a new file, upload it to Storage and obtain a public URL.
      // The upload progress indicators are updated to give feedback to the user.
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
          console.log("❌ Image upload failed:", uploadError);
          throw new Error("Failed to upload image. Please try again.");
        }
      }

      // Prepare the object we'll persist into the `admin` document.
      // Keep the `uid` and `email` consistent with Firestore document ID and Auth user.
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

      // Persist the changes to Firestore (merge updates to avoid clobbering unrelated fields)
      console.log("📝 Updating admin document:", docRef.id);
      await setDoc(docRef, updateData, { merge: true });

      // If we found a duplicate document with different ID, delete it
      if (existingDocId && existingDocId !== currentUser.uid) {
        const duplicateDoc = doc(db, "admin", currentUser.uid);
        await deleteDoc(duplicateDoc);
        console.log("🗑️ Removed duplicate document");
      }

      // Mirror important profile fields into the Firebase Auth user object so other
      // parts of the app that rely on `auth.currentUser.displayName` / `photoURL`
      // are up-to-date.
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
      console.log("❌ Profile update failed:", error);
      showError(error.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Visual helper: returns the appropriate input CSS classes based on state
  // - `disabled` (read-only inputs)
  // - `editMode` + `errors[field]` shows an error style
  const getInputClass = (
    field: keyof AdminProfile,
    disabled: boolean = false
  ) => {
    if (disabled) return styles.inputDisabled;
    if (editMode && errors[field]) return styles.inputError;
    return styles.inputBase;
  };

  // While we're loading initial profile data from Firebase, show a centered loader.
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
      {/* Success Toast - briefly shown when an operation completes successfully */}
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

      {/* Error Toast - shows user-facing error messages and dismiss button */}
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

      {/* Header Section - page title and short description */}
      <div className={styles.header}>
        <div className="flex flex-col items-center text-center justify-center gap-4">
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

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">
        {/* Left Column - Profile Card (visual read-only summary) */}
        <div className="lg:col-span-1">
          {/* Main Profile Card */}
          <div className={`${styles.card} p-8 sticky top-20 h-fit`}>
            <div className="flex flex-col items-center">
              {/* Profile Image block */}
              {/* - Shows current previewImage or a placeholder icon
                  - When `editMode` is enabled an upload control is exposed */}
              <div className="relative group mb-6">
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

              {/* Profile information summary (name / username / contact details) */}
              <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center break-words">
                {adminData.firstName && adminData.lastName
                  ? `${adminData.firstName} ${adminData.lastName}`
                  : adminData.username || "Admin User"}
              </h2>
              <p className="text-sm text-gray-600 text-center break-words mb-4">
                @{adminData.username}
              </p>

              <div className="w-full space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="break-all">{adminData.email}</span>
                </div>
                {adminData.phoneNumber && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>{adminData.phoneNumber}</span>
                  </div>
                )}
                {adminData.address && (
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="break-words">{adminData.address}</span>
                  </div>
                )}
              </div>

              {/* Role Badge - visually indicates the admin role */}
              <div
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4 border ${
                  adminData.adminRole === "superAdmin"
                    ? "bg-purple-100 text-purple-800 border-purple-200"
                    : adminData.adminRole === "manageUsers"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : adminData.adminRole === "support"
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-gray-100 text-gray-800 border-gray-200"
                }`}
              >
                <Shield className="w-4 h-4 mr-1.5" />
                {adminData.adminRole || "No Role"}
              </div>

              {/* Status Badge - simple online indicator (UI only) */}
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs font-semibold mb-4 border border-green-200">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 mr-2 animate-pulse" />
                Online & Active
              </div>

              {/* First Login Alert - prompts first-time users to complete their profile */}
              {adminData.isFirstLogin && (
                <div className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-100 text-orange-700 text-xs font-medium border border-orange-200 mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>First login - please update profile</span>
                </div>
              )}

              {/* Last Updated - displays a human friendly updatedAt date when available */}
              {adminData.updatedAt && (
                <p className="text-gray-400 text-xs mt-4 pt-4 border-t border-gray-200 w-full text-center">
                  Updated:{" "}
                  {(() => {
                    try {
                      const date = new Date(adminData.updatedAt);
                      if (isNaN(date.getTime())) {
                        return "Invalid date";
                      }
                      return format(date, "MMM dd, yyyy");
                    } catch (error) {
                      console.log("Date formatting error:", error);
                      return "Invalid date";
                    }
                  })()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Editable form for profile fields */}
        <div className={`${styles.card} p-8`}>
          <div className="flex items-center justify-between mb-8">
            {/* Top bar: form title and edit toggle
                - Toggle switches `editMode` and clears errors when entering edit mode */}
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

          {/* Main editable form - bound to `adminData` and submits through `handleSubmit` */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Optional Upload Progress Bar: visible while an image is being uploaded */}
            {loading && uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            {/* Form Fields: username, email (readonly), name, role, phone, address */}
            <div className="space-y-5">
              {/* Username Field - required and editable when `editMode` is true */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
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

              {/* Email Field - read-only: system-managed and cannot be modified here */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
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

              {/* First & Last Name - required fields used to display full name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
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
                    placeholder="First name"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
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
                    placeholder="Last name"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Role & Phone - role is read-only here, phone is editable */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Admin Role
                  </label>
                  <div
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                      adminData.adminRole === "superAdmin"
                        ? "bg-purple-100 text-purple-800"
                        : adminData.adminRole === "manageUsers"
                        ? "bg-blue-100 text-blue-800"
                        : adminData.adminRole === "support"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {adminData.adminRole || "No Role"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
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

              {/* Address Field - optional, limited length */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
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
            </div>

            {/* Security Section - quick link to change password (navigates to auth page) */}
            <div className="border-t-2 border-gray-200 pt-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                Security & Privacy
              </h4>
              <a
                href="/auth/changePassword"
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 group"
                onClick={(e) => {
                  e.preventDefault();
                  if (auth.currentUser) {
                    window.location.href = "/auth/changePassword";
                  } else {
                    window.location.href = "/auth/signin";
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-blue-500 group-hover:text-blue-600" />
                  <span className="text-gray-700 font-medium text-sm">
                    Change Password
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all duration-300" />
              </a>
            </div>

            {/* Form Actions - Cancel and Save buttons appear only in edit mode */}
            {editMode && (
              <div className="flex justify-end gap-4 pt-8 border-t-2 border-gray-200">
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
                  className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.button} flex items-center gap-2`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
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
