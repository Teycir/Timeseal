# Analytics Setup

## Privacy-First Analytics Implementation

TimeSeal now includes built-in, privacy-first analytics with **zero external dependencies**.

### Features
- ✅ No cookies, no tracking, no personal data
- ✅ Only tracks aggregate metrics (page views, seal creation, unlocks)
- ✅ Stores country (from Cloudflare headers) but never IP addresses
- ✅ GDPR compliant by design
- ✅ Zero cost (uses existing D1 database)

### Setup Instructions

1. **Run Database Migration**
```bash
wrangler d1 execute DB --file=migrations/003_analytics.sql
```

2. **Deploy Updated Code**
```bash
npm run deploy
```

3. **Verify Analytics**
```bash
# Check stats endpoint
curl https://your-domain.workers.dev/api/stats

# Should return: {"totalSeals": 0}
```

### What Gets Tracked

**Events:**
- `page_view` - Every page load (path only, no query params)
- `seal_created` - When a seal is successfully created
- `seal_unlocked` - When a seal is successfully unlocked
- `pulse_received` - When a Dead Man's Switch pulse is received

**Data Stored:**
- Event type
- Path (e.g., `/v/[id]`)
- Referrer (where user came from)
- Country (from `cf-ipcountry` header)
- Timestamp

**Data NOT Stored:**
- IP addresses
- User IDs
- Cookies
- Session data
- Personal information

### Public Stats

The homepage now displays a "Seals Created" counter showing total seals created (social proof).

### Implementation Details

- **Client-side tracking**: Minimal inline script in `layout.tsx` (~200 bytes)
- **Server-side tracking**: Automatic tracking in API routes
- **Silent failures**: Analytics never breaks the app
- **Performance**: Async, non-blocking, <1ms overhead

### Privacy Compliance

No GDPR banner needed because:
- No cookies used
- No personal data collected
- No third-party services
- Aggregate metrics only

### Future Enhancements

Optional (not implemented):
- Admin dashboard at `/analytics` (password-protected)
- Daily/weekly email reports
- Export to CSV
- Retention policy (auto-delete old events)
