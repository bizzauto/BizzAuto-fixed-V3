# Evolution API — Complete Developer Guide

> **Evolution API** is an open-source WhatsApp Web API that lets you connect WhatsApp via QR code scanning — no Meta Business approval needed. It uses the [Baileys](https://github.com/whiskeysockets/baileys) library under the hood.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [API Endpoints (BizzAuto Backend Proxy)](#api-endpoints-bizzauto-backend-proxy)
5. [API Endpoints (Direct Evolution API)](#api-endpoints-direct-evolution-api)
6. [Connection Flow](#connection-flow)
7. [Webhook Events](#webhook-events)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐     ┌──────────┐
│  BizzAuto   │────▶│  BizzAuto    │────▶│  Evolution API   │────▶│ WhatsApp │
│  Frontend   │     │  Backend API │     │  (Docker)        │     │  Servers │
│  (React)    │◀────│  (Express)   │◀────│  :8080           │◀────│          │
└─────────────┘     └──────────────┘     └──────────────────┘     └──────────┘
                           │                      │
                           ▼                      ▼
                     ┌──────────┐          ┌──────────┐
                     │PostgreSQL│          │  Redis   │
                     │ (App DB) │          │ (Cache)  │
                     └──────────┘          └──────────┘
```

The BizzAuto backend acts as a **proxy** — your frontend never calls Evolution API directly. It goes through our backend which handles encryption, webhook processing, and message persistence.

---

## Quick Start

### VPS / Coolify Deployment

Your app is already deployed on **Coolify** with Supabase. To add Evolution API:

**Step 1: Update your Coolify Docker Compose Stack**

The `docker-compose.prod.yml` now includes the `evolution-api` service. In Coolify:
1. Go to your **Coolify Dashboard** → your project
2. Click **Redeploy** — Coolify will detect the new `evolution-api` service and deploy it
3. Make sure your `EVOLUTION_API_KEY` env var is set in Coolify (min 32 chars)

**Step 2: Set Database (Optional)**

Evolution API creates its own tables (`Instances`, `Messages`, `Chats`) which are named differently from your app tables (`wa_instances`, `wa_messages`, `wa_chats`). So **table naming conflicts are not a concern**.

But if you prefer organization, create a separate **schema** (works on Supabase free tier — no need for a separate database):

1. Open **Supabase SQL Editor**
2. Run:
   ```sql
   CREATE SCHEMA IF NOT EXISTS evolution;
   ```
3. Set `EVOLUTION_DATABASE_URL` in Coolify env vars:
   ```
   EVOLUTION_DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?options=-c%20search_path=evolution
   ```

> 💡 If you skip this, Evolution API will use the same `DATABASE_URL` as your app. Since table names don't conflict, this works perfectly fine.

**Step 3: Set Webhook URL**

In Coolify, add this env var:
```
EVOLUTION_WEBHOOK_URL=https://bizzautoai.com/api/evolution/webhook
```

**Step 4: Configure in the App UI**

1. Go to **WhatsApp Module** → **Connection tab** → **Evolution API tab**
2. Click **"Configure Evolution API"**
3. Enter:
   - **API Base URL**: `http://evolution-api:8080` (Docker internal network)
   - **API Key**: Your `EVOLUTION_API_KEY` value
   - **Instance Name**: `bizzauto` (or leave blank for auto-generated)
4. Click **"Save Configuration"**
5. Click **"Connect & Get QR Code"**
6. A QR code will appear — scan it with WhatsApp on your phone!

### Local Development (Docker Desktop)

```bash
# Make sure EVOLUTION_API_KEY is set in .env
docker-compose up -d evolution-api
```

The Evolution API will be available at `http://evolution-api:8080` (internal Docker network) or `http://localhost:8080` (from host).

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EVOLUTION_API_URL` | `http://evolution-api:8080` | URL of the Evolution API server |
| `EVOLUTION_API_KEY` | — | API key for Evolution API authentication |
| `EVOLUTION_INSTANCE_NAME` | `bizzauto` | Default WhatsApp instance name |
| `EVOLUTION_WHITELIST_IPS` | — | Comma-separated IPs allowed without API key |

---

## API Endpoints (BizzAuto Backend Proxy)

All endpoints are prefixed with `/api/evolution` and require authentication (JWT token) unless noted.

### Configuration

#### `GET /api/evolution/config`
Get Evolution API configuration status for the current business.

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "status": "disconnected",
    "instanceName": "bizzauto",
    "baseUrl": "http://evolution-api:8080"
  }
}
```

#### `POST /api/evolution/config`
Save Evolution API configuration.

**Request Body:**
```json
{
  "baseUrl": "http://evolution-api:8080",
  "apiKey": "your-api-key",
  "instanceName": "bizzauto"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Evolution API config saved"
}
```

### Instance Management

#### `POST /api/evolution/instance`
Create a new WhatsApp instance on the Evolution API server.

**Request Body:**
```json
{
  "baseUrl": "http://evolution-api:8080",
  "apiKey": "your-api-key",
  "instanceName": "bizzauto",
  "webhookUrl": "https://your-domain.com/api/evolution/webhook/business-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "instance": { "id": "instance_abc123", "state": "connecting" },
    "qrcode": { "code": "QR_CODE_DATA", "base64Image": "data:image/png;base64,..." }
  }
}
```

#### `POST /api/evolution/connect`
Connect to an existing instance and generate a new QR code.

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "QR_CODE_DATA_OR_BASE64",
    "qrCodeBase64": "data:image/png;base64,...",
    "status": "scanning"
  }
}
```

#### `GET /api/evolution/status`
Get the current connection status.

**Response (connected):**
```json
{
  "success": true,
  "data": {
    "status": "connected",
    "phone": "919876543210",
    "profileName": "Business Name",
    "profilePicUrl": "https://..."
  }
}
```

**Response (disconnected):**
```json
{
  "success": true,
  "data": {
    "status": "disconnected"
  }
}
```

#### `POST /api/evolution/disconnect`
Logout/disconnect the WhatsApp instance.

**Response:**
```json
{ "success": true, "message": "Disconnected successfully" }
```

#### `DELETE /api/evolution/instance`
Delete the instance entirely from Evolution API.

**Response:**
```json
{ "success": true, "message": "Instance deleted" }
```

### Messaging

#### `POST /api/evolution/send/text`
Send a text message.

**Request Body:**
```json
{
  "to": "+919876543210",
  "message": "Hello! How can we help you?",
  "delay": 0,
  "linkPreview": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": { "id": "ABEGkX...", "remoteJid": "919876543210@s.whatsapp.net" },
    "status": "sent"
  }
}
```

#### `POST /api/evolution/send/media`
Send a media message (image, video, document, audio).

**Request Body:**
```json
{
  "to": "+919876543210",
  "mediaUrl": "https://example.com/image.jpg",
  "mediaType": "image",
  "caption": "Check this out!",
  "delay": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": { "key": { "id": "ABEGkX..." }, "status": "sent" }
}
```

#### `POST /api/evolution/send/template`
Send a button/list template message.

**Request Body:**
```json
{
  "to": "+919876543210",
  "templateData": {
    "text": "Choose an option:",
    "footer": "Reply with your choice",
    "buttons": [
      { "type": "reply", "title": "Yes" },
      { "type": "reply", "title": "No" },
      { "type": "url", "title": "Visit Site", "url": "https://example.com" }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": { "key": { "id": "ABEGkX..." } }
}
```

#### `POST /api/evolution/send/bulk`
Send messages in bulk (queued for rate-limited background processing).

**Request Body:**
```json
{
  "messages": [
    { "to": "+919876543210", "type": "text", "content": "Message 1", "contactId": "contact1" },
    { "to": "+919876543211", "type": "text", "content": "Message 2", "contactId": "contact2" }
  ],
  "delayBetween": 2000,
  "campaignId": "campaign-123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "queued": 100,
    "estimatedTime": "3m 20s"
  }
}
```

### Chats & Contacts

#### `GET /api/evolution/chats`
Fetch all WhatsApp chats.

**Response:**
```json
{
  "success": true,
  "data": [
    { "jid": "919876543210@s.whatsapp.net", "name": "Rahul", "lastMessage": "...", "unreadCount": 2 }
  ]
}
```

#### `POST /api/evolution/messages`
Fetch messages for a specific chat.

**Request Body:**
```json
{
  "remoteJid": "919876543210@s.whatsapp.net",
  "limit": 50,
  "offset": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": ["..."]
}
```

#### `POST /api/evolution/check-number`
Check if a phone number is registered on WhatsApp.

**Request Body:**
```json
{ "number": "+919876543210" }
```

**Response:**
```json
{
  "success": true,
  "data": { "exists": true, "jid": "919876543210@s.whatsapp.net" }
}
```

### Webhooks (No Auth)

#### `POST /api/evolution/webhook/:businessId`
Webhook receiver called by Evolution API for events.

**Request Body (CONNECTION_UPDATE):**
```json
{
  "event": "CONNECTION_UPDATE",
  "data": { "status": "open" }
}
```

**Request Body (MESSAGES_UPSERT):**
```json
{
  "event": "MESSAGES_UPSERT",
  "data": {
    "key": { "remoteJid": "919876543210@s.whatsapp.net", "fromMe": false },
    "message": { "conversation": "Hello!" }
  }
}
```

**Request Body (QRCODE_UPDATED):**
```json
{
  "event": "QRCODE_UPDATED",
  "data": { "qrcode": { "code": "..." } }
}
```

**Response:**
```json
{ "success": true }
```

---

## API Endpoints (Direct Evolution API)

If you need to call Evolution API directly (not through the proxy):

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/instance/create` | Create a new instance |
| `POST` | `/instance/connect/:name` | Connect/start instance |
| `GET` | `/instance/qrcode/:name` | Get QR code |
| `GET` | `/instance/fetchInstances` | Fetch all instances |
| `DELETE` | `/instance/logout/:name` | Logout instance |
| `DELETE` | `/instance/delete/:name` | Delete instance |
| `POST` | `/message/sendText/:name` | Send text message |
| `POST` | `/message/sendMedia/:name` | Send media message |
| `POST` | `/message/sendButtons/:name` | Send button template |
| `POST` | `/chat/fetchChats/:name` | Fetch all chats |
| `POST` | `/chat/fetchMessages/:name` | Fetch messages |
| `POST` | `/chat/whatsappNumbers/:name` | Check phone numbers |

All direct calls require header: `apikey: your-api-key`

---

## Connection Flow

```
User clicks "Connect & Get QR Code"
         │
         ▼
Backend calls POST /instance/connect/:name
         │
         ▼
Backend calls GET /instance/qrcode/:name
         │
         ▼
QR code displayed to user
         │
         ▼
User scans QR code with WhatsApp phone app
         │
         ▼
Evolution API sends webhook: CONNECTION_UPDATE (status: "open")
         │
         ▼
Backend updates status to "connected" in DB
         │
         ▼
Frontend polls GET /api/evolution/status → "connected"
         │
         ▼
✅ WhatsApp is connected!
```

---

## Webhook Events

| Event | Description | Triggered When |
|-------|-------------|----------------|
| `CONNECTION_UPDATE` | Connection state changed | QR scanned, disconnected |
| `QRCODE_UPDATED` | New QR code generated | Instance restarted, QR expired |
| `MESSAGES_UPSERT` | New message received | Someone sends a message |
| `MESSAGES_UPDATE` | Message status changed | Message delivered/read |
| `SEND_MESSAGE` | Message sent | Outbound message sent |
| `CONTACTS_UPSERT` | Contact list updated | New contact detected |
| `CHATS_UPSERT` | Chat list updated | New conversation started |

The BizzAuto webhook handler automatically:
- Saves incoming messages to the database
- Creates/updates contacts in the CRM
- Updates message status (sent → delivered → read)
- Triggers auto-reply rules (if enabled)

---

## Troubleshooting

### "Evolution API not configured for this business"
- Go to WhatsApp module → Evolution API tab → Configure Evolution API
- Enter your Evolution API URL and API key

### "Failed to connect Evolution API instance"
- Check if Evolution API server is running: `curl http://localhost:8080`
- Check Docker logs: `docker-compose logs evolution-api`
- Verify API key matches in both `.env` and the UI

### QR code not appearing
- The instance may already be connected. Try disconnecting first.
- Check Evolution API logs for errors: `docker logs bizzauto-evolution`

### Messages not sending
- Check connection status in the WhatsApp module
- Verify the phone number is registered on WhatsApp
- Check Evolution API logs: `docker-compose logs evolution-api`

### Webhook not receiving messages
- Ensure your app is accessible from Evolution API (not `localhost` in production)
- Check the webhook URL is correctly set when creating the instance
- Verify no firewall is blocking the connection
