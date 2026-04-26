import axios from 'axios';
import fs from 'fs';

async function testFontConversion() {
  try {
    // try to get a font from some url, assuming it gets passed to the api.
    // e.g. /api/convert-font?url=xyz.ttf&toFormat=woff2
    const url = 'http://localhost:3000/api/convert-font?url=https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2&toFormat=ttf&originalFormat=woff2';
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    console.log("Success! Length:", res.data.length);
  } catch(e) {
    console.log("Error:", e.response ? e.response.data.toString() : e.message);
  }
}
testFontConversion();
