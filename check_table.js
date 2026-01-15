const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fgouujodhbnfhelveddh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnb3V1am9kaGJuZmhlbHZlZGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMDIyMjksImV4cCI6MjA4MDY3ODIyOX0._YwsBfHqj2udb-YBftfvB_Fqs3PKbjEtYXSCOLT11lU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking media_urls column in posts table...');
  const { data, error } = await supabase
    .from('posts')
    .select('media_urls')
    .limit(1);

  if (error) {
    console.error('Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Success, data:', JSON.stringify(data, null, 2));
  }
}

check();
