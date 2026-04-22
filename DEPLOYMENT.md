# Deployment Guide — Shared Hosting (GoDaddy / cPanel)

## Prerequisites
- PHP 8.2+ with extensions: pdo_mysql, mbstring, bcmath, openssl, tokenizer, xml, ctype, json, fileinfo, gd
- MySQL 8.0+ database
- Composer (can run via SSH or terminal in cPanel)
- Node.js 18+ (for building frontend — do this locally, upload dist/)

---

## Step 1: Build Frontend Locally

```bash
cd frontend
npm install
VITE_API_URL=https://yourdomain.com/api npm run build
```

This creates `frontend/dist/` — upload this folder to your hosting's `public_html/`.

---

## Step 2: Upload Backend

Upload the entire `backend/` folder to your server — ideally **outside** `public_html`:

```
/home/youraccount/raa_backend/     ← Laravel app root
/home/youraccount/public_html/     ← Frontend + Laravel public/ symlink
```

Then **symlink** Laravel's `public/` into `public_html/api/`:
```
/home/youraccount/public_html/api/ → /home/youraccount/raa_backend/public/
```

Or configure `.htaccess` (see Step 5).

---

## Step 3: Configure Environment

```bash
cd /home/youraccount/raa_backend
cp .env.example .env
# Edit .env with your DB credentials and domain
```

Then:
```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan storage:link
```

---

## Step 4: Database Setup

In cPanel → MySQL Databases:
1. Create database: `raa_alteeb`
2. Create user with all privileges
3. Update `.env` DB_* fields

Then run:
```bash
php artisan migrate --seed
```

**Default login after seed:**
- Email: `admin@raa-alteeb.com`
- Password: `Admin@123456`

---

## Step 5: .htaccess Configuration

### public_html/.htaccess (frontend SPA routing)
```apache
Options -MultiViews
RewriteEngine On

# API requests → Laravel public/
RewriteCond %{REQUEST_URI} ^/api
RewriteRule ^api(/.*)?$ /api/index.php [L,QSA]

# React SPA — serve index.html for all routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

### raa_backend/public/.htaccess (Laravel standard)
```apache
Options -MultiViews -Indexes
RewriteEngine On
RewriteCond %{HTTP:Authorization} .
RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.php [L]
```

---

## Step 6: File Permissions

```bash
chmod -R 755 /home/youraccount/raa_backend
chmod -R 775 /home/youraccount/raa_backend/storage
chmod -R 775 /home/youraccount/raa_backend/bootstrap/cache
```

---

## Step 7: Optimize for Production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## Step 8: Cron Jobs (for scheduled tasks)

In cPanel → Cron Jobs, add:
```
* * * * * /usr/local/bin/php /home/youraccount/raa_backend/artisan schedule:run >> /dev/null 2>&1
```

---

## Step 9: SSL

Enable Free SSL (Let's Encrypt) via cPanel → SSL/TLS → AutoSSL.

After enabling HTTPS, update `.env`:
```
APP_URL=https://yourdomain.com
```

---

## Directory Structure Summary

```
/home/youraccount/
├── raa_backend/          ← Laravel (outside public_html)
│   ├── app/
│   ├── database/
│   ├── public/           ← symlinked or accessible as /api/
│   └── .env
└── public_html/          ← Web root
    ├── index.html        ← React SPA entry
    ├── assets/           ← React Vite build assets
    └── .htaccess
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 500 on API | Check `storage/logs/laravel.log`, fix permissions |
| 404 on refresh | Ensure SPA `.htaccess` is correct |
| Blank page | Check browser console, verify `VITE_API_URL` |
| Migration fails | Check DB credentials in `.env` |
| PDF not generating | Ensure `gd` or `imagick` PHP extension is enabled |

---

## Security Checklist

- [ ] `APP_DEBUG=false` in production
- [ ] Strong `APP_KEY` (use `php artisan key:generate`)
- [ ] HTTPS enforced
- [ ] `.env` is not publicly accessible (verify: `curl https://yourdomain.com/.env` should 404)
- [ ] Change default admin password immediately after first login
- [ ] Set `CORS_ALLOWED_ORIGINS` to only your domain
- [ ] Regular DB backups via cPanel backup tool
