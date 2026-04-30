import mongoose, { Schema } from 'mongoose';

const InvitationSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
    fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

// Prevent duplicate invites for the same event+user
InvitationSchema.index({ event: 1, toUser: 1 }, { unique: true });

export const Invitation =
  mongoose.models.Invitation ?? mongoose.model('Invitation', InvitationSchema);
