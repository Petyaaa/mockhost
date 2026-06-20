# Debug Guide for Sign In / Sign Up Issues

## Quick Test
1. **Start the server**: `node server.js`
2. **Open**: `http://localhost:3000`
3. **Open browser console**: Press `F12` or `Ctrl+Shift+I`
4. **Check for logs**: Look for `[CAPTCHA]`, `[FORM]`, `[API]` messages

## Testing Sign In (Existing User)
- **Email**: `admin@example.com`
- **Password**: `adminpass`
- **Captcha**: Answer the math question (e.g., "7" for "What is 3 + 4?")
- **Demo Code**: Use the code shown in the popup or toast (shown for testing)

## Testing Sign Up (New User)
1. Click "Sign Up" tab
2. Choose role: "Student" or "Teacher"
3. Enter email and password
4. Answer captcha
5. Use demo code from popup

## What to Check in Console Logs

### Frontend Logs (Browser Console)
```
[CAPTCHA] Loaded: <id>           // Captcha loaded successfully
[FORM] Submitting { mode: ... }  // Form submitted
[API] Calling /api/send-code     // API request details
[API] Success: { message, debugCode }  // Success!
[API ERROR] ...                  // Error details
[VERIFY] Submitting { email, code }
[VERIFY] Success: { token, email, role }
[VERIFY ERROR] ...
```

### Backend Logs (Server Console)
```
[CAPTCHA] Generated <id>: What is X + Y?  // Captcha generated
[SEND-CODE] Request: { email, ... }      // Signin request received
[SEND-CODE] Captcha check: { expected, provided }
[SEND-CODE] Success - code generated     // Verification code created
[SIGNUP] Request: { email, ... }         // Signup request
[SIGNUP] Success - code generated        // Ready to verify
[VERIFY-CODE] Request: { email, code }   // Verify request
[VERIFY-CODE] Success - token created    // Login complete!
```

## Common Issues

### "Captcha unavailable"
- Server might not be running
- Try clicking the ↻ refresh button
- Check server is outputting `[CAPTCHA] Generated...`

### "Captcha validation failed"
- Make sure you answered correctly (3+4=7, etc.)
- Try refreshing captcha with ↻ button
- Check server logs for captcha mismatch

### "No account found" (during sign in)
- The account might not exist yet - use Sign Up tab
- Or use demo account: admin@example.com / adminpass

### "Account already exists" (during sign up)
- Email is already registered - use Sign In tab
- Or use different email

### "Verification code is invalid"
- Use the demo code shown in the popup
- Make sure you copied it exactly
- Try signing in again to get a new code

## Manual Testing with curl

### Get Captcha
```bash
curl http://localhost:3000/api/captcha
```

### Sign Up
```bash
curl -X POST http://localhost:3000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "captchaId": "...",
    "captchaAnswer": "7"
  }'
```

### Verify Code
```bash
curl -X POST http://localhost:3000/api/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

## Server Health Check
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{"status":"ok","captchasActive":1}
```
