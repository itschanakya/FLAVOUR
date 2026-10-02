const https = require('https');

function fetchAndMeasure(url, cb) {
  https.get(url, { headers: { 'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' } }, (res) => {
    let size = 0;
    res.on('data', chunk => size += chunk.length);
    res.on('end', () => {
      const type = res.headers['content-type'];
      const cl = res.headers['content-length'];
      cb(res.statusCode, size, cl, type);
    });
  });
}

const pubId = 'v1/ncc_refreshment/receipts/receipt-1788678256811-524975770';
const cloud = 'cayt6dvv';
const origUrl = `https://res.cloudinary.com/${cloud}/image/upload/${pubId}`;
const trUrl = `https://res.cloudinary.com/${cloud}/image/upload/b_gen_fill,c_pad,h_1000,w_1000,y_-100/l_text:Arial_72_bold:Adapt%20everywhere,co_white/e_shadow:50/fl_layer_apply,g_south_west,x_80,y_140/l_text:Arial_34:Dynamic%20media%20built%20in%20real%20time,co_rgb:E9D5FF/e_shadow:35/fl_layer_apply,g_south_west,x_84,y_90/f_auto/q_auto/${pubId}`;

console.log('Original URL:', origUrl);
console.log('Transformed URL:', trUrl);

fetchAndMeasure(origUrl, (status, size, cl, type) => {
  console.log('Orig:', status, size, cl, type);
  fetchAndMeasure(trUrl, (status2, size2, cl2, type2) => {
    console.log('Trans:', status2, size2, cl2, type2);
  });
});
