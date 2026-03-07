# Life Score Mobile (Expo + HealthKit)

## Setup

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

## Building for iOS

```bash
npm install -g eas-cli
eas login
eas build --platform ios
```

## Architecture

- `src/hooks/useHealthKit.ts` - HealthKit permissions + data reading
- `src/screens/DashboardScreen.tsx` - Main dashboard UI  
- `src/lib/supabase.ts` - Supabase client

## Score Weights

| Metric | Weight |
|--------|--------|
| Sleep (vs 8hr) | 25% |
| Steps + Exercise | 25% |
| Active Calories | 20% |
| Heart Rate health | 15% |
| Stand Hours | 15% |
