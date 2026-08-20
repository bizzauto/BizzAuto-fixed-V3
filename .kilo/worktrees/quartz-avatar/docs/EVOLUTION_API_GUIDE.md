# Evolution API Integration Guide

## What is Evolution API?

Evolution API is an open-source WhatsApp API that allows you to send and receive messages via WhatsApp Web. It's a self-hosted alternative to the official Meta WhatsApp Cloud API.

**GitHub:** https://github.com/EvolutionAPI/evolution-api

---

## Step 1: Install Evolution API

### Option A: Self-Host (Recommended for Production)

```bash
# Clone the repository
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your .env file:
# - Set DATABASE_URL to your MongoDB
# - Set API_KEY to a strong random string
# - Configure other settings as needed

# Start the server
npm run start:prod
```

### Option B: Use Docker

```bash
docker run -d \
  -p 8080:8080 \
  -e API_KEY=your-secret-key \
  -e DATABASE_URL=mongodb://mongo:27017/evolution \
  --name evolution-api \
  atendai/evolution-api:latest
```

---

## Step 2: Configure Evolution API in BizzAuto

1. **Navigate to WhatsApp Module**
   - Go to WhatsApp section in your BizzAuto dashboard
   - Select "Evolution API" mode (toggle from Meta mode)

2. **Enter API Details**
   - **Base URL:** Your Evolution API URL (e.g., `http://localhost:8080` or `https://evolution.yourdomain.com`)
   - **API Key:** The API_KEY you set in Evolution's .env file
   - **Instance Name:** A unique name for your WhatsApp instance (e.g., `my-business-whatsapp`)

3. **Save Configuration**
   - Click "Save Configuration"
   - The settings will be stored in your database

---

## Step 3: Connect WhatsApp via QR Code

1. **Click "Connect & Get QR Code"**
   - After saving config, click the connect button
   - A QR code will be generated

2. **Scan with Your Phone**
   - Open WhatsApp on your phone
   - Go to Settings (⋮) > Linked Devices
   - Tap "Link a Device"
   - Point your phone camera at the QR code on screen

3. **Wait for Connection**
   - After scanning, wait 5-10 seconds
   - The status will change to "Connected"
   - Your WhatsApp is now linked!

---

## Step 4: Start Messaging

Once connected, you can:

### Send Messages
- Navigate to any contact
- Type and send messages directly from BizzAuto
- Messages sync in real-time

### View Chats
- All your WhatsApp conversations appear in the Chats tab
- Click on any contact to view message history

### Create Campaigns
- Use the Broadcast feature to send bulk messages
- Schedule campaigns for later

### Auto-Reply Setup
- Configure auto-reply rules in Settings
- Set keyword-based responses

---

## Available API Endpoints

BizzAuto exposes these Evolution API endpoints:

### Configuration
```
GET    /api/evolution/config              - Get current config
POST   /api/evolution/config              - Save config
```

### Instance Management
```
POST   /api/evolution/instance            - Create new instance
POST   /api/evolution/connect             - Get QR code
GET    /api/evolution/status              - Check connection status
POST   /api/evolution/disconnect          - Disconnect instance
DELETE /api/evolution/instance            - Delete instance
```

### Messaging
```
POST   /api/evolution/send/text           - Send text message
POST   /api/evolution/send/media          - Send media message
POST   /api/evolution/send/template       - Send template
POST   /api/evolution/send/bulk           - Bulk send to contacts
```

### Data Retrieval
```
GET    /api/evolution/chats               - Fetch all chats
GET    /api/evolution/messages            - Fetch messages
POST   /api/evolution/check-number        - Check if number exists
```

### Webhooks
```
POST   /api/evolution/webhook/:businessId - Receive webhook events
```

---

## Webhook Configuration

Evolution API sends webhooks for real-time events:

1. **Configure Webhook URL in Evolution API**
   ```
   https://your-bizzauto-domain.com/api/evolution/webhook/YOUR_BUSINESS_ID
   ```

2. **Events You'll Receive:**
   - New incoming messages
   - Message status updates (sent, delivered, read)
   - Connection status changes
   - QR code updates

3. **Webhook Processing:**
   - BizzAuto automatically processes incoming webhooks
   - Messages are saved to database
   - Chat lists update in real-time

---

## Troubleshooting

### QR Code Not Scanning
- Make sure Evolution API server is running
- Check API key matches between Evolution and BizzAuto
- Verify Base URL is accessible from BizzAuto server

### Messages Not Sending
- Check instance is connected (status should be "open")
- Verify phone number format: must include country code (e.g., `919876543210@s.whatsapp.net`)
- Check Evolution API logs for errors

### Connection Lost
- Click "Disconnect" then "Connect" again
- Re-scan QR code if needed
- Check if Evolution API server is still running

### API Not Responding
- Verify Evolution API is running on correct port
- Check firewall settings
- Test API directly: `curl http://localhost:8080/instance/fetchInstances`

---

## Best Practices

1. **Security:**
   - Use strong API keys (64+ characters)
   - Enable authentication in Evolution API
   - Use HTTPS in production
   - Never expose API keys in frontend code

2. **Performance:**
   - Limit bulk messages to 1000 per batch
   - Use webhooks instead of polling
   - Clear old messages periodically

3. **Compliance:**
   - Respect WhatsApp Business Policy
   - Get user consent before messaging
   - Provide opt-out option
   - Don't send spam

---

## Need Help?

- Evolution API Docs: https://doc.evolution-api.com/
- Evolution API GitHub: https://github.com/EvolutionAPI/evolution-api
- BizzAuto Support: Check your dashboard help section
