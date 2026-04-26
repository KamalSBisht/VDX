import puppeteer from 'puppeteer';

async function test() {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const images = new Set();
  
  page.on('response', response => {
    const resourceType = response.request().resourceType();
    if (resourceType === 'image') {
      images.add(response.url());
    }
  });
  
  await page.goto('https://www.apple.com', { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
  
  console.log(Array.from(images));
  await browser.close();
}

test();
