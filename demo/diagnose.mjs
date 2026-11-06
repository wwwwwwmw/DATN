import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
  page.on('response', res => {
    if (res.status() >= 400) console.log('RES ERROR:', res.status(), res.url());
  });

  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  
  await page.evaluate(() => {
    function setVal(sel, val) {
      const input = document.querySelector(sel);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setVal('input[name="email"]', 'nguyenvanan@medtech.ai');
    setVal('input[name="password"]', 'patient123');
  });

  console.log('Submitting form...');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));
  console.log('URL after submit:', page.url());
  const errorEl = await page.$('.login-error');
  if (errorEl) {
    console.log('Login error displayed:', await page.evaluate(el => el.textContent, errorEl));
  }
  await browser.close();
})();

