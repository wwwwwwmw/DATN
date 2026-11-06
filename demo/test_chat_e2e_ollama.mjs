import puppeteer from 'puppeteer';
import path from 'path';

const outDir = 'D:/Documents/DATN/demo/screenshots';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();
  
  await page.goto('http://localhost:5174/login');
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'vi');
    localStorage.setItem('token', '');
  });

  console.log('1. Logging in as Admin...');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"], input[type="text"]', 'admin@medtech.vn');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Opening /chat...');
  await page.goto('http://localhost:5174/chat', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Test: Send open nuanced query to Ollama
  console.log('3. Sending dynamic medical inquiry to Ollama Qwen2.5...');
  await page.type('input.form-input', 'Tôi bị đau dạ dày và ợ chua sau khi ăn đồ cay nóng, nên làm gì và kiêng gì?');
  await page.keyboard.press('Enter');

  console.log('Waiting for Ollama generation...');
  // Wait until loading spinner disappears
  await page.waitForSelector('.loading-spinner', { timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.loading-spinner'), { timeout: 40000 });

  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '10_ollama_qwen_dynamic_chat.png') });

  const conversation = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.card-body div, .empty-state ~ div, div[style*="line-height"]'))
      .map(d => d.innerText)
      .filter(t => t.length > 30);
  });
  console.log('Conversation snippets:\n', conversation.slice(-2).join('\n---\n'));

  await browser.close();
  console.log('TEST COMPLETED SUCCESSFULLY!');
})();
