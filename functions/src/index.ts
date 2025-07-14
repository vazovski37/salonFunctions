// functions/src/index.ts

// Import and re-export all your callable functions
export { addSalon } from './salons/addSalon';
export { updateSalon } from './salons/updateSalon';
export { deleteSalon } from './salons/deleteSalon';
export { searchUsersByEmail } from './users/searchUsers';
export { getAuthUserProfile } from './users/getAuthUserProfile'; // NEW
export { updateAuthUserProfile } from './users/updateAuthUserProfile'; // NEW
export { getAllUserProfiles } from './users/getAllUserProfiles'; // NEW
export { ensureUserProfile } from './users/ensureUserProfile'