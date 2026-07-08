# KRYROS E-commerce - Deployment Update Instructions

I have implemented the following changes:
1. **Redesigned Mobile Sidebar**: Now matches the Jumia-style unified menu.
2. **Automatic Currency Detection**: System now detects user location by IP and sets the currency automatically.

## How to deploy these changes to your Digital Ocean server:

Since your project is already set up with PM2 and Nginx, follow these steps to get the updates:

### 1. Connect to your server via SSH
Open your terminal (Terminus) and log in to your Digital Ocean droplet.

### 2. Pull the latest code
Navigate to the root directory of your project and pull the changes from GitHub:
```bash
cd /app
git pull origin main
```

### 3. Update and Rebuild Backend
The backend has new dependencies and files for geolocation.
```bash
cd /app/Backend
npm install
npm run build
pm2 restart backend
```

### 4. Update and Rebuild User-UI
The frontend has changes in the sidebar and currency store.
```bash
cd /app/User-UI
pnpm install
pnpm build
pm2 restart user-ui
```

### 5. Verify the changes
- Open your website on a mobile device to see the new sidebar.
- The currency should now automatically set itself based on your location.

**Note**: The geolocation service uses `ipapi.co` and `ip-api.com`. Ensure your server has outbound internet access (which it should have by default).
