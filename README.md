# SyncMusic - Realtime Synchronized Music Listening Platform

SyncMusic is a full-stack realtime music listening application where users can create rooms, invite friends, and listen to music together with synchronized playback.

## What the app includes today

### User and Authentication
- Register and login
- Google OAuth login support
- User profile settings
- Persistent auth token storage in browser
- Single-session enforcement: login from a new client forces prior session logout

### Room Experience
- Create public/private music rooms
- Invite friends using an invite code
- Join rooms by invite code
- Host, moderator, and listener roles
- Real-time synchronized playback across all users in room
- Host/moderator controls for play/pause, seek, skip
- Queue management with add/remove support
- Search YouTube songs and add them to queue
- Chat inside room with live system messages
- Participant list with online/listening status
- Played history tab showing songs already played in the room

### Admin features
- Admin dashboard with user management
- Room management in admin panel
- Edit, delete rooms from admin area
- Search users and filter rooms

### Backend and data
- MongoDB data persistence for users, rooms, songs, messages, playlists
- Room state saved and synced via Socket.IO
- Room analytics and stats tracking
- One-room-per-user session management over websockets

## Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO for realtime sync
- JSON Web Tokens for auth
- Passport + Google OAuth
- Security middleware: CORS, Helmet, rate limiting

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion for animations
- Zustand for state management
- Socket.IO Client for realtime events
- Lucide React icons

### Dev / Deployment
- Docker + Docker Compose
- MongoDB 7.0

## Project Structure

```
music/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── src/
│       ├── config/
│       │   ├── database.js
│       │   └── passport.js
│       ├── controllers/
│       │   ├── adminController.js
│       │   ├── authController.js
│       │   ├── messageController.js
│       │   ├── playlistController.js
│       │   ├── roomController.js
│       │   ├── roomController.js.backup
│       │   ├── songController.js
│       │   └── userController.js
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       │   ├── admin.js
│       │   ├── auth.js
│       │   ├── message.js
│       │   ├── playlist.js
│       │   ├── room.js
│       │   ├── song.js
│       │   └── user.js
│       ├── scripts/
│       ├── services/
│       ├── socket/
│       ├── utils/
│       └── server.js
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── global.d.ts
│   ├── next-env.d.ts
│   ├── .env.example
│   ├── .env.local
│   └── src/
│       ├── app/
│       │   ├── admin/
│       │   ├── dashboard/
│       │   ├── login/
│       │   ├── profile/
│       │   ├── register/
│       │   ├── room/
│       │   ├── error.tsx
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── not-found.tsx
│       │   └── page.tsx
│       ├── components/
│       ├── lib/
│       │   ├── api.ts
│       │   ├── socket.ts
│       │   └── utils.ts
│       └── store/
├── docker-compose.yml
└── README.md
```

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB 7+
- npm or yarn

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your settings
npm run dev
```

### Access app
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## Docker Setup

1. Copy env file

```bash
cp .env.example .env
```

2. Start containers

```bash
docker-compose up -d
```

3. View logs

```bash
docker-compose logs -f
```

4. Stop containers

```bash
docker-compose down
```

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/syncmusic
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

## Scripts

### Backend
- `npm run dev` - Start backend in development
- `npm start` - Start backend in production
- `npm run cleanup:rooms` - Cleanup duplicate rooms

### Frontend
- `npm run dev` - Start Next.js dev server
- `npm run build` - Build production app
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Important API Groups

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Rooms
- `POST /api/rooms`
- `GET /api/rooms`
- `GET /api/rooms/:identifier`
- `POST /api/rooms/join`
- `POST /api/rooms/:roomId/leave`
- `PUT /api/rooms/:roomId`
- `DELETE /api/rooms/:roomId`
- `GET /api/rooms/trending`

### Songs
- `POST /api/songs`
- `GET /api/songs/search`
- `GET /api/songs/:songId`
- `GET /api/songs/trending`
- `POST /api/songs/queue/:roomId`

### Messages
- `GET /api/messages/room/:roomId`
- `POST /api/messages/room/:roomId`
- `PUT /api/messages/:messageId`
- `DELETE /api/messages/:messageId`

### Admin
- `GET /api/admin/users`
- `GET /api/admin/users/search`
- `PUT /api/admin/users/:userId/role`
- `GET /api/admin/rooms`
- `PUT /api/admin/rooms/:roomId`
- `DELETE /api/admin/rooms/:roomId`

## Socket Events

### Client → Server
- `join_room`
- `leave_room`
- `play`
- `pause`
- `seek`
- `skip`
- `vote_skip`
- `sync_request`
- `send_message`

### Server → Client
- `room_state`
- `playback_sync`
- `song_changed`
- `user_joined`
- `user_left`
- `new_message`
- `message_sent`
- `room_updated`
- `host_left`
- `force_logout`

## Key Features Overview

- Realtime music room creation and joining
- Synchronized playback and drift correction
- Search and add songs to queue
- Played history tab inside room
- Room chat and participant list
- Admin room/user management panel
- Single-session enforcement across clients

## Notes

- `docker-compose.yml` exposes frontend on port `3000` and backend on `5000`
- `mongodb` service is configured in Docker Compose with a named volume `mongodb_data`
- Frontend and backend use shared .env values to connect to the API and websocket server


### Message
- room, sender, content
- type (text, emoji, system, reaction)
- reactions, replyTo
- isEdited, editedAt, deletedAt

### Playlist
- name, description, owner
- songs, coverArt
- isPublic, followers
- playCount, tags, color

### RoomHistory
- room, participants
- peakParticipants
- songsPlayed
- totalListenTime
- sessionStart, sessionEnd

## Architecture

### Synchronization Engine
The synchronization engine maintains authoritative playback state on the server:
- Server stores `isPlaying`, `currentTime`, `currentSong`, `lastUpdateTime`
- Clients sync on connect and periodically for drift correction
- Host controls are broadcast to all clients
- Latency compensation using timestamp-based sync
- Automatic resync on reconnection

### Authentication Flow
1. User registers/logs in (JWT or Google OAuth)
2. Token stored in cookie and Zustand store
3. Token included in API requests via axios interceptor
4. Token used for Socket.IO authentication
5. Protected routes verify token via middleware

### Room Flow
1. User creates room → generates invite code
2. Other users join via invite code
3. Socket.IO connection established
4. Server sends current room state
5. Playback synchronized across all clients
6. Chat and presence updates in real-time

## Development

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm run lint
```

### Building for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

## Acknowledgments

- Inspired by Spotify Group Session and Discord music bots
- Built with modern web technologies
- Uses Socket.IO for realtime communication
