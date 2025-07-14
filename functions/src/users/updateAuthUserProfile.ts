// functions/src/users/updateAuthUserProfile.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db, FieldValueAdmin, getUserProfilePath, authAdmin } from '../utils/firebaseAdmin';
import { UserProfile, UserRole } from '../types/index'; // Keep UserRole import

/**
 * Callable Cloud Function to update a user's profile.
 * Users can update their own profile. Admins can update any user's profile and their role.
 *
 * @param {CallableRequest<Partial<UserProfile> & { targetUid?: string }>} request - The request object containing updates.
 * 'targetUid' can be provided by admins to specify which user to update.
 * 'role' can only be updated by an admin.
 */
export const updateAuthUserProfile = onCall(async (request: CallableRequest<Partial<UserProfile> & { targetUid?: string }>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerUid = request.auth.uid;
  const { targetUid, role, ...updates } = request.data;
  const uidToUpdate = targetUid || callerUid; // Default to caller's UID

  const appId = process.env.FIREBASE_APP_ID || 'default-app-id';

  const userProfileRef = db.doc(getUserProfilePath(appId, uidToUpdate));
  const userProfileSnap = await userProfileRef.get();

  if (!userProfileSnap.exists) {
    throw new HttpsError('not-found', 'Target user profile not found.');
  }

  const currentProfile = userProfileSnap.data() as UserProfile;

  // Validate permissions for updating role or another user's profile
  if (callerUid !== uidToUpdate) {
    // Caller is trying to update another user's profile
    const callerProfileRef = db.doc(getUserProfilePath(appId, callerUid));
    const callerProfileSnap = await callerProfileRef.get();
    if (!callerProfileSnap.exists || (callerProfileSnap.data()?.role as UserRole) !== 'admin') { // Explicitly cast to UserRole
      throw new HttpsError('permission-denied', 'You do not have permission to update other user profiles.');
    }
  }

  // Handle role updates (only allowed by admin)
  const finalUpdates: { [key: string]: any } = { ...updates };
  if (role !== undefined) {
    if (callerUid !== uidToUpdate || currentProfile.role !== (role as UserRole)) { // Explicitly cast to UserRole
      const callerProfileRef = db.doc(getUserProfilePath(appId, callerUid));
      const callerProfileSnap = await callerProfileRef.get();
      if (!callerProfileSnap.exists || (callerProfileSnap.data()?.role as UserRole) !== 'admin') { // Explicitly cast to UserRole
        throw new HttpsError('permission-denied', 'Only administrators can change user roles.');
      }
    }
    finalUpdates.role = role as UserRole; // Explicitly cast to UserRole
  }

  // Ensure photoURL is not sent from client as File, but rather a string URL
  if ('photoURL' in finalUpdates && typeof finalUpdates.photoURL !== 'string' && finalUpdates.photoURL !== null) {
      throw new HttpsError('invalid-argument', 'photoURL must be a string URL or null.');
  }

  finalUpdates.updatedAt = FieldValueAdmin.serverTimestamp();

  try {
    await userProfileRef.update(finalUpdates);
    // If displayName or photoURL is updated, also update Firebase Auth user record
    if (finalUpdates.displayName || finalUpdates.photoURL) {
      const authUpdate: { displayName?: string; photoURL?: string } = {};
      if (finalUpdates.displayName) authUpdate.displayName = finalUpdates.displayName;
      if (finalUpdates.photoURL) authUpdate.photoURL = finalUpdates.photoURL;
      await authAdmin.updateUser(uidToUpdate, authUpdate);
      console.log(`Firebase Auth user record updated for ${uidToUpdate}`);
    }

    return { message: 'User profile updated successfully!' };
  } catch (error: any) {
    console.error("Error updating user profile in Cloud Function:", error);
    throw new HttpsError('internal', 'Failed to update user profile.', error.message);
  }
});