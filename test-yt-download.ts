import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('https://cobalt.q0.wtf/api/json', {
      url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      vQuality: '1080',
      filenamePattern: 'classic'
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    console.log("Cobalt response:", res.data);
  } catch (e: any) {
    console.error("Error:", e.response?.data || e.message);
  }
}
test();
