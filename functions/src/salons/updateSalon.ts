// functions/src/salons/updateSalon.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db, authAdmin, FieldValueAdmin, assertAdmin, getUserProfilePath, getSalonsCollectionPath } from '../utils/firebaseAdmin';
import { UpdateSalonData } from '../types/index'; // Adjusted import path to shared types

/**
 * Callable Cloud Function to update an existing salon.
 * Requires admin privileges.
 * Can update owner via owner's email.
 *
 * @param {CallableRequest<UpdateSalonData>} request - The request object containing data and context.
 */
export const updateSalon = onCall(async (request: CallableRequest<UpdateSalonData>) => {
  const { id, name, address, description, ownerEmail } = request.data;
  const appId = process.env.FIREBASE_APP_ID || 'default-app-id';

  await assertAdmin(request, appId);

  if (!id || (!name && !address && !description && !ownerEmail)) {
    throw new HttpsError('invalid-argument', 'Missing salon ID or update fields.');
  }

  let ownerId: string | undefined;
  if (ownerEmail) {
    try {
      const userRecord = await authAdmin.getUserByEmail(ownerEmail);
      ownerId = userRecord.uid;
    } catch (error: any) {
      console.error("Error looking up new owner by email:", ownerEmail, error);
      if (error.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', `User with email ${ownerEmail} not found. Please ensure the user exists.`);
      }
      throw new HttpsError('internal', 'Failed to verify new owner email.', error.message);
    }
  }

  try {
    const salonDocRef = db.doc(`${getSalonsCollectionPath(appId)}/${id}`);
    const updateData: { [key: string]: any } = {
      updatedAt: FieldValueAdmin.serverTimestamp(),
    };
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (description) updateData.description = description;
    if (ownerId) {
      updateData.ownerId = ownerId;

      const newOwnerProfileRef = db.doc(getUserProfilePath(appId, ownerId));
      const newOwnerProfileSnap = await newOwnerProfileRef.get();
      if (newOwnerProfileSnap.exists && newOwnerProfileSnap.data()?.role === 'user') {
        await newOwnerProfileRef.update({ role: 'salon' });
        console.log(`Updated new owner ${ownerId} role to 'salon' for salon ${id}`);
      } else if (!newOwnerProfileSnap.exists) {
         await newOwnerProfileRef.set({
            email: ownerEmail,
            role: 'salon',
            createdAt: FieldValueAdmin.serverTimestamp(),
         }, { merge: true });
         console.log(`Created default 'salon' profile for new owner ${ownerId}.`);
      }
    }

    await salonDocRef.update(updateData);
    return { message: 'Salon updated successfully!' };
  } catch (error: any) {
    console.error("Error updating salon in Cloud Function:", error);
    throw new HttpsError('internal', 'Failed to update salon.', error.message);
  }
});