import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testInsert() {
  const userId = '00000000-0000-0000-0000-000000000000'; // Replace with a real user ID if needed, but let's see if it even gets to FK check
  
  // Try to find a real user first to avoid FK error
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  const realUserId = profiles?.[0]?.id || userId;

  console.log('Testing insert with user:', realUserId);

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: realUserId,
      type: 'link',
      content: 'Testing post from script',
      link_url: 'https://wapo.st/3LuBhEX',
      link_metadata: { title: 'Test', description: 'Test', domain: 'wapo.st' },
      aspect_ratio: 1.0,
      original_metadata: { width: 100, height: 100 },
      media_urls: JSON.stringify([{ url: 'https://example.com/image.jpg', type: 'image', aspectRatio: 1.0 }])
    })
    .select('*')
    .single();

  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert success:', data);
  }
}

testInsert().catch(console.error);
