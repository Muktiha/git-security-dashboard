import mongoose from 'mongoose';
import Repository from '../models/Repository.js';
import Scan from '../models/Scan.js';

export const startScan = async (req, res) => {
  try {
    const { repositoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(repositoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repository ID.',
      });
    }

    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user.id,
    });

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: 'Repository not found.',
      });
    }

    const scan = await Scan.create({
      repositoryId: repository._id,
      status: 'QUEUED',
    });

    return res.status(201).json({
      success: true,
      message: 'Scan queued successfully.',
      scan,
    });
  } catch (error) {
    console.error('[Scan Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to start scan.',
    });
  }
};

export const getRepositoryScans = async (req, res) => {
  try {
    const { repositoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(repositoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid repository ID.',
      });
    }

    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user.id,
    });

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: 'Repository not found.',
      });
    }

    const scans = await Scan.find({
      repositoryId: repository._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      scans,
    });
  } catch (error) {
    console.error('[Scan Error]', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve scans.',
    });
  }
};