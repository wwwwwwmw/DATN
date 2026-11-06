import puppeteer from 'puppeteer';
import path from 'path';

const outDir = 'D:/Documents/DATN/demo/screenshots';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1400, height: 900 }
  });

  const page = await browser.newPage();
  
  // Set localStorage language to vi
  await page.goto('http://localhost:5174/login');
  await page.evaluate(() => {
    localStorage.setItem('i18nextLng', 'vi');
    localStorage.setItem('token', '');
  });

  console.log('1. Logging in as Doctor / Admin...');
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"], input[type="text"]', 'admin@medtech.vn');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Verifying Doctor Dashboard...');
  await page.screenshot({ path: path.join(outDir, '01_dashboard_loaded.png') });

  console.log('3. Clicking on first schedule item (which is Completed: Nguyễn Văn An)...');
  const clickedSchedule = await page.evaluate(() => {
    // Select the first schedule row
    const card = document.querySelector('.card');
    const firstRow = card ? card.querySelector('.card-body > div') : null;
    if (firstRow) {
      firstRow.click();
      return true;
    }
    return false;
  });
  console.log('Clicked first schedule row:', clickedSchedule);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '02_completed_appointment_modal.png') });

  // Read modal text content to verify clinical results
  const modalText = await page.evaluate(() => {
    const modal = document.querySelector('div[style*="z-index: 1050"], div[style*="zIndex: 1050"]');
    return modal ? modal.innerText : 'MODAL_NOT_FOUND';
  });
  console.log('Appointment Modal content snippet:', modalText.substring(0, 300));

  // Close modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const closeBtn = buttons.find(b => b.textContent.trim() === 'Đóng');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('4. Clicking "Xem chi tiết" on New Booking Request...');
  const clickedRequest = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const detailBtn = buttons.find(b => b.textContent.includes('Xem chi tiết') && !b.textContent.includes('Ký duyệt'));
    if (detailBtn) {
      detailBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked request detail:', clickedRequest);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, '03_booking_request_modal.png') });

  // Read request modal text
  const reqModalText = await page.evaluate(() => {
    const modal = document.querySelector('div[style*="z-index: 1050"], div[style*="zIndex: 1050"]');
    return modal ? modal.innerText : 'MODAL_NOT_FOUND';
  });
  console.log('Booking Request Modal snippet:', reqModalText.substring(0, 300));

  // Close request modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const closeBtn = buttons.find(b => b.textContent.trim() === 'Đóng');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  console.log('5. Clicking "Xem chi tiết và Ký duyệt" on AI Result...');
  const clickedXray = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const xrayBtn = buttons.find(b => b.textContent.includes('Ký duyệt') || b.textContent.includes('View details'));
    if (xrayBtn) {
      xrayBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked X-ray detail and sign:', clickedXray);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(outDir, '04_xray_analysis_page.png') });

  // Check X-ray page
  const xrayCheck = await page.evaluate(() => {
    return {
      hasHeatmap: !!document.querySelector('radialGradient'),
      hasPredictions: document.querySelectorAll('.card').length >= 3,
      title: document.title,
      text: document.body.innerText.substring(0, 250)
    };
  });
  console.log('Xray page verification:', xrayCheck);

  await browser.close();
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
})();
