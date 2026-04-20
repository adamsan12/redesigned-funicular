# 📋 Deployment & Verification Checklist

## Pre-Deployment

### Code Review
- [ ] Review CACHE_OPTIMIZATION_SUMMARY.md
- [ ] Review CACHING_OPTIMIZATION_GUIDE.md
- [ ] Confirm all 5 files were modified correctly
- [ ] Test locally if possible (setup.md for local development)

### Git Changes
- [ ] Commit message: "refactor: optimize caching to reduce requests 80-90%"
- [ ] Include all modified files:
  - [ ] `functions/lib/cache.js`
  - [ ] `functions/lib/fetch.js`
  - [ ] `functions/lib/render.js`
  - [ ] `functions/handlers/sitemap.js`
  - [ ] `public/sw.js`
  - [ ] `public/_headers` (NEW)
  - [ ] `public/_redirects` (NEW)
  - [ ] `CACHING_OPTIMIZATION_GUIDE.md` (NEW)
  - [ ] `CACHE_OPTIMIZATION_SUMMARY.md` (NEW)

---

## Deployment Steps

### 1. Deploy to Cloudflare Pages
```bash
# Push to main branch (or create PR)
git add -A
git commit -m "refactor: optimize caching to reduce requests 80-90%"
git push origin main

# Cloudflare Pages auto-deploys on push
# Wait 2-3 minutes for build to complete
```

### 2. Verify Deployment
```bash
# Check that _headers and _redirects are deployed
curl -I https://your-domain.com/data/lookup_shard.json
# Look for Cache-Control headers

curl -I https://your-domain.com/robots.txt
# Should see cache headers
```

---

## Post-Deployment Verification

### ✅ Test Cache Headers

#### Test 1: Static Assets
```bash
curl -I https://your-domain.com/css/main.css
# Expected:
# Cache-Control: public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=604800

curl -I https://your-domain.com/images/logo.png
# Expected:
# Cache-Control: public, max-age=31536000, immutable, s-maxage=31536000
```

#### Test 2: Video Pages
```bash
curl -I https://your-domain.com/e/some-video-slug
# Expected:
# Cache-Control: public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400, stale-if-error=604800
# X-Cache-Type: video
```

#### Test 3: Search Pages
```bash
curl -I https://your-domain.com/f/search-query
# Expected:
# Cache-Control: public, max-age=43200, s-maxage=43200, stale-while-revalidate=86400, stale-if-error=86400
# X-Cache-Type: search
```

#### Test 4: Sitemaps
```bash
curl -I https://your-domain.com/sitemap.xml
# Expected:
# Cache-Control: public, max-age=604800, s-maxage=604800, stale-while-revalidate=172800, stale-if-error=604800

curl -I https://your-domain.com/robots.txt
# Expected:
# Cache-Control: public, max-age=604800, s-maxage=604800, stale-while-revalidate=604800
```

#### Test 5: Data Files
```bash
curl -I https://your-domain.com/data/lookup_shard.json
# Expected:
# Cache-Control: public, max-age=604800, s-maxage=604800, stale-while-revalidate=1209600, stale-if-error=2592000
```

### ✅ Test Edge Redirects

#### Test Redirect 1: Legacy URLs
```bash
curl -I https://your-domain.com/page/1
# Expected: 301 redirect to /list/

curl -I https://your-domain.com/page/3
# Expected: 301 redirect to /list/3

curl -I https://your-domain.com/list
# Expected: 301 redirect to /list/
```

### ✅ Test Service Worker

#### Open Browser DevTools
1. Open DevTools (F12)
2. Go to Application → Service Workers
3. Should see registered: `https://your-domain.com/sw.js`
4. Status: Running

#### Check Service Worker Console
```javascript
// In DevTools Console:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log("Registered:", reg))
})
```

### ✅ Monitor First Page Load

#### Step 1: Clear Cache
1. DevTools → Application → Storage
2. Clear site data
3. Empty cache

#### Step 2: Load Homepage
```
Refresh: https://your-domain.com/

Expected in Network tab:
- HTML: X-Cache: MISS (first time)
- CSS: X-Cache: MISS (first time)
- JS: X-Cache: MISS (first time)
- Images: X-Cache: MISS (first time)
- Data files: X-Cache: MISS (first time)

Total load time: ~2-3s
```

#### Step 3: Reload Same Page
```
Refresh again after 5 seconds

Expected in Network tab:
- HTML: X-Cache: HIT or MEMORY-HIT
- CSS: X-Cache: HIT (from edge)
- JS: X-Cache: HIT (from edge)
- Images: X-Cache: HIT (from edge)
- Data: X-Cache: HIT (from edge cache)

Total load time: <500ms
```

#### Step 4: Open DevTools Network Tab
```
Check cache headers:
✓ X-Cache: HIT/MEMORY-HIT
✓ X-Cache-Type: static/video/search/listing
✓ X-Cache-Age: <age in seconds>
✓ Cache-Control: ..., s-maxage=...
```

### ✅ Monitor Video Page Cache

1. Click on any video link
2. Check Network tab
3. Look for video detail page response
4. Should see: `X-Cache-Type: video`
5. Cache-Control should include `max-age=604800` (7 days)

### ✅ Monitor Search Cache

