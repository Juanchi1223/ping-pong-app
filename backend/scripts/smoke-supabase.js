require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  const { count: playersCount, error: pErr } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });
  if (pErr) { console.error('players query failed:', pErr.message); process.exit(1); }

  const { count: matchesCount, error: mErr } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true });
  if (mErr) { console.error('matches query failed:', mErr.message); process.exit(1); }

  console.log(`Supabase connection OK. players=${playersCount} matches=${matchesCount}`);
})();
