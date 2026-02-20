# PhotoShare

An Instagram-like photo sharing platform where users can share photos with followers, apply filters, and react with emojis.

## Features

- **Authentication** — JWT-based registration and login
- **Follow/Unfollow** — Follow other users to see their posts in your feed
- **Photo Sharing** — Upload photos with captions
- **Photo Filters** — Apply filters (grayscale, sepia, warm, cool, vintage, etc.) before sharing
- **Feed** — See posts from users you follow, sorted by newest first
- **Emoji Reactions** — React to posts with multiple emojis (❤️ 😂 😮 😢 😡 👏 🔥 💯 🎉 😍)
- **User Profiles** — View any user's profile with follower/following counts and their posts
- **User Search** — Search for users by username or display name

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Backend  | NestJS, TypeORM, SQLite, Passport JWT |
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Language | TypeScript (both)                     |

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env    # configure JWT_SECRET
npm install
npm run dev             # runs on http://localhost:3000
```

API docs available at http://localhost:3000/api/docs (Swagger UI).

### Frontend

```bash
cd frontend
npm install
npm run dev             # runs on http://localhost:3001
```

## API Endpoints

| Method | Endpoint                         | Description                |
|--------|----------------------------------|----------------------------|
| POST   | `/api/auth/register`             | Register a new user        |
| POST   | `/api/auth/login`                | Login                      |
| GET    | `/api/auth/me`                   | Get current user           |
| GET    | `/api/users/:username`           | Get user profile           |
| GET    | `/api/users/search?q=`           | Search users               |
| POST   | `/api/follows/:username`         | Follow a user              |
| DELETE | `/api/follows/:username`         | Unfollow a user            |
| POST   | `/api/posts`                     | Create post (multipart)    |
| GET    | `/api/posts/feed?page=`          | Get feed                   |
| GET    | `/api/posts/user/:username`      | Get user's posts           |
| DELETE | `/api/posts/:id`                 | Delete own post            |
| POST   | `/api/posts/:postId/reactions`   | Toggle emoji reaction      |
| GET    | `/api/posts/:postId/reactions`   | Get post reactions         |
