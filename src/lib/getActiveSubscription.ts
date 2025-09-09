// lib/getActiveSubscription.ts
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase/config";

export const getActiveSubscription = async (userId: string) => {
  const now = Timestamp.now();
  const q = query(
    collection(db, "subscriptions"),
    where("userId", "==", userId),
    where("startDate", "<=", now),
    where("endDate", ">=", now)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as {
    id: string;
    name: string;
    price: number;
  };
};
