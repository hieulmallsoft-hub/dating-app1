import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../infrastructure/persistence/notification.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async getNotifications(userId: string) {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async createNotification(userId: string, title: string, content: string, type?: string) {
    const notification = this.notificationRepository.create({
      userId,
      title,
      content,
      type,
    });
    return this.notificationRepository.save(notification);
  }
}
