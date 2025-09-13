    import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  // Add your Firebase configuration here
  // This should match your existing Firebase config
};

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
