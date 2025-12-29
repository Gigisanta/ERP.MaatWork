# Testing Guide: Google OAuth & Calendar Integration

## Overview

This document provides comprehensive testing steps for the newly implemented Google OAuth login/register and weekly calendar view features.

## Prerequisites

1. Server running: `pnpm dev`
2. Google OAuth credentials configured in `apps/api/.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET=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`
   - `GOOGLE_REDIRECT_URI=http://localhost:3001/v1/auth/google/callback`
   - `GOOGLE_ENCRYPTION_KEY`

## Test Suite 1: Google OAuth Login

### Test 1.1: Login with Existing Google Account

**Steps:**
1. Navigate to `http://localhost:3000/login`
2. Click "Continuar con Google" button
3. Select a Google account that already has an account in the system
4. Grant permissions if prompted

**Expected Results:**
- Redirected to Google OAuth consent screen
- After authorization, redirected to `/home` with `?google_auth=success`
- Success alert shown: "Has iniciado sesión exitosamente con Google"
- User is logged in
- Google Calendar is automatically connected
- `/profile` shows "Desconectar" button

### Test 1.2: Login with Non-Existent Google Account

**Steps:**
1. Navigate to `http://localhost:3000/login`
2. Click "Continuar con Google"
3. Select a Google account that does NOT have an account in the system

**Expected Results:**
- Redirected to `/login?error=no_account`
- Warning alert shown: "No tienes una cuenta con este email de Google. Por favor regístrate primero."
- User remains on login page

## Test Suite 2: Google OAuth Register

### Test 2.1: Register with New Google Account

**Steps:**
1. Navigate to `http://localhost:3000/register`
2. Click "Continuar con Google" button (at top of form)
3. Select a Google account that does NOT have an account in the system
4. Grant permissions

**Expected Results:**
- Redirected to Google OAuth consent screen
- After authorization, redirected to `/home` with `?google_auth=success`
- New user account created automatically
- User is logged in
- Google Calendar is automatically connected
- `/profile` shows "Desconectar" button

### Test 2.2: Register with Existing Google Account

**Steps:**
1. Navigate to `http://localhost:3000/register`
2. Click "Continuar con Google"
3. Select a Google account that ALREADY has an account in the system

**Expected Results:**
- Redirected to `/login?error=account_exists`
- Warning alert shown: "Ya tienes una cuenta con este email de Google. Por favor inicia sesión."
- User redirected to login page

## Test Suite 3: Weekly Calendar View

### Test 3.1: View Weekly Calendar

**Steps:**
1. Login with a user that has Google Calendar connected
2. Navigate to `/home`
3. Observe the calendar widget

**Expected Results:**
- Weekly calendar grid displayed (desktop) or list view (mobile)
- Current week shown by default
- Today's column highlighted
- Events displayed in correct time slots
- Time slots from 7:00 to 22:00 visible

### Test 3.2: Navigate Between Weeks

**Steps:**
1. On `/home`, locate the calendar navigation buttons
2. Click left arrow (previous week)
3. Click right arrow (next week)
4. Click "Hoy" button

**Expected Results:**
- Previous week: Calendar shows previous 7 days
- Next week: Calendar shows next 7 days
- "Hoy" button: Returns to current week
- Events update accordingly for each week

### Test 3.3: View Event Details

**Steps:**
1. On `/home`, click on any event in the calendar
2. Observe the modal that opens
3. Click "Ver en Google Calendar" if available
4. Click "Cerrar" or click outside modal

**Expected Results:**
- Modal opens with event details:
  - Title
  - Date and time
  - Description (if exists)
  - Location (if exists)
  - Attendees (if exist)
  - Google Meet link (if exists)
- "Ver en Google Calendar" opens event in new tab
- Modal closes on "Cerrar" or outside click

### Test 3.4: Refresh Calendar

**Steps:**
1. On `/home`, click the refresh button (circular arrow icon)
2. Observe loading state

**Expected Results:**
- Button shows spinning animation
- Events reload from Google Calendar
- Updated events displayed
- No page reload

## Test Suite 4: Profile Integration

### Test 4.1: Connect Calendar from Profile

