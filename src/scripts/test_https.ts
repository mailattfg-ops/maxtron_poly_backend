import 'dotenv/config';
import https from 'https';

https.get(`${process.env.SUPABASE_URL}/rest/v1/`, (res) => {
  console.log("HTTPS Status:", res.statusCode);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log("Body:", body));
}).on('error', (e) => {
  console.error("HTTPS Error:", e);
});
