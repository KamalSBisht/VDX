import axios from 'axios';

async function test() {
  try {
    const cssUrl = 'https://www.apple.com/wss/fonts?families=SF+Pro,v3|SF+Pro+Icons,v3';
    const cssResponse = await axios.get(cssUrl, { 
      timeout: 5000,
      validateStatus: (status) => status === 200,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      }
    });
    console.log("Success:", cssResponse.status);
  } catch (e: any) {
    if (e.response && e.response.status === 404) {
      console.warn(`CSS file not found (404): ${'https://www.apple.com/wss/fonts?families=SF+Pro,v3|SF+Pro+Icons,v3'}`);
    } else {
      console.error(`Failed to fetch CSS: ${'https://www.apple.com/wss/fonts?families=SF+Pro,v3|SF+Pro+Icons,v3'}`, e.message || e);
    }
  }
}

test();
