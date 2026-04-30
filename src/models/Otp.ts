import mongoose, { Schema, Model } from 'mongoose';

const OtpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// TTL index: documents are auto-removed when expiresAt passes
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpDocument = mongoose.InferSchemaType<typeof OtpSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Otp: Model<OtpDocument> =
  mongoose.models.Otp ?? mongoose.model<OtpDocument>('Otp', OtpSchema);
