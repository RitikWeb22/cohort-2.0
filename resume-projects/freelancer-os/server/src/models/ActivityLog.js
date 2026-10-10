import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, default: '' },
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
