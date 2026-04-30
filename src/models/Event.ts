import mongoose, { Schema, Model } from 'mongoose';

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 2000 },
    location: { type: String, required: true, trim: true },
    // Stored UTC, displayed KST on the client
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    maxAttendees: { type: Number, required: true, min: 1, max: 500 },
    attendees: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    tags: { type: [String], default: [], index: true },
    category: {
      type: String,
      enum: ['physical', 'religion', 'hobby', 'food', 'social'],
      default: 'social',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Soft-delete / cancellation
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

EventSchema.index({ startAt: 1, cancelledAt: 1 });
EventSchema.index({ tags: 1, startAt: 1 });

EventSchema.virtual('attendeeCount').get(function () {
  return this.attendees?.length ?? 0;
});

EventSchema.virtual('isFull').get(function () {
  return (this.attendees?.length ?? 0) >= this.maxAttendees;
});

EventSchema.set('toJSON', { virtuals: true });
EventSchema.set('toObject', { virtuals: true });

export type EventDocument = mongoose.InferSchemaType<typeof EventSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Event: Model<EventDocument> =
  mongoose.models.Event ?? mongoose.model<EventDocument>('Event', EventSchema);
