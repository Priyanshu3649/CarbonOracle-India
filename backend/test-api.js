const http = require('http');

const data = JSON.stringify({ email: 'admin@carbonoracle.in', password: 'admin123' });

const req = http.request({
  hostname: 'localhost',
  port: 5010,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const token = JSON.parse(body).token;
    console.log("Got Token:", token ? "YES" : "NO");
    
    // Now request blockchain records
    http.get({
      hostname: 'localhost',
      port: 5010,
      path: '/api/blockchain/records?limit=5',
      headers: { 'Authorization': 'Bearer ' + token }
    }, (res2) => {
      let body2 = '';
      res2.on('data', chunk => body2 += chunk);
      res2.on('end', () => {
        console.log("API Response Status:", res2.statusCode);
        console.log("API Response Body:", JSON.stringify(JSON.parse(body2), null, 2));
      });
    });
  });
});

req.write(data);
req.end();
