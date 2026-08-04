# Aidevix Backend API

This directory contains the backend for the Aidevix platform, built with Express.js 5.0 and MongoDB. It provides RESTful APIs for courses, users, and gamification, as well as real-time features using WebSockets (Socket.io).

## 🚀 Features
- **User Authentication:** JWT-based auth with secure `httpOnly` cookies.
- **Role-Based Access Control:** Admin vs User roles for accessing restricted endpoints.
- **Courses & Modules:** Full CRUD API for managing educational content.
- **Gamification System:** XP, Levels, daily streaks, and leaderboard algorithms.
- **Real-Time Code Battles:** WebSockets via `Socket.io` allowing users to connect, matchmake, and compete in real-time.
- **Forum & Q&A:** APIs for user discussions and upvote systems.

## 🛠️ Tech Stack
- **Node.js** (Runtime)
- **Express 5.0** (Web Framework)
- **MongoDB & Mongoose** (Database & ODM)
- **Redis** (Caching and Rate Limiting)
- **Socket.io** (WebSockets)
- **Helmet, Cors, XSS-Clean, Express-Rate-Limit** (Security)

## 📦 Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the root of the `backend` folder:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   REDIS_URL=your_redis_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start the Server:**
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

## 📜 API Documentation
All endpoints are strictly validated and handled. In development, the API uses a centralized error handler. For the list of routes, see the `routes/` directory.

- `/api/auth` - Authentication & Registration
- `/api/users` - User Management & Profiles
- `/api/courses` - Educational Content
- `/api/forum` - Q&A Forum
- `/api/gamification` - Streaks, XP, Rankings

---
*Maintained by the Aidevix Engineering Team.*
