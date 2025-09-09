// lib/recordTransaction.ts
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/app/firebase/config";

export const recordTransaction = async ({
  userId,
  item,
  subscription,
}: {
  userId: string;
  item: { id: string; name: string; price: number };
  subscription: { id: string; name: string; price: number };
}) => {
  const transactionId = `${userId}_${item.id}_${Date.now()}`;
  const transactionRef = doc(db, "transactions", transactionId);

  await setDoc(transactionRef, {
    userId,
    itemId: item.id,
    itemName: item.name,
    rentedPrice: item.price,
    subscriptionPlanId: subscription.id,
    subscriptionPlanName: subscription.name,
    subscriptionPrice: subscription.price,
    createdAt: Timestamp.now(),
  });
};
