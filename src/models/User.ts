import mongoose, { Schema, Model } from 'mongoose';

const InterestSchema = new Schema(
  {
    category: {
      type: String,
      enum: ['physical', 'religion', 'hobby', 'food', 'social'],
      required: true,
    },
    label: { type: String, required: true },
  },
  { _id: false },
);

const AllergySchema = new Schema(
  {
    label: { type: String, required: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // KR phone format: digits only, e.g. "01012345678"
      match: /^01[016789]\d{7,8}$/,
    },
    interests: { type: [InterestSchema], default: [] },
    allergies: { type: [AllergySchema], default: [] },
    // AI-derived tags accumulated from event signups — KEY FEATURE
    derivedTags: { type: [String], default: [] },
    // Time slots like "morning", "afternoon", "evening" or "월요일 오전"
    preferredTimeSlots: { type: [String], default: [] },
    // FCM device tokens (multiple devices possible)
    fcmTokens: { type: [String], default: [] },
    // Refresh token rotation (sliding session pattern)
    refreshTokenHash: { type: String, default: null },
    refreshTokenExpiresAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: Date.now },
    onboardedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

UserSchema.index({ derivedTags: 1 });
UserSchema.index({ 'interests.label': 1 });

UserSchema.virtual('phoneLast4').get(function () {
  return this.phone.slice(-4);
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const r = ret as Record<string, unknown>;
    delete r.refreshTokenHash;
    delete r.refreshTokenExpiresAt;
    delete r.__v;
    return ret;
  },
});

export type UserDocument = mongoose.InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>('User', UserSchema);
