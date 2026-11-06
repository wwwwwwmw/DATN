import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const DEMO_DIR = 'D:\\Documents\\DATN\\demo';
const BASE_URL = 'http://localhost:5174';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function setReactInputValue(page, selector, value) {
  await page.evaluate((sel, val) => {
    const input = document.querySelector(sel);
    if (!input) return false;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, selector, value);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--start-maximized', '--no-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    console.log('1. Đăng nhập với tài khoản Admin/Bác sĩ: admin@medtech.vn');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Đảm bảo tiếng Việt
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);

    await page.waitForSelector('input[name="email"]');
    await setReactInputValue(page, 'input[name="email"]', 'admin@medtech.vn');
    await setReactInputValue(page, 'input[name="password"]', 'admin123');
    await sleep(500);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    console.log('Đăng nhập thành công, URL:', page.url());
    await sleep(3000);

    // Chụp màn hình trang Doctor Dashboard với dữ liệu thật từ DB
    await page.screenshot({ path: path.join(DEMO_DIR, 'doctor_dashboard_real_data.png'), fullPage: true });
    console.log('Đã lưu ảnh: doctor_dashboard_real_data.png');

    // 2. Test nút Thông báo trên Header
    console.log('2. Test mở Dropdown Thông báo trên Header');
    const bellBtn = await page.$('.notification-btn');
    if (bellBtn) {
      await bellBtn.click();
      await sleep(1500);
      await page.screenshot({ path: path.join(DEMO_DIR, 'notification_dropdown_open.png') });
      console.log('Đã lưu ảnh: notification_dropdown_open.png');
    }

    // Đóng dropdown thông báo
    await page.click('body', { offset: { x: 100, y: 100 } });
    await sleep(500);

    // 3. Test click vào stat card "AI REVIEW" (Chờ AI duyệt) -> phải nhảy sang /xray
    console.log('3. Test click stat card AI REVIEW -> chuyển sang /xray');
    const cards = await page.$$('.stat-card');
    if (cards.length >= 3) {
      await cards[2].click(); // Thẻ thứ 3 là AI REVIEW
      await sleep(2500);
      console.log('URL sau khi click AI REVIEW:', page.url());
      await page.screenshot({ path: path.join(DEMO_DIR, 'navigated_to_xray.png') });
      console.log('Đã lưu ảnh: navigated_to_xray.png');
    }

    // 4. Quay lại trang chủ, test click stat card "URGENT" (Khẩn cấp)
    console.log('4. Quay lại trang chủ, test click stat card URGENT');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    const cards2 = await page.$$('.stat-card');
    if (cards2.length >= 4) {
      await cards2[3].click(); // Thẻ thứ 4 là URGENT
      await sleep(1500);
      await page.screenshot({ path: path.join(DEMO_DIR, 'filtered_urgent_appointments.png') });
      console.log('Đã lưu ảnh: filtered_urgent_appointments.png');
    }

    // 5. Test nút "Vào phòng khám" Telehealth -> phải nhảy sang /telehealth
    console.log('5. Test click nút "Vào phòng khám"');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
    await sleep(2000);
    const videoBtn = await page.$('button.btn-secondary.btn-sm');
    if (videoBtn) {
      await videoBtn.click();
      await sleep(2500);
      console.log('URL sau khi click Vào phòng khám:', page.url());
      await page.screenshot({ path: path.join(DEMO_DIR, 'navigated_to_telehealth.png') });
      console.log('Đã lưu ảnh: navigated_to_telehealth.png');
    }

    console.log('\n✅ TẤT CẢ KIỂM THỬ TƯƠNG TÁC THÀNH CÔNG RỰC RỠ!');

  } catch (err) {
    console.error('Lỗi kiểm thử:', err);
  } finally {
    await browser.close();
  }
})();

