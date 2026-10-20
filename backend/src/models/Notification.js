import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      default: null,
    },

    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      default: null,
    },

    findingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Finding',
      default: null,
    },

    type: {
      type: String,
      enum: ['CRITICAL_FINDINGS', 'HIGH_FINDINGS', 'SCAN_FAILED', 'SCAN_COMPLETED', 'STATUS_CHANGED', 'INFO'],
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    link: {
      type: String,
      default: '',
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
