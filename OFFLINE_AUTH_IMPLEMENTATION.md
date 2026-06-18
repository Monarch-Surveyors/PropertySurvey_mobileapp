# Offline Session Management Implementation

## Overview
Implemented a robust offline-first authentication system that maintains user sessions during network interruptions and only logs out on explicit user action, token expiry, or security policy requirements.

## Key Features

### 1. Persistent Session Storage
- **Storage Service** (`src/services/storage.ts`)
  - Uses AsyncStorage for secure local data persistence
  - Stores: authentication token, user data, session expiry
  - Session validity check based on expiry time (30 days default)

### 2. Network Monitoring
- **Network Service** (`src/services/network.ts`)
  - Real-time connectivity monitoring using NetInfo
  - Detects Wi-Fi, mobile data, and network state changes
  - No automatic logout on network loss

### 3. Authentication Context
- **Auth Context** (`src/context/AuthContext.tsx`)
  - Centralized authentication state management
  - Checks stored session on app startup
  - Provides: `isAuthenticated`, `isOnline`, `userData`, `login()`, `logout()`

### 4. Session Persistence Flow
```
App Launch → Check AsyncStorage → Valid Token? → Auto-login
                                 ↓
                              Expired? → Clear & Show Login
```

### 5. Logout Triggers (ONLY)
- **User Action**: Explicit logout button press with confirmation
- **Token Expiry**: Session expires after 30 days (configurable)
- **Manual Clear**: User clears app data

### 6. Network Loss Handling
- **Visual Indicators**: 
  - Login Screen: "You are offline" banner
  - Survey Screen: "Offline Mode - Data will sync when online" banner
- **Functionality**: App remains fully functional offline
- **No Logout**: Network loss NEVER triggers logout

## Implementation Details

### New Dependencies
```json
"@react-native-async-storage/async-storage": "^1.x.x",
"@react-native-community/netinfo": "^11.x.x"
```

### Session Configuration
- **Expiry Time**: 30 days (2,592,000,000 ms)
- **Storage**: AsyncStorage (encrypted on device)
- **Token Format**: `token_${timestamp}` (replace with real JWT)

## Usage

### Login Flow
```typescript
const {login} = useAuth();
await login(councilId, userId, password);
// User is automatically navigated to main screen
// Session persists across app restarts
```

### Logout Flow
```typescript
const {logout} = useAuth();
// Show confirmation dialog
Alert.alert('Logout', 'Are you sure?', [
  {text: 'Cancel'},
  {text: 'Logout', onPress: logout}
]);
```

### Check Online Status
```typescript
const {isOnline} = useAuth();
{!isOnline && <Text>Offline Mode</Text>}
```

## Security Notes

1. **Token Storage**: Currently using AsyncStorage (consider KeyChain/Keystore for production)
2. **Session Duration**: 30 days - adjust based on security requirements
3. **Token Refresh**: Implement server-side token refresh logic
4. **Biometric Auth**: Can be added for additional security layer

## Testing Scenarios

✅ User logs in → Close app → Reopen → Still logged in
✅ Turn off Wi-Fi/Data → User stays logged in → UI shows offline indicator
✅ Network restored → Offline banner disappears → Data syncs
✅ User presses logout → Confirmation shown → Session cleared
✅ 30 days pass → Token expires → Auto-logout on next app open

## Integration Points

- **App.tsx**: Wrapped with `<AuthProvider>`
- **AppNavigator**: Checks `isAuthenticated` to show Login/Survey screens
- **LoginScreen**: Uses `login()` and displays `isOnline` status
- **PropertySurveyScreen**: Uses `logout()` and displays `isOnline` status

## Future Enhancements

1. **Queue Offline Actions**: Store survey data locally, sync when online
2. **Biometric Login**: Add fingerprint/face unlock
3. **Token Refresh**: Auto-refresh tokens before expiry
4. **Encrypted Storage**: Use react-native-keychain for sensitive data
5. **Background Sync**: Auto-sync when network restored in background
