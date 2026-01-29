const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    let browser = null;

    try {
        // Configuramos el navegador para entorno Serverless
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // Vamos a la URL
        await page.goto('https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm', {
            waitUntil: 'networkidle2', // Espera a que la red esté tranquila
            timeout: 30000
        });

        // Obtenemos el HTML después de que JS se haya ejecutado
        const content = await page.content();
        const $ = cheerio.load(content);
        const products = [];

        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').text().trim();
            const ref = $el.attr('data-id-product') || "N/A";
            const link = $el.find('.product-title a').attr('href');

            if (nombre && precio) {
                products.push({ ref, nombre, precio, enlace: link });
            }
        });

        await browser.close();

        res.status(200).json({
            success: true,
            total: products.length,
            data: products
        });

    } catch (error) {
        if (browser !== null) await browser.close();
        res.status(500).json({ success: false, error: error.message });
    }
}