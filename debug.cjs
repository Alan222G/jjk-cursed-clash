const puppeteer = require('puppeteer');
const delay = ms => new Promise(res => setTimeout(res, ms));

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    let crashed = false;
    page.on('console', msg => {
        if(msg.type() === 'error') console.error('BROWSER_ERROR:', msg.text());
    });
    page.on('pageerror', err => {
        crashed = true;
        console.error('PAGE_CRASH:', err.message);
        console.error('STACK:', err.stack);
    });

    console.log("Navigating to localhost:3000...");
    await page.goto('http://localhost:3000/', { waitUntil: 'load' });
    await delay(1000);

    console.log("Clicking coordinates to select P1 and P2...");
    await page.keyboard.press('Enter');
    await delay(500);
    await page.mouse.click(200, 400); // Select Gojo
    await page.mouse.click(800, 400); // Select Sukuna
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await delay(1000);

    console.log("Walking Gojo right to reach Sukuna (3 seconds)...");
    await page.keyboard.down('KeyD');
    await delay(2800);
    await page.keyboard.up('KeyD');
    await delay(100);

    console.log("Simulating Gojo Light attack (J key)...");
    await page.keyboard.press('KeyJ');
    await delay(500);

    console.log("Simulating Gojo medium attack (K key)...");
    await page.keyboard.press('KeyK');
    await delay(500);

    console.log("Simulating Gojo Blue (U key)...");
    await page.keyboard.press('KeyU');
    await delay(2000);

    console.log("Simulating Gojo Domain (I key)...");
    await page.keyboard.press('KeyI');
    await delay(2000);

    if (crashed) {
        console.log("TEST FAILED - CRASH CAUGHT!");
    } else {
        console.log("TEST PASSED - NO CRASH!");
    }

    await browser.close();
})();
