const puppeteer = require('puppeteer');
const fs = require('fs');
const https = require('https');
const http = require('http');

fs.mkdirSync('public/assets/audio', { recursive: true });

const download = (url, dest) => {
    return new Promise((resolve) => {
        if (!url) {
            console.error("URL is empty for", dest);
            return resolve();
        }
        console.log(`Downloading ${url} -> ${dest}`);
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                console.log("Redirecting to", res.headers.location);
                return download(res.headers.location, dest).then(resolve);
            }
            const fileStream = fs.createWriteStream(dest);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log("Saved", dest);
                resolve();
            });
        }).on('error', (err) => {
            console.error('Download error:', err.message);
            resolve();
        });
    });
};

(async () => {
    console.log("Starting headless chromium...");
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    // pretend to be a real user
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // ── IMAGE SCRAPING (DuckDuckGo bypassing base64) ──
    console.log("Fetching Gojo Void Wallpaper...");
    await page.goto('https://duckduckgo.com/?t=h_&q=jujutsu+kaisen+unlimited+void+1080p+wallpaper+-live&iax=images&ia=images');
    await new Promise(r => setTimeout(r, 2000));
    // Click the first image to open the detail panel
    await page.click('.tile--img__img');
    await new Promise(r => setTimeout(r, 1000));
    let gojoBg = await page.evaluate(() => {
        const img = document.querySelector('.detail__media__img-highres');
        return img ? img.src : null;
    });
    if(gojoBg && gojoBg.startsWith('//')) gojoBg = 'https:' + gojoBg;
    if(gojoBg) await download(gojoBg, 'public/assets/domains/gojo_void_official.jpg');

    console.log("Fetching Sukuna Shrine Wallpaper...");
    await page.goto('https://duckduckgo.com/?t=h_&q=jujutsu+kaisen+malevolent+shrine+1080p+wallpaper+-live&iax=images&ia=images');
    await new Promise(r => setTimeout(r, 2000));
    await page.click('.tile--img__img');
    await new Promise(r => setTimeout(r, 1000));
    let sukunaBg = await page.evaluate(() => {
        const img = document.querySelector('.detail__media__img-highres');
        return img ? img.src : null;
    });
    if(sukunaBg && sukunaBg.startsWith('//')) sukunaBg = 'https:' + sukunaBg;
    if(sukunaBg) await download(sukunaBg, 'public/assets/domains/sukuna_shrine_official.jpg');

    console.log("Asset Extraction Complete.");
    await browser.close();
})();
