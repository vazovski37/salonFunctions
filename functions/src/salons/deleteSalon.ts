// functions/src/salons/deleteSalon.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db, assertAdmin, getSalonsCollectionPath } from '../utils/firebaseAdmin';
import { DeleteSalonData } from '../types/index'; // Adjusted import path to shared types

/**
 * Callable Cloud Function to delete a salon.
 * Requires admin privileges.
 *
 * @param {CallableRequest<DeleteSalonData>} request - The request object containing data and context.
 */
export const deleteSalon = onCall(async (request: CallableRequest<DeleteSalonData>) => {
  const { id } = request.data;
  const appId = process.env.FIREBASE_APP_ID || 'default-app-id';

  await assertAdmin(request, appId);

  if (!id) {
    throw new HttpsError('invalid-argument', 'Missing salon ID.');
  }

  try {
    const salonDocRef = db.doc(`${getSalonsCollectionPath(appId)}/${id}`);
    await salonDocRef.delete();

    return { message: 'Salon deleted successfully!' };
  } catch (error: any) {
    console.error("Error deleting salon in Cloud Function:", error);
    throw new HttpsError('internal', 'Failed to delete salon.', error.message);
  }
});