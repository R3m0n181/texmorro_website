# Production Deployment Guide - Texmorro Website

## Pre-Deployment Checklist

### Security
- [x] Move Firebase credentials to environment variables
- [ ] **CRITICAL:** Restrict Firebase API key in [Firebase Console](https://console.firebase.google.com/)
  - Go to Project Settings → API Keys
  - Click the API key used for web
  - Under "Application restrictions", select "HTTP referrers (web sites)"
  - Add your production domain(s)
  - Under "API restrictions", select specific APIs if needed
- [ ] Enable HTTPS on your server (required for Firebase Auth)
- [ ] Set up CORS properly if API calls come from different domain

### Performance
- [x] CSS and JS files are already minified
- [ ] Test all assets load correctly
- [ ] Enable gzip compression on server
- [ ] Set proper cache headers for static assets
- [ ] Test on production domain before going live

### Configuration
- [ ] Update `.env.production` with production Firebase config (if different)
- [ ] Verify all environment variables are set on your server

---

## Deployment Steps

### 1. Prepare Your Server
```bash
# Clone repository on your server
git clone <your-repo-url>
cd texmorro_website

# Install dependencies
npm install

# Create .env file (use .env.production as template)
cp .env.production .env
```

### 2. Set Environment Variables
Set these environment variables on your server:
```
VITE_FIREBASE_API_KEY=AIzaSyDcOcGYXHgma9yFdUqNSKmeVi_Ew_Sbp3Q
VITE_FIREBASE_AUTH_DOMAIN=texmorro-c6c76.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=texmorro-c6c76
VITE_FIREBASE_STORAGE_BUCKET=texmorro-c6c76.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=942262670790
VITE_FIREBASE_APP_ID=1:942262670790:web:aec64957c1078190018ec7
VITE_FIREBASE_MEASUREMENT_ID=G-3KXZMCXC6S
```

**Options:**
- **Traditional hosting**: Add to `.env.production` or server environment variables
- **Docker**: Include in docker-compose or K8s secrets
- **VPS/Dedicated**: Set in `.bashrc` or use a secrets manager

### 3. Web Server Configuration

**For Nginx:**
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Serve HTML files
    location / {
        root /path/to/texmorro_website;
        try_files $uri $uri/ /index.html;
    }
}
```

**For Apache:**
```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    DocumentRoot /path/to/texmorro_website

    # Enable compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
    </IfModule>

    # Cache headers
    <FilesMatch "\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$">
        Header set Cache-Control "max-age=2592000, public"
    </FilesMatch>

    # HTTPS
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/key.pem
</VirtualHost>
```

### 4. Run the Site
```bash
# Option 1: Simple HTTP server (production use only with reverse proxy)
npm run preview

# Option 2: Using Node.js with http-server
npx http-server -p 8080

# Option 3: Use systemd service (for Linux)
# Create /etc/systemd/system/texmorro.service
```

### 5. Systemd Service File (Linux VPS)
Create `/etc/systemd/system/texmorro.service`:
```ini
[Unit]
Description=Texmorro Website
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/texmorro_website
ExecStart=/usr/bin/npx http-server -p 8080
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then run:
```bash
sudo systemctl enable texmorro
sudo systemctl start texmorro
```

---

## Firebase Configuration for Production

### Restrict API Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Settings → API Keys
4. Click your web API key
5. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add: `https://yourdomain.com`
   - Add: `https://www.yourdomain.com`
6. Under "API restrictions":
   - Select "Restrict to specific APIs"
   - Enable: "Cloud Firestore API", "Firebase Authentication API"

### Enable Security Rules
In Firestore:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated admins can read/delete
    match /sample_enquiries/{document=**} {
      allow read, delete: if request.auth != null;
      allow create: if true; // Allow form submissions
    }
    match /brand_enquiries/{document=**} {
      allow read, delete: if request.auth != null;
      allow create: if true;
    }
    match /corporate_enquiries/{document=**} {
      allow read, delete: if request.auth != null;
      allow create: if true;
    }
  }
}
```

---

## Monitoring & Maintenance

### Check Health
```bash
# Test if site loads
curl https://yourdomain.com

# Check logs
journalctl -u texmorro -f

# Monitor performance
pm2 monitor  # if using PM2
```

### SSL Certificates
- Use Let's Encrypt (free): `certbot certonly --webroot -d yourdomain.com`
- Set auto-renewal: `certbot renew --dry-run`

### Regular Updates
```bash
# Keep dependencies updated
npm update
npm audit fix
```

---

## Troubleshooting

**404 errors on refresh:**
- Configure server to serve `index.html` for all routes
- Check nginx/apache rewrite rules

**Firebase auth failing:**
- Verify API key is whitelisted for your domain
- Check HTTPS is enabled
- Review browser console errors

**Assets not loading:**
- Check file paths are correct
- Verify CORS headers if assets on CDN
- Check cache headers aren't too aggressive

---

## Support

For Firebase issues, see: https://firebase.google.com/docs
For deployment questions, check your hosting provider's documentation.
