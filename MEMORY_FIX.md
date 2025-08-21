# Memory Fix for Large Excel Files (3 Lakh Records)

## Problem
Node.js running out of memory when processing 300,000+ records.

## Solution
1. **Streaming Processing**: Process Excel in chunks instead of loading all data at once
2. **Increased Heap Size**: 4GB instead of default 1.4GB
3. **Garbage Collection**: Force cleanup every 10 chunks

## Files to Upload to AWS:
- `routes/excel.js` (updated with streaming)
- `routes/money.js` (updated with streaming)  
- `ecosystem.config.js` (new PM2 config)
- `restart-with-memory-optimization.sh` (restart script)

## Commands to Run:
```bash
chmod +x restart-with-memory-optimization.sh
./restart-with-memory-optimization.sh
```

## Verify:
```bash
pm2 status
pm2 logs repotrack-backend
```

Now your app can handle 3 lakh records without crashing!
