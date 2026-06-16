# Production Deployment Details

This document outlines the step-by-step instructions to deploy the HRMS platform to production.

---

## 1. Environment Configurations (.env)

Make sure the following variables are configured for production:

### Backend (.env)
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/hrms?retryWrites=true&w=majority
JWT_SECRET=super_secure_random_production_jwt_secret
JWT_REFRESH_SECRET=super_secure_random_production_jwt_refresh_secret
NODE_ENV=production
```

### Frontend (.env.production)
```env
VITE_API_URL=https://api.yourdomain.com
```

---

## 2. Backend Deployment

### Option A: Using PM2 (Process Manager)
1. Install PM2 globally:
   ```bash
   npm install pm2 -g
   ```
2. Start the server:
   ```bash
   pm2 start src/server.js --name "hrms-backend"
   ```
3. Set up PM2 startup script to restart automatically on system reboot:
   ```bash
   pm2 startup
   pm2 save
   ```

### Option B: Using Docker
Create a `Dockerfile` inside `hrms-backend`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 3. Frontend Deployment

### Option A: Standard Nginx Server
1. Build the production assets:
   ```bash
   npm run build
   ```
2. Copy the contents of the `dist/` directory to your web server host root (e.g. `/var/www/html`).
3. Configure Nginx fallback for single-page applications:
   ```nginx
   server {
       listen 80;
       server_name app.yourdomain.com;
       root /var/www/html;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### Option B: Deploying on Vercel
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Log in and deploy from the `hrms-frontend` directory:
   ```bash
   vercel
   ```
3. Add the rewrite rule in `vercel.json` for React Router routing:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
