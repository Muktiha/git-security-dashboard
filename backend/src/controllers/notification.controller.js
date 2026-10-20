import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

/**
 * Retrieve notifications for the authenticated user.
 */
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .populate('repositoryId', 'name owner url')
      .populate('scanId', 'status totalFindings completedAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error('[Notification Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications.',
    });
  }
};

/**
 * Get unread notification count only (for lightweight polling/badges).
 */
export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error('[Notification Count Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to count unread notifications.',
    });
  }
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID.',
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (error) {
    console.error('[Mark Notification Read Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification.',
    });
  }
};

/**
 * Mark all notifications for current user as read.
 */
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    console.error('[Mark All Read Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read.',
    });
  }
};

/**
 * Helper utility to create a notification safely without throwing unhandled exceptions.
 */
export const createNotificationSafely = async ({
  userId,
  repositoryId = null,
  scanId = null,
  findingId = null,
  type,
  title,
  message,
  link = '',
}) => {
  try {
    // Prevent duplicate unread notifications with identical message for same user and scan/finding
    const query = {
      userId,
      type,
      isRead: false,
    };
    if (scanId) query.scanId = scanId;
    if (findingId) query.findingId = findingId;

    const existing = await Notification.findOne(query);
    if (existing) {
      return existing;
    }

    const created = await Notification.create({
      userId,
      repositoryId,
      scanId,
      findingId,
      type,
      title,
      message,
      link,
    });

    return created;
  } catch (err) {
    console.warn('[Notification Creation Warning]', err.message);
    return null;
  }
};
