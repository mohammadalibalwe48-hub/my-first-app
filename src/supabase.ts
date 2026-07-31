import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ??
    "https://xgkpoxyirycravtxfyes.supabase.co";
const supabasePublishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    "sb_publishable_PgZNAjZyglCUGGpHy39ZGg_4kQaU6ng";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});
