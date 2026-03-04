# Zone Guardian - Testing & Deployment Guide

## Pre-Deployment Checklist

### 1. Database Verification
Ensure these tables exist and have sample data:
```sql
-- Assets table
SELECT * FROM assets WHERE id = 'bb660148-ab56-4d1a-bef8-bc30099ee3b1';
-- Should return: id, name='HDT-042' (or your asset name), lat, lng, last_seen

-- Zone assignments
SELECT * FROM zone_assignments 
WHERE asset_id = 'bb660148-ab56-4d1a-bef8-bc30099ee3b1' 
AND status = 'active';
-- Should return: zone_id reference

-- Zones
SELECT * FROM zones WHERE id = <zone_id_from_above>;
-- Should return: id, name, polygon (GeoJSON), status='active'

-- Violations table (empty initially)
SELECT * FROM violations;
```

### 2. Supabase Real-Time Setup
Ensure real-time is enabled for these tables:
- [ ] `zone_assignments` - for operator assignments
- [ ] `zones` - for zone geometry updates
- [ ] `violations` - for supervisor to see new violations

To enable:
1. Go to Supabase Dashboard
2. Select your project
3. Database -> Replication
4. Enable for: zone_assignments, zones, violations

### 3. Network Configuration (Mobile Testing)
If testing on mobile device with ngrok:
```bash
# Terminal 1: Run local dev server
npm run dev

# Terminal 2: Create HTTPS tunnel to localhost:5173
ngrok http 5173

# Use the ngrok URL on mobile browser
# Example: https://xxx-xxx-xxx-xxx.ngrok.io
```

---

## Testing Scenarios

### Scenario 1: Operator with Active Assignment ✅

**Setup**:
- Operator account is logged in
- Asset `bb660148-ab56-4d1a-bef8-bc30099ee3b1` has ACTIVE zone assignment
- Zone polygon exists in zones table

**Test**:
1. Navigate to "Operate" page
2. Verify:
   - [ ] Assignment card shows zone name (from zones.name)
   - [ ] Asset name shows correct asset (from assets.name)
   - [ ] Status indicator visible in header
   - [ ] Status strip shows (Safe/Warning/Danger)
   - [ ] Map loads zone polygon (green overlay)
   - [ ] Map shows current location marker

3. Walk/drive movement test:
   - [ ] Inside zone → Status shows "SAFE" / "Inside Zone"
   - [ ] Near boundary (5m) → Status shows "WARNING" / "Near Boundary"
   - [ ] Outside zone → Status shows "DANGER" / "Outside Zone"

4. Violation creation:
   - [ ] Step outside zone boundary
   - [ ] Wait 2-3 seconds
   - [ ] Go to Supervisor Dashboard
   - [ ] New violation appears on map (red marker)
   - [ ] Violation appears in violations list with timestamp

---

### Scenario 2: Operator with NO Assignment ✅

**Setup**:
- Operator account logged in
- NO active zone_assignments for asset
- OR status != 'active'

**Test**:
1. Navigate to "Operate" page
2. Verify:
   - [ ] Assignment card shows "No Active Assignment"
   - [ ] Asset name still shows correct asset
   - [ ] Status indicator present
   - [ ] Status strip is HIDDEN (not visible)
   - [ ] Info card shows: "Awaiting Zone Assignment"
   - [ ] Map shows message: "No Active Zone Assignment"
   - [ ] Navigation still works (can go to other pages)

---

### Scenario 3: Zone Assignment Changes in Real-Time ✅

**Setup**:
- Operator logged in on Operate page with Zone A assigned
- Supervisor has access to Assignment page

**Test**:
1. Operator sees Zone A loaded
2. Supervisor unassigns Zone A (or supervisor assigns new Zone B)
3. Within 5 seconds, operator's screen should:
   - [ ] Zone name in card updates to Zone B
   - [ ] Map reloads with new zone polygon
   - [ ] If unassigned: Shows "No Active Assignment" card
   - [ ] Position marker remains on map

---

### Scenario 4: Zone Geometry Update ✅

**Setup**:
- Operator logged in viewing assigned zone
- Zone geometry exists in zones table

