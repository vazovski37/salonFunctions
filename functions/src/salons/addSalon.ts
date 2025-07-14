// functions/src/salons/addSalon.ts

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { db, FieldValueAdmin, assertAdmin, getSalonsCollectionPath } from '../utils/firebaseAdmin'; // Removed authAdmin as it's no longer used
import { AddSalonData } from '../types'; // Assuming 'types' is resolved via tsconfig paths or relative path

/**
 * Callable Cloud Function to add a new salon.
 * Requires admin privileges.
 * Assigns ownership via owner's email.
 *
 * @param {CallableRequest<AddSalonData>} request - The request object containing data and context.
 */
export const addSalon = onCall(async (request: CallableRequest<AddSalonData>) => {
  const { name, address, description, ownerEmail } = request.data;
  const appId = process.env.FIREBASE_APP_ID || 'default-app-id';

  // Ensure the caller is an admin
  await assertAdmin(request, appId);

  if (!name || !address || !description || !ownerEmail) {
    throw new HttpsError('invalid-argument', 'Missing required salon fields or owner email.');
  }

  // --- MODIFICATION START ---
  // As per request to change 'getUserByEmail()', we are now directly using ownerEmail
  // as the identifier. This removes the Firebase Auth user existence verification.
  // The 'ownerId' field will now store the email address provided.
  const ownerIdentifier = ownerEmail; // Store the email directly
  // --- MODIFICATION END ---

  try {
    // Add the new salon document to Firestore
    const newSalonRef = await db.collection(getSalonsCollectionPath(appId)).add({
      name,
      address,
      description,
      ownerId: ownerIdentifier, // Store the owner's identifier (now email)
      createdAt: FieldValueAdmin.serverTimestamp(),
      updatedAt: FieldValueAdmin.serverTimestamp(),
    });

    console.log(`Salon '${name}' added with owner identifier (email) '${ownerIdentifier}'.`);
    return { id: newSalonRef.id, message: 'Salon added successfully!' };
  } catch (error: any) {
    console.error("Error adding salon in Cloud Function:", error);
    throw new HttpsError('internal', 'Failed to add salon.', error.message);
  }
});