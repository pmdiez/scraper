const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 10000
        });

        const $ = cheerio.load(data);
        let products = [];

        // ESTRATEGIA A: Extraer del JSON que la web da a Google (Súper estable)
        $('script[type="application/ld+json"]').each((i, el) => {
            try {
                const json = JSON.parse($(el).html());
                if (json['@type'] === 'ItemList' && json.itemListElement) {
                    json.itemListElement.forEach(item => {
                        const p = item.item;
                        if (p) {
                            products.push({
                                ref: p.sku || p.mpn || "N/A",
                                nombre: p.name,
                                precio: p.offers?.offers?.[0]?.price || p.offers?.price || "Consultar",
                                imagen: p.image,
                                enlace: p.url
                            });
                        }
                    });
                }
            } catch (e) {}
        });

        // ESTRATEGIA B: Si Google no nos da el JSON, usamos el selector que funcionó en tu rollback
        if (products.length === 0) {
            $('.product-miniature').each((i, el) => {
                const $el = $(el);
                const nombre = $el.find('.product-title').text().trim();
                const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
                const ref = $el.attr('data-id-product') || "N/A";
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