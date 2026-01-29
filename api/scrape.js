const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Referer': 'https://www.google.com/'
            },
            timeout: 15000
        });

        const $ = cheerio.load(data);
        const products = [];

        // BUSQUEDA TÉCNICA: Extraer el objeto JSON interno de PrestaShop
        // Buscamos dentro de todos los scripts el que contiene la lista de productos
        $('script').each((i, el) => {
            const content = $(el).html();
            if (content.includes('products') && content.includes('list')) {
                // Intentamos capturar el JSON mediante una expresión regular
                const match = content.match(/products":\s*(\[.*?\]),\s*"sort_orders/s);
                if (match && match[1]) {
                    try {
                        const rawProducts = JSON.parse(match[1]);
                        rawProducts.forEach(p => {
                            products.push({
                                ref: p.reference || p.id_product || "N/A",
                                nombre: p.name || p.title,
                                precio: p.price || (p.attributes && p.attributes.price ? p.attributes.price.v : "N/A"),
                                imagen: p.cover ? p.cover.large.url : (p.images ? p.images[0].large.url : ""),
                                enlace: p.url
                            });
                        });
                    } catch (e) {
                        console.error("Error parseando JSON interno");
                    }
                }
            }
        });

        // ESTRATEGIA DE RESPALDO: Si el objeto interno falla, usamos el scrapeo visual que funcionó en el rollback
        if (products.length === 0) {
            $('.product-miniature').each((i, el) => {
                const $el = $(el);
                const nombre = $el.find('.product-title').text().trim();
                const precio = $el.find('.price').last().text().trim();
                const ref = $el.attr('data-id-product') || $el.find('.product-reference').text().replace('Ref:', '').trim();
                const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');
                const enlace = $el.find('a').attr('href');

                if (nombre && precio) {
                    products.push({ ref, nombre, precio, imagen, enlace });
                }
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