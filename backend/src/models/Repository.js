import mongoose from 'mongoose';

const repositorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Repository name is required'],
    trim: true,
  },
  owner: {
    type: String,
    required: [true, 'Repository owner is required'],
    trim: true,
  },
  url: {
    type: String,
    required: [true, 'Repository URL is required'],
    trim: true,
  },
  branch: {
    type: String,
    default: 'main',
    trim: true,
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastScannedAt: {
    type: Date,
    default: null,
  },
});

// Ensure a user cannot duplicate the exact same repository under their account
repositorySchema.index({ userId: 1, url: 1 }, { unique: true });
repositorySchema.index({ userId: 1, createdAt: -1 });

const Repository = mongoose.model('Repository', repositorySchema);

export default Repository;
