import { NextResponse } from "next/server";
import { db } from "@/app/firebase/config";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: "No UID provided" }, { status: 400 });

    const adminQuery = query(collection(db, "admin"), where("uid", "==", uid));
    const adminSnapshot = await getDocs(adminQuery);

    if (!adminSnapshot.empty) {
      const adminDoc = adminSnapshot.docs[0];
      await updateDoc(adminDoc.ref, {
        lastLogout: new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout beacon error:", err);
    return NextResponse.json({ error: "Failed to update logout" }, { status: 500 });
  }
}
