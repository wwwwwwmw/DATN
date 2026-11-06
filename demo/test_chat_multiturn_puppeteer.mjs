import puppeteer from 'puppeteer'
import path from 'path'

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 }
  })
  const page = await browser.newPage()

  console.log('1. Logging in as admin@medtech.vn...')
  await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle2' })
  await page.type('input[type="email"], input[type="text"]', 'admin@medtech.vn')
  await page.type('input[type="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await new Promise(r => setTimeout(r, 2000))

  console.log('2. Navigating to http://localhost:5174/chat...')
  await page.goto('http://localhost:5174/chat', { waitUntil: 'networkidle2' })
  await new Promise(r => setTimeout(r, 1500))

  // Turn 1
  const inputSelector = 'input.form-input'
  await page.waitForSelector(inputSelector)
  const inputEl = await page.$(inputSelector)

  const msg1 = 'Tôi vừa bị chó cắn vào bắp chân, vết thương đang rớm máu'
  console.log('3. Sending Turn 1:', msg1)
  await inputEl.type(msg1, { delay: 15 })
  await page.keyboard.press('Enter')

  console.log('Waiting for Turn 1 response from Ollama...')
  await page.waitForFunction(() => {
    const text = document.body.innerText
    return text.includes('vết thương') && (text.includes('rửa') || text.includes('băng gạc') || text.includes('uốn ván'))
  }, { timeout: 60000 })

  console.log('Turn 1 response successfully rendered!')
  await new Promise(r => setTimeout(r, 2000))

  // Turn 2
  const msg2 = 'Tôi đã rửa sạch xà phòng 15 phút rồi, bây giờ tôi nên làm gì tiếp theo?'
  console.log('4. Sending Turn 2 (testing conversation context memory):', msg2)
  await inputEl.type(msg2, { delay: 15 })
  await page.keyboard.press('Enter')

  console.log('Waiting for Turn 2 response from Ollama...')
  await new Promise(r => setTimeout(r, 3000))
  // Wait until Turn 2 loading finishes and response is rendered
  await page.waitForFunction(() => {
    const text = document.body.innerText
    return !text.includes('đang phân tích triệu chứng') && 
           (text.includes('Sau khi đã rửa') || text.includes('tiếp tục') || text.includes('băng gạc vô khuẩn') || text.includes('tiêm phòng uốn ván'))
  }, { timeout: 60000 })

  console.log('Turn 2 response successfully rendered!')
  await new Promise(r => setTimeout(r, 2500))

  const shotPath = 'D:\\Documents\\DATN\\demo\\screenshots\\11_multiturn_memory_no_chinese.png'
  await page.screenshot({ path: shotPath, fullPage: true })
  console.log(`Saved screenshot to ${shotPath}`)

  // Extract all text and verify 0 Chinese characters
  const pageText = await page.evaluate(() => document.body.innerText)
  const cjkRegex = /[\u2e80-\u2fd5\u3000-\u303f\u31c0-\u31ef\u3200-\u32ff\u3300-\u33ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/
  const hasChinese = cjkRegex.test(pageText)
  console.log('=== FINAL CHECK ===')
  console.log('Page has any Chinese / CJK characters:', hasChinese)

  await browser.close()
}

run().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
