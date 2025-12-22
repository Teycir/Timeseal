# TimeSeal Hardening - Quick Setup

## ✅ What's Included

### 1. Security Dashboard
- Automatically detects browser extensions
- Warns about crypto tampering
- Shows in bottom-right corner when issues detected

### 2. Warrant Canary
- Monthly transparency statement
- Easy to update via admin page
- Auto-reminds via GitHub Actions

### 3. Memory Protection
- Key A obfuscated in browser memory
- Keys zeroed after use
- Reduces malware risk

## 🚀 Usage

### Update Warrant Canary (Monthly)

1. Visit `/admin/canary` in your browser
2. Verify all checkboxes are true
3. Click "UPDATE CANARY"
4. Done! File updates automatically

### View Security Status

- Security warnings appear automatically
- Check `/canary.txt` anytime
- Dashboard shows in bottom-right if issues detected

### Self-Host (Optional)

See `docs/SELF-HOSTING.md` for full instructions.

Quick version:
```bash
npm install
wrangler d1 create timeseal-db
wrangler secret put MASTER_ENCRYPTION_KEY
npm run deploy
```

## 📋 Monthly Checklist

GitHub will create an issue automatically on the 1st of each month.

Manual steps:
1. Go to `/admin/canary`
2. Click "UPDATE CANARY"
3. Verify at `/canary.txt`

## 🔒 What This Protects

✅ Browser extension memory access (detection + warning)
✅ Cloudflare compromise (canary detection)
✅ Legal coercion (transparency via canary)
✅ Time manipulation (user can self-host)

## 📚 Documentation

- `docs/HARDENING.md` - Full technical details
- `docs/SELF-HOSTING.md` - Deploy your own instance
- `docs/TRANSPARENCY-REPORT-TEMPLATE.md` - Quarterly reports

## 🎯 Key Features

- **No PGP needed** - Simple web interface
- **Auto-reminders** - GitHub Actions monthly
- **Easy updates** - One-click canary update
- **Self-hosting** - Full control option
