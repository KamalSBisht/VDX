import axios from 'axios';
async function testLoaderLink() {
  try {
    const res = await axios.get("https://loader.to/?link=https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    console.log(res.data.includes('dQw4w9WgXcQ'));
  } catch(e) { console.log(e); }
}
testLoaderLink();
