// lib/fetchTransactions.ts
import { getDocs, collection, getDoc, doc } from "firebase/firestore";
import { db } from "@/app/firebase/config"; // Adjust the import path as necessary

export const fetchTransactions = async () => {
  const snapshot = await getDocs(collection(db, "transactions"));

  const transactions = await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const userRef = doc(db, "users", data.userId);
      const userSnap = await getDoc(userRef);

      const userData = userSnap.exists() ? userSnap.data() : {};
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate().toISOString(),
        userName: userData.name || "Unknown",
        userEmail: userData.email || "N/A",
      };
    })
  );

  return transactions;
};
