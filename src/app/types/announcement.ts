export interface Announcement {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  createdAt: Date;
  isActive: boolean;
  isInactive: boolean;
}
