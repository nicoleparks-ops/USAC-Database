# 🚀 LOCAL TESTING QUICK START (Docker)

## Step-by-Step Guide for Beginners

### **Step 1: Install Docker Desktop** (5 minutes)

**Windows & Mac:**
1. Download: https://www.docker.com/products/docker-desktop
2. Run the installer
3. Restart your computer
4. Open Terminal/Command Prompt and verify:
   ```bash
   docker --version
   docker-compose --version
   ```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo usermod -aG docker $USER
# Log out and back in, or run: newgrp docker
```

---

### **Step 2: Clone Your Repository** (2 minutes)

Open Terminal/Command Prompt and run:

```bash
# Navigate to where you want the project
cd Desktop

# Clone the repository
git clone https://github.com/nicoleparks-ops/USAC-Database.git

# Enter the directory
cd USAC-Database
```

---

### **Step 3: Start the Application** (1 minute)

```bash
# Start Docker containers
docker-compose up -d
```

**What this does:**
- Downloads Node.js image
- Downloads PostgreSQL image
- Creates two containers (API server + Database)
- Starts them in the background

**Expected output:**
```
Creating usac-db ... done
Creating usac-api ... done
```

---

### **Step 4: Wait for Setup** (30-60 seconds)

The database needs time to initialize. Check progress:

```bash
docker-compose logs -f api
```

**Wait until you see:**
```
Server running on http://localhost:3000
Webhook endpoint: http://localhost:3000/webhooks/webconnex
Dashboard available at: http://localhost:3000/dashboard
```

Press `Ctrl+C` to exit logs.

---

### **Step 5: Open Dashboard** (10 seconds)

Open your web browser and visit:

```
http://localhost:3000/dashboard
```

**You should see:**
- 📊 Dashboard with statistics cards
- 👥 Participants table (empty for now)
- 📋 Registrations table (empty for now)
- ✅ Check-ins table (empty for now)

---

## ✅ Testing It Works

### **Test 1: Health Check**

Open a new Terminal and run:

```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-27T00:00:00.000Z",
  "uptime": 123.456
}
```

### **Test 2: API Endpoint**

```bash
curl http://localhost:3000/api/reports/stats
```

**Expected response:**
```json
{
  "stats": {
    "total_participants": 0,
    "total_registrations": 0,
    "total_events": 0,
    "checked_in_count": 0,
    "total_attendance": 0,
    "total_fees_collected": "0.00"
  }
}
```

---

## 📤 Testing Webhook Reception

To test receiving a webhook from Webconnex, run this command:

```bash
curl -X POST http://localhost:3000/webhooks/webconnex \
  -H "Content-Type: application/json" \
  -H "x-webconnex-signature: 0c6979a0b4a5a5f5b5f5c5f5c5f5c5f5c5f5c5f5c5f5c5f5c5f5c5f5c5f5c5f5" \
  -d '{
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "event_type": "participant.created",
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "ageGroup": "14-16",
      "gender": "Male",
      "school": "Lincoln High School",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90001"
    },
    "timestamp": "2026-06-27T00:00:00Z"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Event received and queued for processing",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "db_id": 1
}
```

**Then refresh the dashboard** → You should see:
- 1 Participant added
- Statistics updated

---

## 📋 Useful Docker Commands

### **View Logs**
```bash
# API logs
docker-compose logs -f api

# Database logs
docker-compose logs -f db

# Both
docker-compose logs -f
```

### **View Running Containers**
```bash
docker-compose ps
```

**Expected output:**
```
NAME      COMMAND                  STATE      PORTS
usac-db   docker-entrypoint.s...   Up         0.0.0.0:5432->5432/tcp
usac-api  node src/index.js         Up         0.0.0.0:3000->3000/tcp
```

### **Access Database**
```bash
docker-compose exec db psql -U usac_user -d usac_db
```

Then try:
```sql
SELECT COUNT(*) FROM participants;
\dt  -- List all tables
\q   -- Quit
```

### **Stop Everything**
```bash
docker-compose down
```

### **Stop and Reset (Delete all data)**
```bash
docker-compose down -v
```

### **Restart Services**
```bash
docker-compose restart
```

### **View Container Details**
```bash
docker-compose ps
docker logs usac-api
docker inspect usac-db
```

---

## 🔧 Common Issues & Solutions

### **Issue: "Port 3000 already in use"**

**Solution:** Change the port in `docker-compose.yml`

```yaml
# Find this line:
ports:
  - "3000:3000"

# Change to:
ports:
  - "3001:3000"

# Then access: http://localhost:3001/dashboard
```

### **Issue: "Database connection refused"**

```bash
# Wait a few seconds and try again
# Or restart database:
docker-compose restart db

# Check logs:
docker-compose logs db
```

### **Issue: "Cannot find Docker"**

- Make sure Docker Desktop is running
- Restart Docker Desktop
- Verify installation: `docker --version`

### **Issue: Dashboard won't load**

```bash
# Check if API is running
curl http://localhost:3000/health

# View logs
docker-compose logs -f api

# Restart
docker-compose restart api
```

### **Issue: Want to reset everything**

```bash
# Stop and remove all containers and data
docker-compose down -v

# Rebuild from scratch
docker-compose up -d

# Wait 30 seconds for database to initialize
```

---

## 🧪 Testing Workflow

### **Typical Testing Flow:**

1. **Start everything:**
   ```bash
   docker-compose up -d
   ```

2. **Check health:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Open dashboard:**
   - Browser: http://localhost:3000/dashboard

4. **Send test webhook:**
   ```bash
   curl -X POST http://localhost:3000/webhooks/webconnex \
     -H "Content-Type: application/json" \
     -H "x-webconnex-signature: YOUR_SIGNATURE" \
     -d '{...event data...}'
   ```

5. **Check dashboard:**
   - Refresh browser
   - Should see new data

6. **View logs:**
   ```bash
   docker-compose logs -f api
   ```

7. **Stop everything:**
   ```bash
   docker-compose down
   ```

---

## 📊 What Each Container Does

### **usac-api** (Port 3000)
- Node.js application
- Receives webhooks
- Serves dashboard
- Provides API endpoints

### **usac-db** (Port 5432)
- PostgreSQL database
- Stores participants, registrations, attendance
- Auto-creates tables on first run

---

## 🌐 Local Endpoints

Once running, you can access:

| What | URL |
|------|-----|
| Dashboard | http://localhost:3000/dashboard |
| API Docs | http://localhost:3000/ |
| Health Check | http://localhost:3000/health |
| Participants | http://localhost:3000/api/participants |
| Registrations | http://localhost:3000/api/registrations |
| Attendance | http://localhost:3000/api/attendance |
| Stats | http://localhost:3000/api/reports/stats |
| Webhook | http://localhost:3000/webhooks/webconnex (POST only) |

---

## 🎯 Next Steps After Testing

1. ✅ Verify everything works locally
2. ✅ Test dashboard shows data correctly
3. ✅ Then deploy online (DigitalOcean or Heroku)
4. ✅ Update Webconnex with your real webhook URL

---

## 💡 Pro Tips

- **Keep dashboard open** in browser, refresh to see real-time updates
- **Monitor logs** while testing: `docker-compose logs -f api`
- **Test with sample data** before connecting real Webconnex
- **Back up your data** before running `docker-compose down -v`

---

## 🆘 Still Stuck?

If something doesn't work:

1. **Check logs:**
   ```bash
   docker-compose logs
   ```

2. **Restart everything:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **Reset completely:**
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

4. **Check Docker is running:**
   ```bash
   docker ps
   ```

Good luck! 🚀
