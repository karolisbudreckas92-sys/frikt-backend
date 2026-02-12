# 🚀 FRIKT App - Quick Start Guide

## What You Need to Do

### Step 1: Send Files to Your Developer

Send your AWS developer these files:
- `README_FOR_DEVELOPER.md` (instructions)
- `server.py` (backend code)
- `requirements.txt` (dependencies)
- `.env.example` (configuration template)
- `Dockerfile` (optional, for Docker)
- `docker-compose.yml` (optional, for Docker)
- `nginx.conf.example` (web server config)

### Step 2: Set Up MongoDB Atlas (Free)

1. Go to **https://www.mongodb.com/atlas**
2. Click **"Try Free"**
3. Create account with your email
4. Create a FREE cluster (M0 Sandbox)
5. Create database user with password
6. Get connection string (looks like: `mongodb+srv://user:pass@cluster.mongodb.net/`)
7. Send this connection string to your developer

### Step 3: Get Your Backend URL

After your developer deploys, they will give you a URL like:
- `https://api.frikt.com` or
- `https://frikt-backend.your-domain.com`

**Save this URL!** You need it for the mobile app.

### Step 4: Build the Mobile App

Once you have the backend URL, come back and I'll help you:
1. Update the app with your production URL
2. Build the iOS app
3. Submit to App Store

---

## Summary of What Your Developer Needs to Do

| Task | Details |
|------|--------|
| 1. Set up server | EC2, ECS, or any Python hosting |
| 2. Install Python 3.11 | Backend requirement |
| 3. Set up MongoDB | Atlas (free) or self-hosted |
| 4. Configure environment | Use .env.example as template |
| 5. Set up HTTPS | SSL certificate required |
| 6. Give you the URL | e.g., https://api.frikt.com |

---

## Questions to Ask Your Developer

1. "Can you deploy a Python FastAPI app to our AWS?"
2. "Can you set up MongoDB Atlas or a MongoDB instance?"
3. "What will be the final HTTPS URL for the API?"

---

## Need Help?

Come back to this chat after your backend is deployed!
