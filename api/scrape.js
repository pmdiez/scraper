const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const products = [];

        // BUSQUEDA TÉCNICA 1: Buscamos en los scripts de datos estructurados (JSON-LD)
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const json = JSON.parse($(el).html());
                // Si el JSON tiene una lista de items (itemListElement)
                if (json.itemListElement) {
                    json.itemListElement.forEach(item => {
                        const p = item.item || item;
                        if (p.name) {
                            products.push({
                                ref: p.sku || p.mpn || "N/A",
                                nombre: p.name,
                                precio: p.offers ? `${p.offers.price} ${p.offers.priceCurrency}` : "Ver web",
                                enlace: p.url || url
                            });
                        }
                    });
                }
            } catch (e) { /* Ignorar scripts mal formados */ }
        });

        // BUSQUEDA TÉCNICA 2: Si el JSON-LD falla, usamos selectores clásicos mejorados
        if (products.length === 0) {
            $('.product-miniature').each((i, el) => {
                const $el = $(el);
                products.push({
                    ref: $el.attr('data-id-product') || "N/A",
                    nombre: $el.find('.product-title').text().trim(),
                    precio: $el.find('.price').text().trim(),
                    enlace: $el.find('a').attr('href')
                });
            });
        }

        res.status(200).json({
            success: true,
            total: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}