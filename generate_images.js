const https = require('https');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.MINIMAX_API_KEY;

const castles = [
  {
    name: '月光城堡',
    prompt: 'A majestic fantasy castle on a cloud-shrouded mountain peak, bathed in silver moonlight. Towering spires reach into the starry sky. Crystal clear moat reflects the stars. Gothic architecture with ethereal glowing windows. Hyperrealistic, cinematic lighting, 8K ultra detailed, fantasy art',
    filename: 'castle1.jpg'
  },
  {
    name: '皇家城堡',
    prompt: 'A grand baroque royal palace with golden domes gleaming in sunlight. Intricate sculptures, majestic fountains in the courtyard. French formal garden with geometric patterns. Imperial eagles atop the gates. Hyperrealistic architectural photography, ultra detailed, golden hour lighting, 8K',
    filename: 'castle2.jpg'
  },
  {
    name: '森林城堡',
    prompt: 'A mysterious medieval castle surrounded by ancient enchanted forest. Moss-covered stone walls, crumbling towers embraced by giant oak trees. Fireflies dancing over the crystal moat. Mystical fog rolling through the trees. Dark fantasy atmosphere, hyperrealistic, cinematic, 8K detailed',
    filename: 'castle3.jpg'
  }
];

function generateImage(castle) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'image-01',
      prompt: castle.prompt,
      num_images: 1,
      aspect_ratio: '3:2'
    });

    const options = {
      hostname: 'api.minimaxi.com',
      path: '/v1/image_generation',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    console.log(`🎨 Generating: ${castle.name}...`);
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.base_resp && result.base_resp.status_msg !== 'success') {
            reject(new Error(`API error: ${result.base_resp.status_msg}`));
            return;
          }
          
          const imageUrl = result.data && result.data.image_urls && result.data.image_urls[0];
          if (!imageUrl) {
            console.log('Raw response:', body.substring(0, 500));
            reject(new Error('No image URL in response'));
            return;
          }
          
          console.log(`✅ Generated: ${castle.name} - URL: ${imageUrl}`);
          resolve({ ...castle, imageUrl });
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filename).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`💾 Downloaded: ${filename}`);
        resolve(filename);
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('🏰 Starting castle image generation...\n');
  
  for (const castle of castles) {
    try {
      const result = await generateImage(castle);
      await downloadImage(result.imageUrl, path.join(__dirname, result.filename));
      console.log('');
    } catch (e) {
      console.error(`❌ Failed ${castle.name}: ${e.message}`);
    }
  }
  
  console.log('\n🏰 All castle images generated!');
}

main().catch(console.error);
