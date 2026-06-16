# How to Run the HRMS Server

This guide explains how to start and run the HRMS application locally.
Both the **backend API** and the **frontend React app** are served from a **single server** on **port 3000**.

---

## Prerequisites
1. **Node.js**: Ensure Node.js (version 18 or above) is installed.
2. **MongoDB**: Ensure a MongoDB connection string is configured in `hrms-backend/.env`.

---

## 1. Install Dependencies (First Time Only)

Open a terminal in the project root (`HRMS/`) and run:

```bash
npm run setup
```

This installs dependencies for both the backend and frontend.

---

## 2. Running in Development Mode

Development mode runs **both** the backend (with nodemon for auto-restart) and the Vite dev server for the frontend **concurrently**:

```bash
npm run dev
```

| Service          | URL                        | Notes                              |
|------------------|----------------------------|------------------------------------|
| Backend API      | `http://localhost:3000`    | Auto-restarts on file changes      |
| Frontend (Vite)  | `http://localhost:5173`    | Hot Module Replacement (HMR)       |

> **Note:** In development, the frontend runs on its own Vite dev server (port 5173) for fast HMR. API calls are proxied to the backend on port 3000.

---

## 3. Running in Production Mode (Single Server)

In production, the backend serves the frontend's pre-built static files — **both run on the same port 3000**.

### Step 1: Build the Frontend

```bash
npm run build
```

This creates the optimized production bundle in `hrms-frontend/dist/`.

### Step 2: Start the Server

```bash
npm run start
```

Or equivalently:

```bash
npm run server
```

| Service              | URL                     |
|----------------------|-------------------------|
| Full App (API + UI)  | `http://localhost:3000`  |

> The Express server serves the React app's static files and handles all `/api/v1/*` routes. Any non-API route falls back to `index.html` for client-side routing.

---

## 4. Available Scripts (from project root)

| Command            | Description                                              |
|--------------------|----------------------------------------------------------|
| `npm run setup`    | Install dependencies for both backend and frontend       |
| `npm run dev`      | Start backend + frontend dev servers concurrently        |
| `npm run build`    | Build the frontend for production                        |
| `npm run start`    | Start the production server (serves API + built frontend)|
| `npm run server`   | Alias for `npm run start`                                |

---

## 5. Environment Configuration

Make sure `hrms-backend/.env` contains the required variables:

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
```

---

## 6. Troubleshooting

### Port Already in Use
If port 3000 is already occupied, kill the process:

**Windows:**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

### `vite` Not Recognized
Make sure you've installed frontend dependencies:
```bash
npm install --prefix hrms-frontend
```
