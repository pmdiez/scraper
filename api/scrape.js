const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const site = req.query.site || 'efectoled'; // Por defecto efectoled
    
    if (site === 'greenice') {
        return await handleGreenIce(res);
    } else {
        return await handleEfectoLED(res);
    }
}

// --- MOTOR GREENICE (Shopify JSON) ---
async function handleGreenIce(res) {
    const baseUrl = 'https://greenice.com/collections/tiras-led-770/products.json';
    try {
        const { data } = await axios.get(`${baseUrl}?limit=250`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const products = data.products.map(p => ({
            ref: p.variants[0].sku || "S/R",
            nombre: p.title,
            precio: `${p.variants[0].price} €`,
            imagen: p.images[0]?.src || "",
            enlace: `https://greenice.com/products/${p.handle}`
        })).filter(p => p.ref !== "S/R");

        res.status(200).json({ success: true, total: products.length, pages: 1, data: products });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}

// --- MOTOR EFECTOLED (PrestaShop Scraping) ---
async function handleEfectoLED(res) {
    const baseUrl = 'https://www.efectoled.com/es/11-comprar-downlight-led';
    const allProducts = [];
    try {
        const promises = [];
        for (let i = 1; i <= 20; i++) {
            promises.push(axios.get(`${baseUrl}?page=${i}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 10000
            }).then(r => r.data).catch(() => null));
        }

        const pages = await Promise.all(promises);
        pages.forEach(html => {
            if (!html) return;
            const $ = cheerio.load(html);
            $('.product-miniature').each((i, el) => {
                const $el = $(el);
                const ref = $el.text().match(/Ref\s*(\d+)/i)?.[1] || $el.attr('data-id-product');
                const nombre = $el.find('.product-title').text().trim();
                const precio = $el.find('.price').text().trim();
                if (ref && precio && precio !== "Ver web") {
                    allProducts.push({
                        ref, nombre, precio,
                        imagen: $el.find('img').attr('data-src') || $el.find('img').attr('src'),
                        enlace: $el.find('a').attr('href')
                    });
                }
            });
        });
        res.status(200).json({ success: true, total: allProducts.length, pages: 20, data: allProducts });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
}
