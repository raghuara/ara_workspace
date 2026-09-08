import { notificationSeed } from '@/mock/notifications'
import { daysFromNow } from '@/utils/date'
import { mockRequest } from './httpClient'

export const notificationService = {
  listNotifications: () =>
    mockRequest(() =>
      notificationSeed.map(({ dayOffset, ...notification }) => ({
        ...notification,
        createdOn: daysFromNow(dayOffset),
      })),
    ),
}
