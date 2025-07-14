// functions/src/users/getAllUserProfiles.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db, assertAdmin } from '../utils/firebaseAdmin';
import { UserProfile } from '../types/index';

/**
 * Callable Cloud Function to fetch all user profiles.
 * Requires admin privileges.
 *
 * @param {CallableRequest<void>} request - The request object.
 * @returns {Promise<UserProfile[]>} - A list of all user profiles.
 */
export const getAllUserProfiles = onCall(async (request: CallableRequest<void>) => {
  const appId = "1:514813479729:web:4a0ec92280f130e8b63e10";

  // Ensure the caller is an admin
  await assertAdmin(request, appId);

  try {
    // Perform a collection group query on all 'profile' subcollections
    const profilesCollectionGroup = db.collectionGroup('profile');
    const querySnapshot = await profilesCollectionGroup.get();

    const profiles: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserProfile;
      // Convert Firestore Timestamp to ISO string for consistent client-side parsing
      profiles.push({
        ...data,
        createdAt: data.createdAt ? (data.createdAt as any).toDate().toISOString() : new Date().toISOString(),
        // Ensure other date fields are also converted if they exist
      });
    });

    return profiles;
  } catch (error: any) {
    console.error("Error fetching all user profiles in Cloud Function:", error);
    throw new HttpsError('internal', 'Failed to fetch all user profiles.', error.message);
  }
});