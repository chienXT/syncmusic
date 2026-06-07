export interface Message {
  _id: string;
  type: 'text' | 'system' | 'notification';
  content: string;
  createdAt: string;
  sender?: {
    _id: string;
    username: string;
    avatar?: string;
  };
}
