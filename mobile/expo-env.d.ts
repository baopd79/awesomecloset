/// <reference types="expo/types" />

// Env vars injected by Metro at build time (EXPO_PUBLIC_ prefix)
declare const process: {
  env: {
    readonly EXPO_PUBLIC_SUPABASE_URL?: string;
    readonly EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    readonly NODE_ENV: 'development' | 'production' | 'test';
    [key: string]: string | undefined;
  };
};
