"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/app/firebase/config";
import {
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

const Logout = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Function to update logout time in userLogs collection
  const updateUserLogout = async (uid: string) => {
    try {
      // Query userLogs collection for this user
      const userLogsQuery = query(
        collection(db, "userLogs"),
        where("uid", "==", uid)
      );
      const userLogsSnapshot = await getDocs(userLogsQuery);

      if (!userLogsSnapshot.empty) {
        const userLogDoc = userLogsSnapshot.docs[0];
        const userLogData = userLogDoc.data();
        const loginLogs = userLogData.loginLogs || [];

        if (loginLogs.length > 0) {
          // Find the most recent login entry with null logout
          const updatedLogs = [...loginLogs];
          const lastActiveIndex = updatedLogs.findIndex(
            (log) => log.lastLogout === null
          );

          if (lastActiveIndex !== -1) {
            // Update the logout time for the active session
            updatedLogs[lastActiveIndex] = {
              ...updatedLogs[lastActiveIndex],
              lastLogout: new Date().toISOString(),
            };

            // Update the userLogs document
            await updateDoc(userLogDoc.ref, {
              loginLogs: updatedLogs,
              updatedAt: new Date(),
            });

            console.log("Successfully updated logout time in userLogs");
          } else {
            console.warn("No active session found to logout");
          }
        }
      } else {
        console.warn("No userLogs document found for user:", uid);
      }

      // Also update admin collection with lastLogout (for backward compatibility)
      const adminQuery = query(
        collection(db, "admin"),
        where("uid", "==", uid)
      );
      const adminSnapshot = await getDocs(adminQuery);

      if (!adminSnapshot.empty) {
        const adminDoc = adminSnapshot.docs[0];
        await updateDoc(adminDoc.ref, {
          lastLogout: new Date(),
        });
        console.log("Updated lastLogout in admin collection");
      }
    } catch (error) {
      console.log("Error updating logout time:", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    const user = auth.currentUser;
    if (!user) {
      console.warn("No user found to logout");
      return;
    }

    setIsLoggingOut(true);

    try {
      console.log("Starting logout process for user:", user.uid);

      // Update logout time in userLogs collection
      await updateUserLogout(user.uid);

      // Clear localStorage
      localStorage.removeItem("adminRole");
      localStorage.removeItem("adminUid");
      localStorage.removeItem("isAuthenticated");

      document.cookie = "adminData=; path=/; max-age=0;";

      // Sign out from Firebase Auth
      await signOut(auth);

      console.log("Logout completed successfully");

      // Close the dialog
      setIsOpen(false);

      // Redirect to login page
      router.push("/auth/signin");
    } catch (error) {
      console.log("Logout error:", error);
      // Still sign out even if Firestore update fails
      try {
        await signOut(auth);
        localStorage.clear();
        router.push("/auth/signin");
      } catch (signOutError) {
        console.log("Critical error during logout:", signOutError);
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Logout
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to log out? You will be redirected to the
            login page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoggingOut}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default Logout;
