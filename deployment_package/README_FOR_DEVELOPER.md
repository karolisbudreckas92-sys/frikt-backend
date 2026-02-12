# FRIKT App - Deployment Instructions for AWS

## Overview
This is a mobile app with:
- **Frontend**: Expo/React Native mobile app (iOS/Android)
- **Backend**: Python FastAPI server
- **Database**: MongoDB

## What Needs to Be Deployed

### 1. MongoDB Database
- Use **MongoDB Atlas** (recommended) OR
- Self-hosted MongoDB on EC2

### 2. FastAPI Backend
- Python 3.11+
- Can run on: EC2, Elastic Beanstalk, ECS, or Lambda
- Needs environment variables (see below)

---

## Environment Variables Required

Create these environment variables on your server:

```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/frikt_db
DB_NAME=frikt_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_EMAILS=karolisbudreckas92@gmail.com
CORS_ORIGINS="*"
```

---

## Deployment Option 1: EC2 (Simple)

### Step 1: Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance type: t3.small (minimum)
- Storage: 20GB
- Security Group: Open ports 80, 443, 8001

### Step 2: SSH into server and run:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install nginx
sudo apt install nginx -y

# Create app directory
sudo mkdir -p /app/backend
cd /app/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Copy backend files here (server.py, requirements.txt)
# Then install dependencies:
pip install -r requirements.txt

# Create .env file with environment variables
nano .env

# Create uploads directory
mkdir -p uploads/avatars
```

### Step 3: Set up systemd service
```bash
sudo nano /etc/systemd/system/frikt.service
```

Paste this:
```ini
[Unit]
Description=FRIKT FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/app/backend
EnvironmentFile=/app/backend/.env
ExecStart=/app/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

### Step 4: Start the service
```bash
sudo systemctl daemon-reload
sudo systemctl enable frikt
sudo systemctl start frikt
```

### Step 5: Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/frikt
```

Paste this:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/frikt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Add SSL (HTTPS)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## Deployment Option 2: Docker (Recommended for existing setups)

Use the included `Dockerfile` and `docker-compose.yml`

```bash
cd /app/backend
docker-compose up -d
```

---

## After Backend is Deployed

1. Note down your backend URL (e.g., `https://api.frikt.com`)
2. This URL is needed for building the mobile app
3. The mobile app will be configured to point to this URL

---

## Testing the Deployment

After deployment, test with:
```bash
curl https://your-domain.com/api/health
```

Should return:
```json
{"status": "healthy"}
```

---

## Files Included in This Package

- `server.py` - Main backend code
- `requirements.txt` - Python dependencies
- `.env.example` - Environment variables template
- `Dockerfile` - For Docker deployment
- `docker-compose.yml` - For Docker deployment
- `nginx.conf.example` - Nginx configuration

---

## Questions?

Contact the app owner for any questions about this deployment.
