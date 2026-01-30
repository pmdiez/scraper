const axios = require('axios');
const cheerio = require('cheerio');

const CATALOG = {
    efectoled: {
        downlights: 'https://www.efectoled.com/es/11-comprar-downlight-led',
        paneles: 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm',
        ventiladores: 'https://www.efectoled.com/es/888-comprar-ventiladores-de-techo',
        industrial: 'https://www.efectoled.com/es/55-comprar-iluminacion-led-industrial'
    },
    greenice: {
        tiras: 'https://greenice.com/collections/tiras-led-770',
        paneles: 'https://greenice.com/collections/paneles-led-420',
        focos_proyectores: 'https://greenice.com/collections/focos-proyectores-led-para-exterior-663',
        profesional: 'https://greenice.com/collections/iluminacion-led-profesional-362'
    }
};

export default async function handler(req, res) {
    const { site, cat } = req.query;
    
    // Validación de entrada
    if (!CATALOG[site] || !CATALOG[site][cat]) {
        return res.status(400).json({ success: false, message: "Categoría no válida" });
    }

    const targetUrl = CATALOG[site][cat];

    try {
        if (site === 'greenice') {
            return await handleGreenIce(res, targetUrl);
        } else {
            return await handleEfectoLED(res, targetUrl);
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function handleGreenIce(res, url) {
    // Shopify permite obtener el JSON añadiendo /products.json
    const jsonUrl = `${url}/products.json?limit=250`;
    const { data } = await axios.get(jsonUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    
    const products = data.products.map(p => ({
        ref: p.variants[0].sku || "S/R",
        nombre: p.title,
        precio: `${p.variants[0].price} €`,
        imagen: p.images[0]?.src || "",
        enlace: `https://greenice.com/products/${p.handle}`
    })).filter(p => p.ref !== "S/R");

    res.status(200).json({ success: true, data: products });
}

async function handleEfectoLED(res, url) {
    const allProducts = [];
    const pages = 12; // Ajustamos a 12 para balancear velocidad/cantidad

    const promises = [];
    for (let i = 1; i <= pages; i++) {
        promises.push(axios.get(`${url}?page=${i}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        }).then(r => r.data).catch(() => null));
    }

    const results = await Promise.all(promises);
    results.forEach(html => {
        if (!html) return;
        const $ = cheerio.load(html);
        
        // Lógica JSON-LD del rollback exitoso
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html());
                const items = json.itemListElement || (json['@type'] === 'ItemList' ? json.itemListElement : null);
                if (items) {
                    items.forEach(item => {
                        const p = item.item || item;
                        if (p.name) {
                            allProducts.push({
                                ref: p.sku || p.mpn || (p.url ? p.url.split('/').pop().split('-')[0] : "N/A"),
                                nombre: p.name,
                                precio: p.offers ? `${p.offers.price || p.offers.offers[0].price} €` : "Ver web",
                                imagen: p.image || "",
                                enlace: p.url
                            });
                        }
                    });
                }
            } catch (e) {}
        });
    });

    const unique = Array.from(new Map(allProducts.filter(p => p.ref !== "N/A").map(p => [p.ref, p])).values());
    res.status(200).json({ success: true, data: unique });
}

