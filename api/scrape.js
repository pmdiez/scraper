const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

export default async function handler(req, res) {
  let browser = null;
  try {
    // 1. Lanzar el navegador con configuraciones de bajo consumo
    browser = await puppeteer.launch({
      args: [...chromium.args, "--disable-gpu", "--disable-dev-shm-usage"],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Evitamos cargar imágenes y CSS para ahorrar memoria y tiempo
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 2. Navegar a la web
    await page.goto('https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm', {
      waitUntil: 'networkidle2',
      timeout: 25000
    });

    // 3. Extraer datos con un selector más simple
    const products = await page.evaluate(() => {
      const results = [];
      const items = document.querySelectorAll('.product-miniature');
      items.forEach(el => {
        const nombre = el.querySelector('.product-title')?.innerText.trim();
        const precio = el.querySelector('.price')?.innerText.trim();
        const ref = el.getAttribute('data-id-product');
        const enlace = el.querySelector('a')?.href;
        
        if (nombre && precio) {
          results.push({ ref: ref || 'N/A', nombre, precio, enlace });
        }
      });
      return results;
    });

    await browser.close();
    res.status(200).json({ success: true, total: products.length, data: products });

  } catch (error) {
    if (browser) await browser.close();
    console.error("LOG_ERROR:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}