// src/types/index.ts

// Importing Timestamp from Firebase client SDK for client-side type definitions
import { Timestamp } from 'firebase/firestore'; 
import { User } from 'firebase/auth'; 

/**
 * Defines the possible high-level roles a user can have in the application.
 * 'admin' for global website administrators.
 * 'customer' for all other users (regular clients, salon owners, stylists, etc.).
 */
export type UserRole = 'admin' | 'customer';
// --- Shared Interface Structures ---

// Defines the structure for an associated salon (for users who work at salons)
export interface AssociatedSalon {
  salonId: string;
  role: 'stylist' | 'manager' | 'receptionist' | 'other'; // Specific role within THAT salon
  startDate: Timestamp; // When they started working here
  endDate?: Timestamp; // Optional end date if their employment ended
}

// Defines the structure for a user's address
export interface UserAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string; // Good for internationalization
}

// --- Main Document Interfaces ---

/**
 * Describes the structure of a user's profile data as stored in Firestore.
 * This is the SOURCE OF TRUTH for user data, populated and managed by Cloud Functions.
 */
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null; // New: Optional phone number
  createdAt: Timestamp; // New: Firestore Timestamp on creation
  lastLoginAt: Timestamp; // New: Firestore Timestamp, updated on each login
  updatedAt?: Timestamp; // Optional: When the profile was last modified
  role: UserRole;
  ownedSalons?: string[]; // New: Array of salon IDs this user owns
  associatedSalons?: AssociatedSalon[]; // New: Array of salons this user works for
  favoriteSalons?: string[]; // New: Array of salon IDs this user has favorited
  address?: UserAddress | null; // New: Optional user address map
}

/**
 * Describes the structure of a salon document as stored in Firestore.
 */
export interface Salon {
  id: string; // Document ID from Firestore
  name: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    latitude: number;
    longitude: number;
  };
  phoneNumber: string;
  email?: string;
  website?: string;
  imageUrls?: string[];
  openingHours: {
    monday: { open: string | null; close: string | null; isClosed: boolean };
    tuesday: { open: string | null; close: string | null; isClosed: boolean };
    wednesday: { open: string | null; close: string | null; isClosed: boolean };
    thursday: { open: string | null; close: string | null; isClosed: boolean };
    friday: { open: string | null; close: string | null; isClosed: boolean };
    saturday: { open: string | null; close: string | null; isClosed: boolean };
    sunday: { open: string | null; close: string | null; isClosed: boolean };
  };
  services: {
    id: string; // Unique ID for the service (e.g., auto-generated or slug)
    name: string;
    description: string;
    price: number;
    durationMinutes: number;
    category: string; // e.g., "Hair", "Nails"
    staffRequired: boolean;
    availableStaffIds?: string[]; // IDs of staff (from salon_staff collection) capable of this service
  }[];
  ownerIds: string[]; // Array of user UIDs who own this salon
  ratings: {
    average: number;
    count: number;
  };
  featured: boolean;
  status: 'active' | 'inactive' | 'pending_approval' | 'suspended';
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  googleCalendarConfig?: { // New: For Google Calendar integration
    mainCalendarId: string;
    timezone: string;
  };
}

/**
 * Describes the structure of a staff member document within the top-level `salon_staff` collection.
 */
export interface SalonStaff {
  salonId: string; // ID of the salon they work for
  userId: string; // User ID of the staff member (links to UserProfile)
  role: 'stylist' | 'manager' | 'receptionist' | 'other'; // Role specific to this salon
  bio?: string;
  photoURL?: string; // Staff-specific photo (can override user.photoURL for this role)
  servicesOffered: string[]; // Array of `service.id`s they can perform
  active: boolean; // Is this staff member currently active at the salon?
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  googleCalendarId?: string; // New: The Google Calendar ID for this staff member (if bookable)
}

/**
 * Describes the structure of a booking document as stored in Firestore.
 */
export interface Booking {
  id: string; // Document ID from Firestore
  userId: string;
  salonId: string;
  staffUserId?: string; // Optional: if a specific staff member was booked
  serviceBooked: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  };
  bookingDate: Timestamp; // Start time of the booking
  durationMinutes: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
  totalPrice: number;
  notes?: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  googleCalendarEventId: string; // New: The ID of the corresponding Google Calendar event
  googleCalendarId: string; // New: The ID of the calendar where the event lives
  googleCalendarEventLink?: string; // New: Optional link to the Google Calendar event
}

/**
 * Describes the structure of a review document as stored in Firestore.
 */
export interface Review {
  id: string; // Document ID from Firestore
  userId: string;
  salonId: string;
  bookingId: string;
  rating: number; // e.g., 1-5 stars
  comment?: string;
  createdAt: Timestamp;
}

