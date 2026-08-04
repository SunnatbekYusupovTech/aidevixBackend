# Aidevix — Professional IT and Programming Education Platform

![Aidevix Banner](https://aidevix.uz/Logo.jpg)

Aidevix is the largest and most modern programming education platform in Uzbekistan, designed to teach cutting-edge technologies like React, Node.js, Python, and AI through interactive tools, gamification, and real-time coding challenges.

## 🌟 Key Features
- **Courses & Interactive Learning:** Video lessons, text materials, and real-world projects.
- **Q&A Forum:** A highly engaging community for students to ask questions and earn XP.
- **Code Battle Arena:** Real-time 1v1 multiplayer coding challenges via WebSockets.
- **Top Prompts:** Curated AI prompts for developers to enhance their productivity.
- **AI Playground:** A built-in code editor (HTML, CSS, JS, Python, React) to test concepts directly in the browser.
- **Gamification:** XP system, leaderboards, daily challenges, streaks, and ranks (from Amateur to Legend).

## 🏗️ Architecture & Tech Stack

This repository is a monorepo containing three main components:

### 1. `frontend/` (Web Application)
- **Framework:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS, Framer Motion, GSAP
- **State Management:** Redux Toolkit, Context API
- **Deployment:** Vercel

### 2. `backend/` (API & WebSockets)
- **Framework:** Node.js, Express.js 5.0
- **Database:** MongoDB (Mongoose), Redis (Caching)
- **Real-time:** Socket.io (for Code Battles and Notifications)
- **Security:** Helmet, Rate-Limiter, MongoDB Sanitize, JWT
- **Deployment:** Railway

### 3. `AidevixApp/` (Mobile Application)
- **Framework:** React Native (Expo)
- **Navigation:** React Navigation
- **State Management:** Redux Toolkit
- **Features:** Direct WebViews for complex features (e.g., Forum, Prompts), native Code Quizzes, and Shorts.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB and Redis (Local or Cloud)
- Expo CLI (for mobile)

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SunnatbekYusupovTech/aidevixBackend.git
   cd aidevixBackend
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Create a .env file based on environment variables
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   # Create a .env.local file
   npm run dev
   ```

4. **Mobile App Setup:**
   ```bash
   cd AidevixApp
   npm install
   npx expo start
   ```

## 🔒 Security
- All sensitive configurations and tokens are managed via environment variables.
- Authentication utilizes secure, `httpOnly` cookies in the web and secure async storage in mobile.
- Strong protection against NoSQL injection, XSS, and DDoS attacks via rate limiters and Helmet.

---
*Built with ❤️ for the Uzbek Developer Community by Aidevix.*
