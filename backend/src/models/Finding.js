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
  },
  {
    timestamps: true,
  }
);

const Finding = mongoose.model('Finding', findingSchema);

export default Finding;