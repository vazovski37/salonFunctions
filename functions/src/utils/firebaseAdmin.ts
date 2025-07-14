// functions/src/utils/firebaseAdmin.ts

import * as admin from 'firebase-admin';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const authAdmin = admin.auth();
export const FieldValueAdmin = FieldValue;

// Define the base path for user profiles to check roles
export const getUserProfilePath = (appId: string, userId: string) => `artifacts/${appId}/users/${userId}/profile/data`;
// Define the base path for public salon data
export const getSalonsCollectionPath = (appId: string) => `artifacts/${appId}/public/data/salons`;

/**
 * Helper function to verify if the caller is an authenticated administrator.
 * Throws an HttpsError if not authorized.
 */
export async function assertAdmin(request: CallableRequest<any>, appId: string) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const userId = request.auth.uid;
  const userProfileRef = db.doc(getUserProfilePath(appId, userId));
  const userProfileSnap = await userProfileRef.get();

  if (!userProfileSnap.exists) {
    throw new HttpsError('permission-denied', 'User profile not found.');
  }

  const userRole = userProfileSnap.data()?.role;
  if (userRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Only administrators can perform this action.');
  }
}