import mongoose from 'mongoose';

const findingSchema = new mongoose.Schema(
  {
    scanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
    },

    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repository',
      required: true,
    },

    scanner: {
      type: String,
      enum: ['GITLEAKS', 'TRIVY'],
      required: true,
    },

    type: {
      type: String,
      required: true,
    },

    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
      default: 'UNKNOWN',
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: '',
    },

    file: {
      type: String,
      default: '',
    },

    line: {
      type: Number,
      default: null,
    },

    identifier: {
      type: String,
      default: '',
    },

    fingerprint: {
      type: String,
      default: '',
    },

    remediation: {
      type: String,
      default: '',
    },

    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK'],
      default: 'OPEN',
      index: true,
    },

    remediationNote: {
      type: String,
      default: '',
    },

    statusHistory: [
      {
        status: {
          type: String,
          enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK'],
          required: true,
        },
        note: {
          type: String,
          default: '',
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Finding = mongoose.model('Finding', findingSchema);

export default Finding;