import https from 'https';

function checkUrl(pathStr: string) {
  https.get(`https://maxtron-backend-git-develop-yachthub-47e69f1e.vercel.app${pathStr}`, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => console.log(pathStr, "STATUS:", res.statusCode, "BODY:", body));
  }).on('error', (e) => console.error(pathStr, "ERROR:", e.message));
}

checkUrl('/api/health');
checkUrl('/api/verify');
