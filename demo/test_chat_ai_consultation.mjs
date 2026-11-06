import puppeteer from 'puppeteer';
import path from 'path';

const outDir = 'D:/Documents/DATN/demo/screenshots';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();
  
  // Set vi language
  await page.goto('http://localhost:5174/login');
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'vi');
    localStorage.setItem('token', '');
  });

  console.log('1. Logging in...');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"], input[type="text"]', 'admin@medtech.vn');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Navigating to /chat...');
  await page.goto('http://localhost:5174/chat', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Check vitals bar is gone
  const hasVitalsBar = await page.evaluate(() => {
    return document.body.innerText.includes('148/92') ||
           document.body.innerText.includes('104 bpm') ||
           document.body.innerText.includes('SpO2 96%');
  });
  console.log('Vital signs bar present (should be false):', hasVitalsBar);
  await page.screenshot({ path: path.join(outDir, '05_chat_initial_no_vitals.png') });

  // Test 1: Send gibberish "fhnrdyjrsf"
  console.log('3. Testing gibberish string "fhnrdyjrsf"...');
  await page.type('input.form-input', 'fhnrdyjrsf');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 2500));

  const gibberishReply = await page.evaluate(() => {
    const msgs = document.querySelectorAll('.card-body div, .empty-state ~ div');
    const allText = Array.from(document.querySelectorAll('div[style*="border-radius"], div[style*="borderRadius"]')).map(d => d.innerText);
    return allText.filter(t => t.includes('Trợ lý Y tế'));
  });
  console.log('Gibberish reply snippet:', gibberishReply.slice(-1)[0]?.substring(0, 200));
  await page.screenshot({ path: path.join(outDir, '06_chat_gibberish_response.png') });

  // Test 2: Send misspelled Aspirin "uong thuoc asprin co tac dung gi"
  console.log('4. Testing misspelled drug "uong thuoc asprin co tac dung gi"...');
  await page.type('input.form-input', 'uong thuoc asprin co tac dung gi');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 2500));

  const aspirinReply = await page.evaluate(() => {
    const allText = Array.from(document.querySelectorAll('div[style*="border-radius"], div[style*="borderRadius"]')).map(d => d.innerText);
    return allText.filter(t => t.includes('Aspirin'));
  });
  console.log('Aspirin suggestion snippet:', aspirinReply.slice(-1)[0]?.substring(0, 220));
  await page.screenshot({ path: path.join(outDir, '07_chat_misspelled_aspirin.png') });

  // Test 3: Send misspelled Paracetamol "lieu dung parasetamon cho nguoi lon"
  console.log('5. Testing misspelled drug "lieu dung parasetamon cho nguoi lon"...');
  await page.type('input.form-input', 'lieu dung parasetamon cho nguoi lon');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 2500));

  const paracetamolReply = await page.evaluate(() => {
    const allText = Array.from(document.querySelectorAll('div[style*="border-radius"], div[style*="borderRadius"]')).map(d => d.innerText);
    return allText.filter(t => t.includes('Paracetamol'));
  });
  console.log('Paracetamol suggestion snippet:', paracetamolReply.slice(-1)[0]?.substring(0, 220));
  await page.screenshot({ path: path.join(outDir, '08_chat_misspelled_paracetamol.png') });

  // Test 4: Send emergency cardio symptom "Toi bi dau that nguc va kho tho cap tinh"
  console.log('6. Testing emergency cardio symptom "Toi bi dau that nguc va kho tho cap tinh"...');
  await page.type('input.form-input', 'Toi bi dau that nguc va kho tho cap tinh');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 2500));

  const sidebarCheck = await page.evaluate(() => {
    return {
      urgencyBadgeText: document.querySelector('.card[style*="border-left"] .badge, .card[style*="borderLeft"] .badge')?.textContent || '',
      sidebarSnippet: document.body.innerText.substring(document.body.innerText.indexOf('Mức độ Khẩn cấp'), document.body.innerText.indexOf('Mức độ Khẩn cấp') + 200)
    };
  });
  console.log('Sidebar urgency check:', sidebarCheck);
  await page.screenshot({ path: path.join(outDir, '09_chat_emergency_triage.png') });

  await browser.close();
  console.log('CHAT VERIFICATION TEST COMPLETED SUCCESSFULLY!');
})();

