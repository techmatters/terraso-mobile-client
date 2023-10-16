import {UserPreview} from 'terraso-mobile-client/types/users.types';
export type SiteDisplay = {
  lat: number;
  lon: number;
  name: string;
  id: number;
};

export type SitePreview = {
  id: number;
  name: string;
  lastModified: {
    user: UserPreview;
    date: string;
  };
  percentComplete: number;
};