**Steps:**
1. Login with traditional email/password (not Google OAuth)
2. Navigate to `/profile`
3. Find "Google Calendar" in Integraciones section
4. Click "Conectar"
5. Authorize with Google

**Expected Results:**
- Redirected to Google OAuth
- After authorization, back to `/profile?google_connect=success`
- Toast notification: "Cuenta de Google conectada correctamente"
- Button changes to "Desconectar"
- `/home` now shows calendar with events

### Test 4.2: Disconnect Calendar

**Steps:**
1. On `/profile`, with Google Calendar connected
2. Click "Desconectar"
3. Confirm in dialog

**Expected Results:**
- Confirmation dialog appears
- After confirmation, button changes to "Conectar"
- Toast notification: "Cuenta de Google desconectada correctamente"
- `/home` shows "Conecta tu Google Calendar" message

## Test Suite 5: Edge Cases

### Test 5.1: No Events in Week

**Steps:**
1. Connect Google Calendar with an account that has no events this week
2. Navigate to `/home`

**Expected Results:**
- Calendar grid displayed
- No events shown
- No errors displayed

### Test 5.2: All-Day Events

**Steps:**
1. Create an all-day event in Google Calendar
2. Refresh calendar on `/home`

**Expected Results:**
- All-day event appears at top of day column
- Shows "Todo el día" as time
- Click opens modal with correct details

### Test 5.3: Events Outside 7:00-22:00

**Steps:**
1. Create events before 7:00 AM or after 10:00 PM
2. View calendar on `/home`

**Expected Results:**
- Events outside 7:00-22:00 not shown in grid (by design)
- Mobile list view may show them

### Test 5.4: Multiple Events Same Time

**Steps:**
1. Create multiple events at the same time
2. View calendar on `/home`

**Expected Results:**
- Events stack or overlap in time slot
- All events clickable
- Modal shows correct details for each

## Test Suite 6: Responsive Design

### Test 6.1: Mobile View

**Steps:**
1. Resize browser to mobile width (<768px)
2. Navigate to `/home`

**Expected Results:**
- Calendar switches to list view
- Events grouped by day
- Today's day highlighted
- All events clickable

### Test 6.2: Tablet View

**Steps:**
1. Resize browser to tablet width (768px-1024px)
2. Navigate to `/home`

**Expected Results:**
- Grid view displayed
- Columns may be narrower but readable
- All functionality works

## Test Suite 7: Error Handling

### Test 7.1: OAuth Cancelled

**Steps:**
1. Click "Continuar con Google"
2. Cancel on Google consent screen

**Expected Results:**
- User returned to original page
- No error shown (Google handles cancellation)

### Test 7.2: Calendar API Error

**Steps:**
1. Disconnect internet
2. Try to refresh calendar

**Expected Results:**
- Error message displayed
- "Reintentar" button available
- No crash

### Test 7.3: Expired OAuth Token

**Steps:**
1. Wait for OAuth token to expire (or manually invalidate)
2. Try to view calendar

**Expected Results:**
- Error message about expired connection
- "Reconectar cuenta" button shown
- Redirects to `/profile` to reconnect

## Validation Checklist

After completing all tests, verify:

- [ ] Google OAuth login works for existing users
- [ ] Google OAuth register creates new users
- [ ] Error messages show for wrong context (login vs register)
- [ ] Calendar connects automatically after OAuth login/register
- [ ] Weekly calendar view displays correctly
- [ ] Event details modal shows all information
- [ ] Navigation between weeks works
- [ ] Refresh button updates events
- [ ] Profile shows correct connection status
- [ ] Disconnect works and updates UI
- [ ] Mobile responsive view works
- [ ] All-day events display correctly
- [ ] No console errors
- [ ] No infinite loops or performance issues

## Known Issues / Limitations

1. Events outside 7:00-22:00 not shown in desktop grid view (by design)
2. OAuth requires internet connection
3. Google Calendar API has rate limits

## Debugging Tips

If issues occur:

1. Check browser console for errors
2. Check backend logs for OAuth flow
3. Verify environment variables are set
4. Clear browser cache and cookies
5. Check `isGoogleConnected` in console:
   ```javascript
   // In browser console
   console.log(window.__NEXT_DATA__) // or check React DevTools
   ```

## Success Criteria

All tests pass with expected results, no errors in console, smooth user experience.

