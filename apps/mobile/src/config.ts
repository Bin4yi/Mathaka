// Build-time flags. EXPO_PUBLIC_* values come from apps/mobile/.env (see .env.example).
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