**Test**:
1. Operator sees zone polygon on map
2. Supervisor edits zone polygon (changes coordinates in zones.polygon)
3. Within 5 seconds, operator's map should:
   - [ ] Zone boundary redraws with new coordinates
   - [ ] No page refresh needed

---

### Scenario 5: Multiple Violations (Spam Prevention) ✅

**Setup**:
- Operator outside zone boundary

**Test**:
1. Operator walks outside zone (status: danger)
2. First violation created ✓
3. Operator remains outside for 10 seconds
4. Supervisor Dashboard shows:
   - [ ] Only ONE violation for this asset
   - [ ] Not multiple duplicates (spam prevention active)
5. Operator walks back inside (status: safe)
6. Later walks outside again
7. New violation created (not the old one)

---

## Debugging Tips

### Zone not loading?
```javascript
// In browser console
// Check assignment
fetch('/api/...').then(r => r.json()).then(d => console.log('Assignment:', d))

// Check if zone polygon is GeoJSON format
// Should be: { coordinates: [[[lat, lng], [lat, lng], ...]] }
```

### Status not updating?
```javascript
// In browser console
navigator.geolocation.watchPosition(
  pos => console.log('GPS:', pos.coords.latitude, pos.coords.longitude)
)
```

### Violations not appearing?
```javascript
// In browser console - check if trackPosition is being called
// Add console.log in LiveMap.tsx around trackPosition call
```

### Real-time not working?
```javascript
// Verify Supabase channels:
// 1. Check network tab for WebSocket connections
// 2. Verify table permissions allow SELECT
// 3. Check Supabase dashboard for real-time status
```

---

## Performance Considerations

1. **GPS Polling**: Currently 3000ms (3 seconds) maximumAge
   - Can reduce to 1000ms for more responsive updates
   - File: `src/components/maps/LiveMap.tsx`

2. **Geofence Check**: Happens on every GPS update
   - Uses Turf.js for point-in-polygon
   - Should be sub-millisecond for typical zones

3. **Database Queries**: 
   - Initial load: 2 queries (zone_assignments + zones)
   - Real-time: Subscriptions (event-driven, no polling)

4. **Map Rendering**:
   - React-leaflet handles updates efficiently
   - Polygon/Marker updates are fast

---

## Production Deployment

### Before Going Live

1. **Test on Real Mobile Device**
   - [ ] GPS accuracy verified
   - [ ] Status changes instantly when crossing boundary
   - [ ] No lag between GPS position and map display
   - [ ] Battery drain acceptable
   - [ ] Network reconnection handled

2. **Test with Real Zone Data**
   - [ ] Large polygons (>100 points) render smoothly
   - [ ] Complex zones with many vertices
   - [ ] Various zone shapes (irregular boundaries)

3. **Load Testing**
   - [ ] Multiple operators simultaneous
   - [ ] Real-time updates under load
   - [ ] Violation creation doesn't block UI

4. **Error Handling**
   - [ ] No GPS signal → graceful message
   - [ ] Database error → retry logic
   - [ ] Network disconnect → auto-reconnect

### Deployment Steps

1. Build and test locally
2. Deploy to staging environment
3. Test entire flow on staging
4. Deploy to production
5. Monitor violation logs for accuracy

---

## Monitoring & Metrics

Track these after deployment:
- Violation accuracy rate (false positives/negatives)
- GPS signal strength distribution
- Real-time latency (assignment changes)
- User session duration
- Error rates by page/component

---

## Support & Troubleshooting

### Common Issues

**Issue**: Status doesn't update when moving
- [ ] Check GPS is enabled on device
- [ ] Check zone polygon is valid GeoJSON
- [ ] Check asset_id matches across code

**Issue**: Zone doesn't load on Operate page
- [ ] Verify zone_assignments exist in database
- [ ] Verify zones table has polygon data
- [ ] Check Supabase connection

**Issue**: Violations don't appear in supervisor view
- [ ] Check operator crossed boundary (status='danger')
- [ ] Verify ViolationService has permission to INSERT
- [ ] Check violations table in database

---

**Last Updated**: February 2, 2026
**Status**: Ready for Testing
