import axios from 'axios';
async function test() {
  const url = 'http://localhost:3000/api/convert-font?url=https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2&toFormat=woff2&originalFormat=woff2';
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    console.log("Success:", res.data.length);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();
