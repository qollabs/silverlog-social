// Shared types for client + server
// Keep these aligned with the Mongoose schemas in src/models/

export type InterestCategory = 'physical' | 'religion' | 'hobby' | 'food' | 'social';

export interface Interest {
  category: InterestCategory;
  label: string;       // e.g. "요가", "기독교", "바둑"
}

export interface Allergy {
  label: string;       // e.g. "땅콩", "계란"
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface UserPublic {
  _id: string;
  name: string;
  phoneLast4: string;          // only last 4 digits exposed publicly
  interests: Interest[];
  allergies: Allergy[];
  // AI-derived tags accumulated from event participation
  derivedTags: string[];
  preferredTimeSlots: string[];
  joinedAt: string;
}

export interface UserPrivate extends UserPublic {
  phone: string;               // full phone, only for the user themselves / admin
  fcmTokens: string[];
  lastActiveAt?: string;
}

export interface EventDoc {
  _id: string;
  title: string;
  description?: string;
  location: string;            // e.g. "1층 다목적 홀"
  startAt: string;             // ISO, stored UTC
  endAt: string;               // ISO, stored UTC
  maxAttendees: number;
  attendees: string[];         // user IDs
  tags: string[];
  category?: InterestCategory;
  createdBy: string;           // user ID
  createdAt: string;
  // Computed fields (not stored)
  isFull?: boolean;
  isPast?: boolean;
  isAttending?: boolean;
  attendeeCount?: number;
}

export type EventListBucket = 'open' | 'closed' | 'past';

export interface AuthSession {
  userId: string;
  name: string;
  iat: number;
  exp: number;
}