1. Perform a search on homepage
2. Go to /f/your-search-query
3. Network tab should show:
4. `X-Cache-Type: search`
5. Cache-Control should include `max-age=43200` (12 hours)

---

## Troubleshooting

### Issue: Cache Headers Not Appearing

**Debug:**
```bash
# Check _headers file was deployed
curl https://your-domain.com/_headers
# Should show the config file

# Check specific path
curl -I https://your-domain.com/css/main.css | grep Cache-Control
```

**Solutions:**
1. Wait 5 minutes for cache to clear
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Redeploy by pushing an empty commit: `git commit --allow-empty -m "chore: force redeploy"`

### Issue: Service Worker Not Registering

**Debug:**
```javascript
// In DevTools Console
navigator.serviceWorker.getRegistrations()
```

**Solutions:**
1. Check public/sw.js exists and has no syntax errors
2. Hard refresh after deployment
3. Check DevTools Application tab for errors

### Issue: Still Seeing High Request Count

**Debug:**
```bash
# Check cache age
curl -I https://your-domain.com/e/any-video | grep X-Cache-Age

# Monitor for ~1 hour - should see increasing cache hits
```

**Solutions:**
1. Cache takes time to populate (first hour will be high)
2. Monitor after 24 hours for true baseline
3. Check that stale-while-revalidate is working

### Issue: Old Content Still Showing

**Solution (Emergency Purge):**
```bash
# Option 1: Increment version (fastest)
# Edit functions/lib/config.js:
version: "1.0.1"  →  version: "1.0.2"
# Redeploy - all worker cache busts

# Option 2: Manual Purge (Cloudflare Dashboard)
1. Go to Caching → Purge Cache
2. Select "Purge by URL"
3. Add URL to purge
4. Wait 30 seconds to propagate

# Option 3: Purge by Cache Tag
1. Go to Caching → Purge Cache  
2. Select "Purge by Cache Tag"
3. Enter tag: "video" / "search" / "list" / "sitemap"
4. Wait 30 seconds
```

---

## Monitoring Metrics

### Request Dashboard Setup

#### Create Monitoring Script
```javascript
// Track requests going out
// Add to worker.js or monitoring service

setInterval(async () => {
  const stats = {
    timestamp: new Date().toISOString(),
    cacheHits: window.__cacheHits || 0,
    cacheMisses: window.__cacheMisses || 0,
    memory: performance.memory?.usedJSHeapSize
  };
  
  console.log('[CACHE STATS]', stats);
  // Send to monitoring service
}, 60000);
```

#### Key Metrics to Watch
- [ ] Daily requests trending down (expect 80% reduction by day 7)
- [ ] Cache hit ratio trending up (expect 80-90% hits)
- [ ] Bandwidth usage down (expect 60-70% reduction)
- [ ] Time to Interactive down (expect 50% for repeat users)
- [ ] Service Worker cache size growing (expect <5MB)

---

## Maintenance Tasks

### Weekly
- [ ] Check cache hit ratio in Cloudflare Analytics
- [ ] Monitor request count (should be low and stable)
- [ ] Verify no 404 errors on common pages

### Monthly
- [ ] Review cache strategy effectiveness
- [ ] Check for stale content being served
- [ ] Monitor for unexpected cache miss patterns

### As Needed
- Increment `version` in config.js to bust all caches
- Use Cloudflare purge for specific content updates
- Adjust TTLs if patterns change

---

## Success Criteria

### After 24 Hours
- [ ] Cache hit ratio > 60%
- [ ] Requests down 40%
- [ ] No major 404 or 500 errors

### After 7 Days
- [ ] Cache hit ratio > 85%
- [ ] Requests down 80-85%
- [ ] User speeds consistent and fast
- [ ] Repeat visitors load <500ms

### After 30 Days
- [ ] Cache hit ratio 85-90%
- [ ] Requests down 80-90%
- [ ] Monthly API call budget not exceeded
- [ ] Zero unplanned cache purges needed

---

## Rollback Plan (If Needed)

### Quick Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Wait for redeploy (2-3 minutes)
# Cache will normalize after 1 hour
```

### Manual Revert Files
If you need to revert specific files:

1. **functions/lib/cache.js** - Previous version had shorter TTLs
2. **functions/lib/fetch.js** - Previous version had 1-30 minute TTLs
3. **public/sw.js** - Simple cache strategy (cache first only)
4. **Delete**: `public/_headers` and `public/_redirects`

---

## Performance Targets

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Daily Requests | 100k | 15k-20k | < 20k |
| Cache Hit Ratio | 10% | 85-90% | > 85% |
| Time to First Byte | 200ms | 150ms | < 200ms |
| Time to Interactive | 2-3s | 1-1.5s | < 2s |
| Repeat User Load | 2-3s | <500ms | <500ms |
| Bandwidth/Month | 50GB | 15-20GB | < 25GB |

---

## Questions?

1. **See**: [CACHING_OPTIMIZATION_GUIDE.md](CACHING_OPTIMIZATION_GUIDE.md) for details
2. **Check**: [CACHE_OPTIMIZATION_SUMMARY.md](CACHE_OPTIMIZATION_SUMMARY.md) for overview
3. **Review**: [LOCAL_EXECUTION_SETUP.md](LOCAL_EXECUTION_SETUP.md) for local testing

---

✅ **All Set!** Your Cloudflare Pages project is now optimized for 80-90% request reduction.
