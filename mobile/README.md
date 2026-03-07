# Life Score Mobile (Expo + HealthKit)

## Setup

```bash
cd mobile && npm install && cp .env.example .env && npx expo start
```

## Build for iOS (requires Apple Developer account $99/yr)

```bash
npm install -g eas-cli && eas login && eas build --platform ios
```

## Files
- `src/hooks/useHealthKit.ts` - HealthKit permissions + 8 data points
- `src/screens/DashboardScreen.tsx` - Dashboard UI
- `src/lib/supabase.ts` - Supabase client

## Score weights: Sleep 25% | Steps+Exercise 25% | Calories 20% | Heart 15% | Stand 15%
