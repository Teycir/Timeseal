### How do I get notified when my seal unlocks?

**Webhook Notifications (Optional)**

TimeSeal supports webhook notifications using a stateless, privacy-first architecture. Your webhook URL is encrypted with your seal's Key B and stored in the database—only decryptable when the seal unlocks.

**Supported Services:**
- 🎮 **Discord**: Server Settings → Integrations → Webhooks
- 💬 **Slack**: Apps → Incoming Webhooks  
- ⚡ **Zapier**: Create Webhook trigger (connects to 5000+ apps)
- 🔗 **IFTTT**: Webhooks service (SMS, email, smart home)
- 🛠️ **Custom**: Any HTTPS endpoint that accepts POST requests

**How to use:**
1. When creating a seal, paste your webhook URL in the optional field
2. URL is encrypted with Key B (never stored in plaintext)
3. When seal unlocks, webhook fires automatically
4. Receive instant notification with seal metadata

**Webhook Payload:**
```json
{
  "event": "seal_unlocked",
  "sealId": "abc123...",
  "unlockedAt": "2024-01-15T12:00:00Z"
}
```

**Security Features:**
- ✅ Encrypted with AES-GCM-256 (same as seal content)
- ✅ Only HTTPS endpoints allowed
- ✅ Fire-and-forget delivery (no retries, no logs)
- ✅ 5-second timeout prevents hanging
- ✅ Zero database schema changes (stateless design)
- ✅ Perfect forward secrecy (deleted with seal)

**Example: Discord Notification**
```bash
# 1. Create Discord webhook in your server
# 2. Copy webhook URL: https://discord.com/api/webhooks/...
# 3. Paste in TimeSeal webhook field when creating seal
# 4. Get pinged in Discord when seal unlocks
```

**Example: Email via Zapier (Free Tier)**
```bash
# 1. Create Zapier account (free)
# 2. New Zap: Webhooks → Catch Hook
# 3. Copy webhook URL
# 4. Add Gmail/Outlook action
# 5. Paste Zapier URL in TimeSeal
# 6. Get email when seal unlocks
```

**Privacy Guarantee:** Webhook URLs are never logged, never visible in API responses, and automatically deleted when the seal is deleted. We never see your webhook endpoint or notification content.
