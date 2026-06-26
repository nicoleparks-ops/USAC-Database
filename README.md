# USAC-Database

A webhook-driven system that creates and maintains a database from Webconnex event data.

## Overview

This project receives real-time event data from Webconnex through webhooks, processes the data, and stores it in a persistent database.

## Features

- ✅ Webhook endpoint for receiving Webconnex events
- ✅ Data validation and transformation
- ✅ Persistent database storage
- ✅ Event logging and monitoring
- ✅ Error handling and retry logic

## Tech Stack

- **Backend**: Node.js 18+ with Express.js
- **Database**: PostgreSQL
- **Container**: Docker & Docker Compose
- **Validation**: Joi
- **Logging**: Winston

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Docker & Docker Compose (optional)
- Webconnex API credentials and webhook configuration

### Installation

```bash
# Clone the repository
git clone https://github.com/nicoleparks-ops/USAC-Database.git
cd USAC-Database

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database and webhook credentials

# Start the server (requires PostgreSQL running)
npm start
```

### Docker Setup

```bash
# Start services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## Architecture

```
Webconnex Webhook
       ↓
   Express API
       ↓
 Validation (Joi)
       ↓
 PostgreSQL DB
```

## Configuration

Set these environment variables in your `.env` file:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/usac_db
WEBCONNEX_WEBHOOK_SECRET=your_webhook_secret_here
LOG_LEVEL=info
```

## API Endpoints

### Webhook Receiver
- `POST /webhooks/webconnex` - Receive Webconnex events
  - Requires: `x-webconnex-signature` header with HMAC-SHA256 signature
  - Body: `{ event_id, event_type, data, timestamp }`
  - Response: 202 Accepted

### Health Check
- `GET /health` - Server health status
  - Response: 200 OK with database connectivity status

### Event Retrieval
- `GET /webhooks/events?status=processed&limit=50&offset=0` - List stored events
  - Query params:
    - `status`: pending, processed, error
    - `limit`: results per page (default: 50)
    - `offset`: pagination offset (default: 0)

## Database Schema

### webconnex_events

```sql
CREATE TABLE webconnex_events (
  id SERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  event_type VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

```bash
# Run in development mode (with auto-reload)
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Webhook Signature Verification

Webhooks are signed using HMAC-SHA256. To verify:

1. Extract the `x-webconnex-signature` header
2. Create HMAC-SHA256 hash of the raw request body using your webhook secret
3. Compare with the signature header

Example verification is built-in to the validation middleware.

## Monitoring & Logs

Events are logged to:
- **Console**: Real-time development feedback
- **./logs/combined.log**: All events
- **./logs/error.log**: Error events only

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Create a Pull Request

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
