// functions/src/users/ensureUserProfile.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db, FieldValueAdmin, getUserProfilePath } from '../utils/firebaseAdmin';
import { UserProfile, UserRole, EnsureUserProfileCallableResult } from '../types'; // Keep UserRole import

/**
 * Callable Cloud Function to ensure a user profile exists and retrieve it.
 * If the profile does not exist, it creates a new one with a 'customer' role
 * and initializes all required fields. If it exists, it updates `lastLoginAt`.
 *
 * This function should be called by the client after a successful authentication.
 *
 * @param {CallableRequest<void>} request - The request object.
 * @returns {Promise<EnsureUserProfileCallableResult>} - The user profile data (with Timestamps converted to ISO strings).
 */
export const ensureUserProfile = onCall(async (request: CallableRequest<void>): Promise<EnsureUserProfileCallableResult> => {
  console.log('ensureUserProfile function called.'); // Log start of function

  if (!request.auth) {
    console.error('ensureUserProfile: Unauthenticated request.'); // Log error
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const userId = request.auth.uid;
  const userEmail = request.auth.token.email;
  const displayName = request.auth.token.name || 'New User';
  const photoURL = request.auth.token.picture || null;

  console.log(`ensureUserProfile: Processing user ID: ${userId}`);
  console.log(`   Auth Token Data: email=${userEmail}, displayName=${displayName}, photoURL=${photoURL}`);

  // IMPORTANT: Ensure this appId matches the one you expect in your Firestore structure
  // It's hardcoded here as per your provided file, ensure it's correct for your project.
  const appId = "1:514813479729:web:4a0ec92280f130e8b63e10"; 
  if (!appId) {
      // This check might be redundant if appId is hardcoded, but good for dynamic env vars.
      throw new HttpsError('internal', 'FIREBASE_APP_ID environment variable is not set or is empty.');
  }

  const userProfileRef = db.doc(getUserProfilePath(appId, userId));
  console.log(`   Firestore document full path: ${userProfileRef.path}`); // Log the exact path


  try {
    const docSnap = await userProfileRef.get();
    console.log(`   Document exists at path: ${docSnap.exists}`);

    if (docSnap.exists) {
      // Profile exists, update lastLoginAt
      await userProfileRef.update({
        lastLoginAt: FieldValueAdmin.serverTimestamp(),
      });
      console.log(`Updated lastLoginAt for user: ${userId}`);

      const updatedProfileData = (await userProfileRef.get()).data() as UserProfile;
      console.log('Existing profile data retrieved from Firestore:', updatedProfileData);

      // Convert Firestore Timestamps to ISO strings for client consumption (FIX HERE)
      return {
        uid: updatedProfileData.uid,
        email: updatedProfileData.email,
        displayName: updatedProfileData.displayName,
        photoURL: updatedProfileData.photoURL,
        phoneNumber: updatedProfileData.phoneNumber || null,
        createdAt: updatedProfileData.createdAt.toDate().toISOString(),
        lastLoginAt: updatedProfileData.lastLoginAt.toDate().toISOString(),
        updatedAt: updatedProfileData.updatedAt ? updatedProfileData.updatedAt.toDate().toISOString() : undefined,
        role: updatedProfileData.role,
        ownedSalons: updatedProfileData.ownedSalons || [],
        associatedSalons: updatedProfileData.associatedSalons || [],
        favoriteSalons: updatedProfileData.favoriteSalons || [],
        address: updatedProfileData.address || null,
      };

    } else {
      // Profile does not exist, create a new one
      const newUserProfile: UserProfile = {
        uid: userId,
        displayName: displayName,
        email: userEmail || null,
        photoURL: photoURL,
        phoneNumber: null, // Initialize as null
        createdAt: FieldValueAdmin.serverTimestamp() as any, // Will be Firestore Timestamp
        lastLoginAt: FieldValueAdmin.serverTimestamp() as any, // Will be Firestore Timestamp
        role: 'customer' as UserRole, // Explicitly use UserRole here
        ownedSalons: [], // Initialize as empty array
        associatedSalons: [], // Initialize as empty array
        favoriteSalons: [], // Initialize as empty array
        address: null, // Initialize as null
      };

      console.log('Attempting to create new profile with data:', newUserProfile);
      await userProfileRef.set(newUserProfile);
      console.log(`Successfully created new profile for user: ${userId} at path: ${userProfileRef.path}`);

      // Return the newly created profile data with temporary ISO strings for timestamps
      // These will be replaced by actual server timestamps once written to Firestore
      return {
        uid: newUserProfile.uid,
        displayName: newUserProfile.displayName,
        email: newUserProfile.email,
        photoURL: newUserProfile.photoURL,
        phoneNumber: newUserProfile.phoneNumber,
        createdAt: new Date().toISOString(), // Temporary client-side timestamp
        lastLoginAt: new Date().toISOString(), // Temporary client-side timestamp
        role: newUserProfile.role,
        ownedSalons: newUserProfile.ownedSalons,
        associatedSalons: newUserProfile.associatedSalons,
        favoriteSalons: newUserProfile.favoriteSalons,
        address: newUserProfile.address,
      };
    }
  } catch (error: any) {
    console.error("Error in ensureUserProfile Cloud Function:", error);
    throw new HttpsError('internal', 'Failed to set up user profile.', error.message);
  }
});