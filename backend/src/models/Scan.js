import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema(
  {
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
    },

    status: {
      type: String,
      enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    duration: {
      type: Number,
      default: 0,
    },

    totalFindings: {
      type: Number,
      default: 0,
    },

    criticalCount: {
      type: Number,
      default: 0,
    },

    highCount: {
      type: Number,
      default: 0,
    },

    mediumCount: {
      type: Number,
      default: 0,
    },

    lowCount: {
      type: Number,
      default: 0,
    },

    failureReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance query optimization
scanSchema.index({ repositoryId: 1, createdAt: -1 });
scanSchema.index({ repositoryId: 1, status: 1 });

const Scan = mongoose.model('Scan', scanSchema);

export default Scan;