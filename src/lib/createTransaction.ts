import {
  collection,
  addDoc,
  Timestamp,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/app/firebase/config";

export async function createTransaction(
  userId: string,
  plan: {
    id: string;
    planType: string;
    price: number;
    list: number;
    rent: number;
    duration: number;
  },
  paymentMethod: string,
  paymentProofUrl?: string
) {
  try {
    // Create timestamps with error handling
    const now = Timestamp.now();
    if (!now) {
      throw new Error("Failed to create timestamp");
    }

    const endDate = Timestamp.fromMillis(
      now.toMillis() + plan.duration * 24 * 60 * 60 * 1000
    );
    if (!endDate) {
      throw new Error("Failed to create end date timestamp");
    }

    const data = {
      transactionId: "",
      userId,
      planId: plan.id,
      planName: plan.planType,
      price: plan.price,
      list: plan.list,
      duration: plan.duration,
      amount: plan.price,
      paymentMethod,
      paymentProofUrl: paymentProofUrl || "",
      status: "pending", // Changed to pending initially
      startDate: now,
      endDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Create transaction document
    const docRef = await addDoc(collection(db, "transactions"), data);
    await updateDoc(docRef, { transactionId: docRef.id });

    // Create subscription document
    await addDoc(collection(db, "subscription"), {
      userId,
      planId: plan.id,
      transactionId: docRef.id,
      startDate: now,
      endDate,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    // Update user's active plan
    await updateDoc(doc(db, "users", userId), {
      activePlanId: plan.id,
      activePlanName: plan.planType,
      subscriptionStart: now,
      subscriptionEnd: endDate,
      lastTransactionId: docRef.id,
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
}
