const axios = require('axios');
const cheerio = require('cheerio');

const CATALOG = {
    efectoled: {
        downlights: 'https://www.efectoled.com/es/11-comprar-downlight-led',
        paneles: 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm',
        ventiladores: 'https://www.efectoled.com/es/888-comprar-ventiladores-de-techo',
        industrial: 'https://www.efectoled.com/es/55-comprar-iluminacion-led-industrial',
        iluminacion_comercial: 'https://www.efectoled.com/es/93-comprar-iluminacion-led-comercial-para-tiendas',
    },
    greenice: {
        tiras: 'https://greenice.com/collections/tiras-led-770',
        paneles: 'https://greenice.com/collections/paneles-led-420',
        focos: 'https://greenice.com/collections/focos-proyectores-led-para-exterior-663',
        profesional: 'https://greenice.com/collections/iluminacion-led-profesional-362'
    }
};

export default async function handler(req, res) {
    const site = req.query.site || 'efectoled';
    const cat = req.query.cat || 'all';

    try {
        let allProducts = [];
        
        // Determinamos qué categorías vamos a scrapear
        const categoriesToScrape = (cat === 'all') 
            ? Object.keys(CATALOG[site]) 
            : [cat];

        // Validamos que existan
        if (!CATALOG[site]) return res.status(400).json({ error: 'Sitio no válido' });

        // Procesamos cada categoría
        for (const categoryKey of categoriesToScrape) {
            const url = CATALOG[site][categoryKey];
            if (!url) continue;

            let products = [];
            if (site === 'greenice') {
                products = await scrapeGreenIce(url);
            } else {
                // Si es "all", bajamos a 4 páginas por categoría para evitar timeout en Vercel
                // Si es una sola categoría, mantenemos 15 páginas.
                const pagesToScan = (cat === 'all') ? 4 : 15;
                products = await scrapeEfectoLED(url, pagesToScan);
            }
            allProducts.push(...products);
        }

        // Eliminar duplicados por Referencia (SKU)
        const uniqueProducts = Array.from(
            new Map(allProducts.filter(p => p.ref !== "N/A").map(p => [p.ref, p])).values()
        );

        res.status(200).json({
            success: true,
            total: uniqueProducts.length,
            data: uniqueProducts
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// --- Lógica para EfectoLED ---
async function scrapeEfectoLED(baseUrl, pages) {
    const promises = [];
    for (let i = 1; i <= pages; i++) {
        promises.push(fetchEfectoPage(`${baseUrl}?page=${i}`));
    }
    const results = await Promise.all(promises.map(p => p.catch(() => [])));
    return results.flat();
}

async function fetchEfectoPage(url) {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36' },
            timeout: 8000
        });
        const $ = cheerio.load(data);
        const products = [];

        // Intento 1: JSON-LD (Más rápido y preciso)
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const json = JSON.parse($(el).html());
                const items = json.itemListElement || (json['@type'] === 'ItemList' ? json.itemListElement : null);
                if (items) {
                    items.forEach(item => {
                        const p = item.item || item;
                        if (p.name) {
                            products.push({
                                ref: p.sku || p.mpn || (p.url ? p.url.split('/').pop().split('-')[0] : "N/A"),
                                nombre: p.name,
                                precio: p.offers ? `${p.offers.price || (p.offers.offers && p.offers.offers[0].price)} €` : "Ver web",
                                imagen: p.image || "",
                                enlace: p.url
                            });
                        }
                    });
                }
            } catch (e) {}
        });

        // Intento 2: Scrapeo manual si el JSON falla
        if (products.length === 0) {
            $('.product-miniature').each((i, el) => {
                const $el = $(el);
                const nombre = $el.find('.product-title').text().trim();
                if (nombre) {
                    const matchRef = $el.text().match(/Ref\s*(\d+)/i);
                    products.push({
                        ref: matchRef ? matchRef[1] : ($el.attr('data-id-product') || "N/A"),
                        nombre: nombre,
                        precio: $el.find('.price').text().trim(),
                        imagen: $el.find('img').attr('data-src') || $el.find('img').attr('src'),
                        enlace: $el.find('a').attr('href')
                    });
                }
            });
        }
        return products;
    } catch (e) {
        return [];
    }
}

// --- Lógica para GreenIce ---
async function scrapeGreenIce(baseUrl) {
    try {
        const jsonUrl = `${baseUrl}/products.json?limit=250`;
        const { data } = await axios.get(jsonUrl, { timeout: 8000 });
        return data.products.map(p => ({
            ref: p.variants[0].sku || "S/R",
            nombre: p.title,
            precio: `${p.variants[0].price} €`,
            imagen: p.images[0]?.src || "",
            enlace: `https://greenice.com/products/${p.handle}`
        }));
    } catch (e) {
        return [];
    }
}
