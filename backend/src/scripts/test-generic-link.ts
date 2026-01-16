import { extractLinkMetadata } from '../services/linkMetadata';

async function testGenericLink() {
  const url = 'https://www.bbc.com/news/articles/c4gz0rwyklyo'; // A real news article
  console.log('Testing generic link:', url);
  
  try {
    const metadata = await extractLinkMetadata(url);
    console.log('Result:', JSON.stringify(metadata, null, 2));
    if (metadata.status === 'success' || metadata.status === 'partial') {
      console.log('✅ Generic link metadata extraction works!');
    } else {
      console.error('❌ Metadata extraction failed or returned error:', metadata.error);
    }
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

testGenericLink();
