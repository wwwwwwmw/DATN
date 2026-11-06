import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const DEMO_DIR = 'D:\\Documents\\DATN\\demo';
const BASE_URL = 'http://localhost:5174';
const results = [];

function log(step, status, detail) {
  const entry = { step, status, detail, time: new Date().toLocaleTimeString('vi-VN') };
  results.push(entry);
  console.log(`[${status}] Bước ${step}: ${detail}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name, step) {
  const filePath = path.join(DEMO_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  log(step, 'PASS', `Đã lưu ảnh chụp: ${name}.png`);
  return filePath;
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
  if (!fs.existsSync(DEMO_DIR)) {
    fs.mkdirSync(DEMO_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    defaultViewport: { width: 1440, height: 900 },
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    // ==========================================
    // BƯỚC 1: ĐĂNG NHẬP (LOGIN)
    // ==========================================
    console.log('\n=== BƯỚC 1: ĐĂNG NHẬP ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Đảm bảo mặc định là tiếng Việt
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload({ waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(2000);

    // Chụp màn hình đăng nhập tiếng Việt
    await screenshot(page, '01_login_page_vietnamese', 1);

    // Điền tài khoản bệnh nhân
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await setReactInputValue(page, 'input[name="email"]', 'nguyenvanan@medtech.ai');
    await setReactInputValue(page, 'input[name="password"]', 'patient123');

    await sleep(1000);
    await screenshot(page, '02_login_filled', 2);

    // Nhấn Đăng nhập
    await page.click('button[type="submit"]');
    log(3, 'PASS', 'Đã nhấn nút Đăng nhập');

    // Chờ chuyển hướng sang trang chủ (URL không còn /login)
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 });
    log(4, 'PASS', `Đăng nhập thành công, URL: ${page.url()}`);
    await sleep(2500);

    // ==========================================
    // BƯỚC 2: CỔNG BỆNH NHÂN (PATIENT PORTAL)
    // ==========================================
    console.log('\n=== BƯỚC 2: CỔNG BỆNH NHÂN ===');
    await screenshot(page, '03_patient_dashboard', 5);
    await sleep(1500);

    // ==========================================
    // BƯỚC 3: TƯ VẤN AI (CHAT AI - RAG)
    // ==========================================
    console.log('\n=== BƯỚC 3: TƯ VẤN AI (RAG) ===');
    await page.goto(`${BASE_URL}/chat`, { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(2000);
    await screenshot(page, '04_chat_empty', 6);

    // Điền câu hỏi triệu chứng
    await page.waitForSelector('input.form-input', { timeout: 10000 });
    await setReactInputValue(page, 'input.form-input', 'Tôi bị đau tức ngực và khó thở khi gắng sức');
    await sleep(500);

    // Nhấn Enter gửi câu hỏi
    await page.keyboard.press('Enter');
    log(7, 'PASS', 'Đã gửi câu hỏi triệu chứng lâm sàng tới AI RAG');

    // Chờ AI phân tích và trả về kết quả
    await sleep(5000);
    await screenshot(page, '05_chat_with_response', 8);

    // ==========================================
    // BƯỚC 4: ĐẶT LỊCH THÔNG MINH (SIMULATED ANNEALING)
    // ==========================================
    console.log('\n=== BƯỚC 4: ĐẶT LỊCH THÔNG MINH ===');
    await page.goto(`${BASE_URL}/booking`, { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(3000);
    await screenshot(page, '06_smart_booking', 9);

    // ==========================================
    // BƯỚC 5: PHÂN TÍCH X-QUANG AI (DENSENET)
    // ==========================================
    console.log('\n=== BƯỚC 5: PHÂN TÍCH X-QUANG AI ===');
    await page.goto(`${BASE_URL}/xray`, { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(2500);
    await screenshot(page, '07_xray_upload', 10);

    // ==========================================
    // BƯỚC 6: HỒ SƠ BỆNH ÁN ĐIỆN TỬ (ICD-10)
    // ==========================================
    console.log('\n=== BƯỚC 6: HỒ SƠ BỆNH ÁN ĐIỆN TỬ ===');
    await page.goto(`${BASE_URL}/records`, { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(2500);
    await screenshot(page, '08_medical_records_icd10', 11);

    // ==========================================
    // BƯỚC 7: BẢN ĐỒ PHÒNG KHÁM GIS
    // ==========================================
    console.log('\n=== BƯỚC 7: BẢN ĐỒ PHÒNG KHÁM GIS ===');
    await page.goto(`${BASE_URL}/map`, { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(4000); // Đợi tải bản đồ Leaflet
    await screenshot(page, '09_clinic_map', 12);

    // ==========================================
    // BƯỚC 8: KHÁM TỪ XA TELEHEALTH (WEBRTC)
    // ==========================================
    console.log('\n=== BƯỚC 8: KHÁM TỪ XA TELEHEALTH ===');
    await page.goto(`${BASE_URL}/telehealth`, { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(2500);
    await screenshot(page, '10_telehealth_precall', 13);

    // Bấm nút "Bắt đầu khám"
    const clickedStart = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Bắt đầu') || b.textContent.includes('Start')));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (clickedStart) {
      log(14, 'PASS', 'Đã bấm nút Bắt đầu khám');
      await sleep(4000); // Đợi timer đếm ~00:04
      await screenshot(page, '11_telehealth_call_timer', 15);
    } else {
      log(14, 'WARN', 'Không tìm thấy nút Bắt đầu khám');
    }

    // ==========================================
    // BƯỚC 9: CÀI ĐẶT & BẢO MẬT (SETTINGS)
    // ==========================================
    console.log('\n=== BƯỚC 9: CÀI ĐẶT & BẢO MẬT ===');
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle2', timeout: 10000 });
    await sleep(2500);
    await screenshot(page, '12_settings', 16);

    // ==========================================
    // BƯỚC 10: ĐỔI NGÔN NGỮ (VI/EN)
    // ==========================================
    console.log('\n=== BƯỚC 10: ĐỔI NGÔN NGỮ ===');
    const langToggled = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button, .header-actions button'));
      const btn = btns.find(b => b.textContent && (b.textContent.trim() === 'VI' || b.textContent.trim() === 'EN'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (langToggled) {
      log(17, 'PASS', 'Đã bấm nút chuyển đổi ngôn ngữ sang Tiếng Anh');
      await sleep(2500);
      await screenshot(page, '13_english_interface', 18);

      // Chuyển lại về Tiếng Việt
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('header button, .header-actions button'));
        const btn = btns.find(b => b.textContent && b.textContent.trim() === 'EN');
        if (btn) btn.click();
      });
      await sleep(1500);
      log(19, 'PASS', 'Đã chuyển lại Tiếng Việt chuẩn mặc định');
    }

    // ==========================================
    // BƯỚC 11: ĐĂNG XUẤT (LOGOUT)
    // ==========================================
    console.log('\n=== BƯỚC 11: ĐĂNG XUẤT ===');
    const loggedOut = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button'));
      const logoutBtn = btns[btns.length - 1]; // Nút logout ở cuối header
      if (logoutBtn) {
        logoutBtn.click();
        return true;
      }
      return false;
    });

    if (loggedOut) {
      log(20, 'PASS', 'Đã bấm nút Đăng xuất');
    }
    await sleep(2500);
    await screenshot(page, '14_logout_login_page', 21);

    console.log('\n🎉 DEMO HOÀN THÀNH XUẤT SẮC TOÀN BỘ 11 BƯỚC!');

  } catch (err) {
    console.error('Lỗi demo:', err);
    log('ERR', 'FAIL', err.message);
  } finally {
    fs.writeFileSync(path.join(DEMO_DIR, 'demo_results.json'), JSON.stringify(results, null, 2), 'utf-8');
    await browser.close();
  }
})();
