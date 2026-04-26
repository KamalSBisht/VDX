import axios from 'axios';
async function test() {
  const url = 'http://localhost:3000/api/convert-font?url=https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2&toFormat=woff&originalFormat=woff2';
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    console.log("woff2 to woff success:", res.data.length);
  } catch(e) {
    if (e.response && e.response.data instanceof Buffer) {
      console.log("woff2 to woff error:", Buffer.from(e.response.data).toString());
    } else {
      console.log("woff2 to woff error:", e.response ? e.response.data : e.message);
    }
  }
}
test();
