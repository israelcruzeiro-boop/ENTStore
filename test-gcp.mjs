import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  keyFilename: './google-credentials.json',
});

async function testGCP() {
  try {
    console.log('Testando acesso ao GCP Storage...');
    const [buckets] = await storage.getBuckets();
    console.log('Sucesso! Buckets disponíveis:');
    buckets.forEach(bucket => {
      console.log(`- ${bucket.name}`);
    });

    // Try to create a test bucket
    const bucketName = `test-bucket-antigravity-${Date.now()}`;
    console.log(`\nTentando criar o bucket de teste: ${bucketName}...`);
    const [newBucket] = await storage.createBucket(bucketName);
    console.log(`Sucesso! Bucket criado: ${newBucket.name}`);
  } catch (error) {
    console.error('Erro ao acessar o GCP:', error.message);
  }
}

testGCP();
