// functions/src/users/searchUsers.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db, assertAdmin } from '../utils/firebaseAdmin'; // Only import what's needed
import { UserProfile } from '../types/index'; // Import UserProfile type

/**
 * Callable Cloud Function to search for user profiles by email.
 * Requires admin privileges.
 *
 * This function performs a collection group query on all 'profile' subcollections.
 * It searches for emails that start with the provided searchTerm.
 *
 * IMPORTANT: For this function to work correctly and efficiently, you MUST create
 * a Firestore index on the 'profile' collection group for the 'email' field.
 * Firebase will provide a link in the console if the index is missing when you first
 * try to run this query.
 *
 * @param {CallableRequest<{ searchTerm: string }>} request - The request object containing the search term.
 * @returns {Promise<Partial<UserProfile>[]>} - A list of matching user profiles with limited fields.
 */
export const searchUsersByEmail = onCall(async (request: CallableRequest<{ searchTerm: string }>) => {
  const { searchTerm } = request.data;
  const appId = process.env.FIREBASE_APP_ID || 'default-app-id';

  // Ensure the caller is an admin
  await assertAdmin(request, appId);

  // Validate search term: require at least 2 characters for a meaningful search
  if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.length < 2) {
    return []; // Return empty array for invalid or short search terms
  }

  try {
    // Perform a collection group query on all 'profile' subcollections
    // The path for user profiles is `artifacts/{appId}/users/{userId}/profile/data`.
    // We are querying the `profile` subcollection specifically.
    const profilesRef = db.collectionGroup('profile');
    
    // Construct the query:
    // 1. Filter by email using a range query for prefix matching.
    //    `searchTerm` (inclusive start) to `searchTerm + '\uf8ff'` (inclusive end)
    //    '\uf8ff' is a very high unicode character that ensures all strings starting
    //    with `searchTerm` are included.
    // 2. Limit the number of results for performance.
    const q = profilesRef
      .where('email', '>=', searchTerm)
      .where('email', '<=', searchTerm + '\uf8ff')
      .limit(10); // Limit results to 10 for suggestions

    const querySnapshot = await q.get();
    const users: Partial<UserProfile>[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserProfile;
      // Only return necessary fields for suggestion to minimize data transfer
      users.push({
        uid: data.uid,
        email: data.email,
        displayName: data.displayName || data.email, // Fallback to email if no display name
      });
    });

    return users;
  } catch (error: any) {
    console.error("Error searching users by email in Cloud Function:", error);
    // Re-throw as an HttpsError to be properly handled on the client-side
    throw new HttpsError('internal', 'Failed to search users.', error.message);
  }
});