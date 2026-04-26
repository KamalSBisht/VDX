import axios from 'axios';

async function testDownload() {
  const url = 'https://loader.to/api/button/?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&f=1080&color=18181b';
  try {
    const res = await axios.get(url, { responseType: 'text' });
    console.log(res.data);
  } catch(e) {
    console.log(e);
  }
}
testDownload();
