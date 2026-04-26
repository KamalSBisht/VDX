# Creative Asset Extractor

A full-stack web application to extract fonts, images, and videos from websites.

## Features
- **Font Extractor**: Extracts `@font-face` declarations from CSS files.
- **Image Extractor**: Extracts all images with search, filter, and ZIP download capabilities.
- **Video Extractor**: Extracts direct video links (Safe Mode).

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file based on `.env.example`:
   ```env
   PORT=3000
   NODE_ENV=development
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Firebase Deployment Guide

To deploy this application using Firebase Hosting and Cloud Functions:

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init
   ```
   - Select **Hosting** and **Functions**.
   - Choose your Firebase project.
   - Use `TypeScript` for Functions.
   - Set `dist` as the public directory for Hosting.

2. **Structure for Firebase**
   Move the Express backend code (`server.ts`) into the `functions/src/index.ts` file and export it as an HTTPS function:
   ```typescript
   import * as functions from 'firebase-functions';
   import express from 'express';
   // ... existing express setup ...
   
   export const api = functions.https.onRequest(app);
   ```

3. **Update `firebase.json`**
   Configure Hosting to rewrite `/api` requests to the Cloud Function:
   ```json
   {
     "hosting": {
       "public": "dist",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [
         {
           "source": "/api/**",
           "function": "api"
         },
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

4. **Deploy**
   ```bash
   npm run build
   firebase deploy
   ```
