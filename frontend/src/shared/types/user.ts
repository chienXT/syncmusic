export interface User {
  _id: string;
  username: string;
  email?: string;
  avatar?: string;
  status?: string;
  role?: 'user' | 'moderator' | 'admin';
}
