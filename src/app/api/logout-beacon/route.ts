import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase if not already initialized
let db: any;

try {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  db = getFirestore();
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase is initialized
    if (!db) {
      console.error('Firestore not initialized');
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    const data = await request.json();
    const { uid, timestamp, action } = data;

    if (!uid) {
      return NextResponse.json({ error: 'No UID provided' }, { status: 400 });
    }

    console.log('Received logout beacon for user:', uid);

    // Update logout time in userLogs collection
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
        const lastActiveIndex = updatedLogs.findIndex(log => log.lastLogout === null);
        
        if (lastActiveIndex !== -1) {
          // Update the logout time for the active session
          updatedLogs[lastActiveIndex] = {
            ...updatedLogs[lastActiveIndex],
            lastLogout: timestamp,
          };

          // Update the userLogs document
          await updateDoc(userLogDoc.ref, {
            loginLogs: updatedLogs,
            updatedAt: new Date(timestamp),
          });

          console.log('Successfully updated logout time via beacon');
        }
      }
    }

    // Also update admin collection
    const adminQuery = query(
      collection(db, "admin"),
      where("uid", "==", uid)
    );
    const adminSnapshot = await getDocs(adminQuery);

    if (!adminSnapshot.empty) {
      const adminDoc = adminSnapshot.docs[0];
      await updateDoc(adminDoc.ref, {
        lastLogout: new Date(timestamp),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in logout beacon:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Required for Vercel static generation
export async function GET() {
  return NextResponse.json({ 
    status: 'Logout beacon endpoint',
    method: 'POST required' 
  });
}