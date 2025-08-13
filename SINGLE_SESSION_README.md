# Single Session Per User Implementation

## Overview

This implementation ensures that only one user can be logged in at a time across multiple devices. When a user logs in from a new device, all previous sessions are automatically invalidated.

## Features

### 🔐 **Session Management**
- **Single Session Per User**: Only one active session allowed per user
- **Automatic Logout**: Previous sessions are invalidated when logging in from a new device
- **Session Validation**: Real-time session validation with periodic checks
- **Secure Token Generation**: Unique session tokens for each login

### 🛡️ **Security Features**
- **Session Token Validation**: JWT tokens include unique session identifiers
- **Automatic Session Invalidation**: Previous sessions become invalid immediately
- **Session Expiration**: Sessions expire based on JWT configuration
- **Real-time Status Monitoring**: Frontend shows session status

### 📱 **User Experience**
- **Automatic Redirect**: Users are redirected to login when sessions are invalidated
- **User-Friendly Messages**: Clear notifications about session status
- **Session Status Indicator**: Visual indicator showing session validity
- **Graceful Handling**: Smooth transition when sessions are invalidated

## Technical Implementation

### Backend Changes

#### 1. **User Model Updates** (`models/User.js`)
```javascript
// New session management fields
currentSessionToken: String,    // Current active session token
sessionCreatedAt: Date,        // When session was created
sessionExpiresAt: Date,        // When session expires

// New methods
generateSessionToken()         // Generate unique session token
invalidateSession()           // Invalidate current session
```

#### 2. **Authentication Middleware** (`middleware/auth.js`)
```javascript
// Enhanced token validation
- Validates session token matches current session
- Checks session expiration
- Returns specific error messages for session invalidation
```

#### 3. **Login Routes** (`routes/auth.js`, `routes/otp.js`)
```javascript
// Login process
1. Invalidate any existing session
2. Generate new session token
3. Update user session info
4. Return JWT with session token
```

#### 4. **New Endpoints**
- `GET /api/auth/validate-session` - Validate current session
- `POST /api/auth/force-logout` - Force logout from all devices

### Frontend Changes

#### 1. **Authentication Hook** (`hooks/useAuth.ts`)
```typescript
// Enhanced session management
- Session validation on app load
- Automatic logout on session invalidation
- Clear error handling for session issues
```

#### 2. **API Service** (`services/api.ts`)
```typescript
// Enhanced error handling
- Specific handling for session invalidation
- User-friendly error messages
- Automatic redirect on session issues
```

#### 3. **Session Status Component** (`components/SessionStatus.tsx`)
```typescript
// Real-time session monitoring
- Periodic session validation
- Visual status indicators
- Session health monitoring
```

## Database Schema Changes

### User Collection
```javascript
{
  // ... existing fields ...
  
  // New session management fields
  currentSessionToken: String,    // Current active session token
  sessionCreatedAt: Date,        // Session creation timestamp
  sessionExpiresAt: Date,        // Session expiration timestamp
}
```

## Migration

### Running the Migration
```bash
# Run the migration script to add session fields to existing users
node scripts/migrate-sessions.js
```

### Migration Process
1. Identifies users without session fields
2. Adds default session fields (null values)
3. Verifies migration completion
4. Reports migration status

## Usage Examples

### Login Flow
```javascript
// 1. User logs in from Device A
POST /api/auth/login
Response: { token: "jwt_with_session_token" }

// 2. User logs in from Device B
POST /api/auth/login
Response: { token: "new_jwt_with_new_session_token" }

// 3. Device A automatically gets logged out
// Next API call from Device A returns 401 with session invalidation message
```

### Session Validation
```javascript
// Check if current session is valid
GET /api/auth/validate-session
Response: { success: true, sessionValid: true }

// If session is invalid
Response: { success: false, message: "Session invalidated" }
```

### Force Logout
```javascript
// Force logout from all devices
POST /api/auth/force-logout
Response: { success: true, message: "Logged out from all devices" }
```

## Error Messages

### Session Invalidation
- `"Session invalidated. You have been logged out from another device."`
- `"Session expired. Please login again."`
- `"Session expired. Please login again."`

### User-Friendly Alerts
- `"You have been logged out because you logged in from another device."`

## Configuration

### Environment Variables
```bash
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d  # Session expiration time
BCRYPT_SALT_ROUNDS=12
```

### Session Settings
- **Session Token Length**: 32 bytes (64 hex characters)
- **Validation Frequency**: Every 30 seconds (frontend)
- **Token Expiration**: Configurable via JWT_EXPIRE environment variable (default: 30 days)

## Security Considerations

### Session Security
- ✅ Unique session tokens for each login
- ✅ Automatic invalidation of previous sessions
- ✅ Session expiration handling
- ✅ Secure token generation using crypto.randomBytes()

### Token Security
- ✅ JWT tokens include session identifiers
- ✅ Server-side session validation
- ✅ Automatic cleanup of expired sessions

### User Experience
- ✅ Immediate feedback on session status
- ✅ Graceful handling of session invalidation
- ✅ Clear error messages
- ✅ Automatic redirect to login

## Testing

### Test Scenarios
1. **Single Device Login**: User logs in from one device
2. **Multi-Device Login**: User logs in from second device, first device gets logged out
3. **Session Expiration**: Session expires naturally
4. **Force Logout**: User manually logs out from all devices
5. **Network Issues**: Handle network interruptions gracefully

### Manual Testing
```bash
# Test login from Device A
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Test login from Device B (should invalidate Device A)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Test session validation
curl -X GET http://localhost:5000/api/auth/validate-session \
  -H "Authorization: Bearer <token_from_device_a>"
```

### Configuration Examples
```bash
# Set to 30 days (default)
JWT_EXPIRE=30d

# Set to 7 days
JWT_EXPIRE=7d

# Set to 24 hours
JWT_EXPIRE=24h

# Set to 1 hour
JWT_EXPIRE=1h
```

## Troubleshooting

### Common Issues

#### 1. **Session Not Invalidating**
- Check if migration script was run
- Verify session fields exist in database
- Check JWT token format includes session token

#### 2. **Multiple Sessions Active**
- Ensure `invalidateSession()` is called before new login
- Check session token generation is unique
- Verify session validation middleware is working

#### 3. **Frontend Not Responding to Session Invalidation**
- Check API response interceptor
- Verify error message handling
- Ensure automatic redirect is working

### Debug Steps
1. Check database for session fields
2. Monitor API responses for session errors
3. Verify JWT token structure
4. Check frontend console for error messages

## Performance Considerations

### Database Impact
- Minimal impact: Only additional fields on user documents
- No additional queries for session validation
- Session fields are indexed for efficient lookups

### API Performance
- Session validation adds minimal overhead
- JWT verification remains fast
- No additional database queries for session checks

### Frontend Performance
- Session status checks every 30 seconds
- Minimal UI updates for status changes
- Efficient error handling and redirects

## Future Enhancements

### Potential Improvements
1. **Session History**: Track all user sessions
2. **Device Management**: Allow users to manage active sessions
3. **Session Analytics**: Monitor session patterns
4. **Advanced Security**: IP-based session validation
5. **Session Recovery**: Allow session recovery options

### Scalability Considerations
1. **Redis Integration**: Use Redis for session storage (optional)
2. **Session Clustering**: Handle multiple server instances
3. **Load Balancing**: Ensure session consistency across servers
4. **Database Optimization**: Index session fields for performance

## Conclusion

The single-session-per-user implementation provides robust security while maintaining excellent user experience. The system automatically handles session invalidation, provides clear feedback to users, and ensures only one active session per user across all devices.