// --- Context & Hooks Types ---

/**
 * Defines the shape of the object provided by the AuthContext.
 * This is what components will consume when they use the `useAuth()` hook.
 */
export interface AuthContextType {
  user: User | null; // The raw Firebase Auth user object (contains uid, email, etc.)
  userId: string | null; // The user's unique ID (UID) for quick access
  userProfile: UserProfile | null; // The full application-specific user profile from Firestore
  loading: boolean; // A flag to indicate if the authentication state and profile loading
}

/**
 * Defines the shape of the object returned by the `useAuthOperations` hook.
 * This provides a clear contract for the authentication functions and their state.
 */
export interface AuthOperations {
  googleSignIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  loadingAuth: boolean;
  authError: string | null;
}

/**
 * Defines the shape of the object returned by the `useProfileOperations` hook.
 */
export interface ProfileOperations {
  updateProfile: (updates: Partial<UserProfile> & { targetUid?: string }, newPhoto?: File | null) => Promise<void>;
  loadingProfile: boolean;
  profileError: string | null;
}

// --- Callable Function Data/Result Types ---

// Base return type for user profile callable functions where dates are ISO strings for client conversion
export type UserProfileCallableResult = Omit<UserProfile, 'createdAt' | 'lastLoginAt' | 'updatedAt'> & {
  createdAt: string; // ISO string from CF
  lastLoginAt: string; // ISO string from CF
  updatedAt?: string; // ISO string from CF
};

// Data passed to ensureUserProfile callable function (none, auth context provides info)
export type EnsureUserProfileCallableData = void;
// Result returned from ensureUserProfile callable function (the UserProfile data with ISO strings)
export type EnsureUserProfileCallableResult = UserProfileCallableResult;


// Data passed to getAuthUserProfile callable function
export interface GetUserProfileCallableData {
  uid: string;
}
// Result returned from getAuthUserProfile callable function
export type GetUserProfileCallableResult = UserProfileCallableResult | null;


// Data passed to updateAuthUserProfile callable function
// `Partial<UserProfile>` implies optional fields, but exclude Timestamps as they are CF-managed
export interface UpdateUserProfileCallableData extends Partial<Omit<UserProfile, 'createdAt' | 'lastLoginAt' | 'updatedAt'>> {
  targetUid?: string; // Optional: UID of the user to update (if admin is updating another user)
  // `role` is also explicitly allowed for admins to change
  role?: UserRole;
  // Arrays for `ownedSalons`, `associatedSalons`, `favoriteSalons` can be passed as full arrays
  // or use FieldValue.arrayUnion/arrayRemove via a Cloud Function if more granular
  // client-side control over array elements is desired. For now, sending the full array is fine
  // if CF handles validation.
  ownedSalons?: string[];
  associatedSalons?: AssociatedSalon[];
  favoriteSalons?: string[];
}
// Result returned from updateAuthUserProfile callable function
export type UpdateUserProfileCallableResult = { success: boolean; message: string };


// Data passed to getAllUserProfiles callable function (none, auth context provides info)
export type GetAllUserProfilesCallableData = void;
// Result returned from getAllUserProfiles callable function
export type GetAllUserProfilesCallableResult = UserProfileCallableResult[];

// --- Callable Function Types for Salon Operations (from your old file, for completeness) ---

/**
 * Defines the input data for the 'addSalon' callable function.
 */
export interface AddSalonData {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    latitude: number;
    longitude: number;
  };
  description: string;
  phoneNumber?: string; // Added as optional in Salon, but was missing here.
  email?: string; // Added as optional in Salon, but was missing here.
  website?: string; // Added as optional in Salon, but was missing here.
  imageUrls?: string[]; // Added as optional in Salon, but was missing here.
  openingHours?: Salon['openingHours']; // Made optional as per Salon, but was missing here.
  services?: Salon['services']; // Made optional as per Salon, but was missing here.
  ownerEmail: string; // Added ownerEmail for salon creation
}

/**
 * Defines the input data for the 'updateSalon' callable function.
 */
export interface UpdateSalonData extends Partial<Omit<Salon, 'id' | 'createdAt' | 'lastUpdated' | 'ownerIds' | 'ratings'>> {
  id: string; // Required for update
  ownerEmail?: string; // Added ownerEmail for salon update
  // ownerIds should be updated via specific admin/owner functions, not generic updateSalon
  // ratings are updated by review functions
}

/**
 * Defines the input data for the 'deleteSalon' callable function.
 */
export interface DeleteSalonData {
  id: string;
}

// Result type for general callable functions (e.g., add/update/delete salon)
export interface CallableResult {
  message: string;
  id?: string; // Optional, as addSalon returns an ID, but update/delete might not
}
