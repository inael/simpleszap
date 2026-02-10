#!/bin/bash

# SimplesZap Deploy Script
# Usage: ./deploy-vps.sh

echo "Starting deployment..."

# 1. Update Repo
git pull origin main

# 2. Build API
echo "Building API..."
cd apps/api
npm install
npm run build
cd ../..

# 3. Build Web
echo "Building Web..."
cd apps/web
npm install
npm run build
cd ../..

# 4. Prisma Migration
echo "Running Migrations..."
npx prisma migrate deploy

# 5. Restart Services (PM2)
echo "Restarting Services..."
pm2 restart simpleszap-api || pm2 start apps/api/dist/server.js --name simpleszap-api
pm2 restart simpleszap-web || pm2 start "npm start --prefix apps/web" --name simpleszap-web

echo "Deploy Complete!"
