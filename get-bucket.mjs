import { Storage } from '@google-cloud/storage';
const storage = new Storage({ keyFilename: './google-credentials.json' });
async function get() {
  const [buckets] = await storage.getBuckets();
  const names = buckets.map(b => b.name).filter(n => n.includes('cloud-ai'));
  console.log(names[0]);
}
get();
