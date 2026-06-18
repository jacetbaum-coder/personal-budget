/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_REMOTE_SYNC?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_APP_STATE_ROW_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
