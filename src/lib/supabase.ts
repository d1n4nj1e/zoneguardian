import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hutaxtoptgbrczfkxsdv.supabase.co';
const supabaseAnonKey = 'sb_publishable_Q_ezpbv8MR9gWsj2ThNrCQ_8j67eGKS';

// Ensure session persistence and token auto-refresh for stable sessions
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
	},
});
