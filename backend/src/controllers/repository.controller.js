import mongoose from 'mongoose';
import Repository from '../models/Repository.js';

// Regex to validate and parse standard GitHub repository URLs (HTTP, HTTPS, with or without .git / trailing slash)
const GITHUB_REPO_REGEX = /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git|\/)?$/;

/**
 * @route   POST /api/repositories
 * @desc    Create/Add a new Git repository for the authenticated user
 * @access  Private
 */
export const createRepository = async (req, res, next) => {
  try {
    const { url, branch, visibility } = req.body;

    // 1. Validate URL presence
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid GitHub repository URL is required.',
      });
    }

    const trimmedUrl = url.trim();
    const match = trimmedUrl.match(GITHUB_REPO_REGEX);

    // 2. Validate GitHub format & extract owner/name
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GitHub URL. Must be in the format: https://github.com/owner/repository',
      });
    }

    const owner = match[1];
    const name = match[2];
    const normalizedUrl = `https://github.com/${owner}/${name}`;

    // 3. Prevent duplicate repository entry for the same user
    const existingRepo = await Repository.findOne({
      userId: req.user.id,
      url: normalizedUrl,
    });

    if (existingRepo) {
      return res.status(409).json({
        success: false,
        message: 'Repository is already registered under your account.',
        repository: existingRepo,
      });
    }

    // 4. Create repository scoped strictly to authenticated user
    const repository = await Repository.create({
      userId: req.user.id,
      name,
      owner,
      url: normalizedUrl,
      branch: branch && typeof branch === 'string' && branch.trim() ? branch.trim() : 'main',
      visibility: visibility && ['public', 'private'].includes(visibility) ? visibility : 'public',
    });

    return res.status(201).json({
      success: true,
      message: 'Repository added successfully.',
      repository,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/repositories
 * @desc    Get all repositories belonging to the authenticated user
 * @access  Private
 */
export const getRepositories = async (req, res, next) => {
  try {
    // Scoped strictly to authenticated user's ID
    const repositories = await Repository.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: repositories.length,
      repositories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/repositories/:id
 * @desc    Get single repository by ID (only if owned by authenticated user)
 * @access  Private
 */
export const getRepository = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Repository not found.',
      });
    }

    // Query strictly matching ID AND userId
    const repository = await Repository.findOne({
      _id: id,
      userId: req.user.id,
    }).lean();

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: 'Repository not found.',
      });
    }

    return res.status(200).json({
      success: true,
      repository,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/repositories/:id
 * @desc    Delete repository by ID (only if owned by authenticated user)
 * @access  Private
 */
export const deleteRepository = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Repository not found.',
      });
    }

    // Delete strictly matching ID AND userId
    const repository = await Repository.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!repository) {
      return res.status(404).json({
        success: false,
        message: 'Repository not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Repository deleted successfully.',
      repository: {
        id: repository._id,
        name: repository.name,
        owner: repository.owner,
      },
    });
  } catch (error) {
    next(error);
  }
};
