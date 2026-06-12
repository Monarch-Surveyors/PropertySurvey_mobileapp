# GPS Location Fix - Summary

## Problem
Images were showing **Lat: N/A  Lng: N/A** both in preview and saved images.

## Root Causes Found

### 1. useLocation Hook Issues (FIXED ✅)
- Used `getCurrentPosition` (one-time fetch) instead of `watchPosition`
- Had `maximumAge: 60000` which could return stale cached coordinates
- Timeout was only 10 seconds
- Error handler didn't retry

### 2. Multiple Hook Instances (FIXED ✅)
- **ImageCard** was calling `useLocation()` independently
- Created separate state instances that didn't sync
- Preview modal showed ImageCard's instance (N/A)
- Saved images showed PropertySurveyScreen's instance (also N/A initially)

## Solutions Applied

### ✅ Updated `useLocation.ts`
- Changed to `watchPosition()` for continuous GPS tracking
- Set `maximumAge: 0` - no stale coordinates
- Increased timeout to 15 seconds
- Added fallback: retries with low accuracy (cell tower) on error
- Stops watching once good fix obtained (saves battery)

### ✅ Updated `ImageCard.tsx`
- Removed duplicate `useLocation()` call
- Now accepts `location` as a prop
- Uses shared location state from parent component

### ✅ Updated `PropertySurveyScreen.tsx`
- Passes `location` prop to all ImageCard components
- Shows "📍 Fetching GPS location..." status text
- Save button disabled until GPS ready
- Button text changes: "WAITING FOR GPS..." → "SAVE IMAGES"

## Files Modified

1. `src/hooks/useLocation.ts` - Core GPS logic
2. `src/components/ImageCard.tsx` - Removed duplicate hook, accepts location prop
3. `src/screens/PropertySurveyScreen.tsx` - Passes location to children, better UI feedback

## Permissions Already Configured ✅

AndroidManifest.xml already has:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## Testing Steps

1. **Rebuild the app**: `npx react-native run-android`
2. Grant location permissions when prompted
3. Wait for GPS fix (status text disappears when ready)
4. Take/select photos
5. Click on image preview - should show real coordinates
6. Save images - gallery images should have real coordinates

## Expected Behavior

- App starts → "📍 Fetching GPS location..." visible
- After 5-15 seconds → GPS acquires, status disappears
- Image preview → Shows real Lat/Lng
- Saved images → Have real Lat/Lng watermark
- If GPS fails → Falls back to network location (less accurate but not N/A)

## Troubleshooting

If still showing N/A:
1. Check device Location/GPS is enabled
2. Test outdoors (GPS works poorly indoors)
3. Check logcat: `adb logcat | grep -i location`
4. Verify permission granted in Settings → Apps → PropertySurvey → Permissions
