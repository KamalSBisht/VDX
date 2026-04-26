import axios from 'axios';

async function test() {
  try {
    const res = await axios({
      method: 'GET',
      url: 'https://webtv.feratel.com/webtv/designs/v5/webfonts/Titillium_font/TitilliumWeb-Regular.woff',
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });
    console.log('Success:', res.status);
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test();
