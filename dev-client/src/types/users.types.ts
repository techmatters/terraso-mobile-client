export type UserPreview = {
  name: string;
  id: number;
};

export type Role = 'member' | 'manager';

export type UserProfile = {
  firstName: string;
  lastName?: string;
  role: Role;
  id: number;
};
