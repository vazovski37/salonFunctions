// functions/src/users/getAuthUserProfile.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db, getUserProfilePath } from '../utils/firebaseAdmin';
import { UserProfile } from '../types/index';

/**
 * Callable Cloud Function to fetch a user's profile.
 * Can be called by any authenticated user to fetch their own profile.
 * Admins can potentially fetch any user's profile by providing a uid.
 *
 * @param {CallableRequest<{ uid?: string }>} request - The request object.
 * If uid is provided, attempts to fetch that user's profile (requires admin).
 * If uid is not provided, fetches the calling user's profile.
 * @returns {Promise<UserProfile | null>} - The user profile data or null if not found.
 */
export const getAuthUserProfile = onCall(async (request: CallableRequest<{ uid?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerUid = request.auth.uid;
  const targetUid = request.data.uid || callerUid; // Default to caller's UID

  const appId = process.env.FIREBASE_APP_ID || 'default-app-id';

  // Security check: Only allow users to fetch their own profile, or if an admin requests another's profile.
  if (callerUid !== targetUid) {
    // Check if the caller is an admin
    const callerProfileRef = db.doc(getUserProfilePath(appId, callerUid));
    const callerProfileSnap = await callerProfileRef.get();
    if (!callerProfileSnap.exists || callerProfileSnap.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'You do not have permission to fetch other user profiles.');
    }
  }

  try {
    const userProfileRef = db.doc(getUserProfilePath(appId, targetUid));
    const docSnap = await userProfileRef.get();

    if (docSnap.exists) {
      const profileData = docSnap.data() as UserProfile;
      // Convert Firestore Timestamp to a serializable format (e.g., ISO string)
      // Callable functions automatically handle Firestore Timestamps, but explicitly
      // returning a plain object ensures consistency and avoids potential issues
      // if not all clients correctly parse Timestamps.
      return {
        ...profileData,
        createdAt: profileData.createdAt ? (profileData.createdAt as any).toDate().toISOString() : new Date().toISOString(),
      };
    }
    return null;
  } catch (error: any) {
    console.error("Error fetching user profile in Cloud Function:", error);
    throw new HttpsError('internal', 'Failed to fetch user profile.', error.message);
  }
});