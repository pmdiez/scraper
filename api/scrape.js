const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                // Solo lo mínimo para parecer un navegador normal
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });

        const $ = cheerio.load(data);
        const products = [];

        // Usamos el selector más básico posible
        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            
            // BUSCAR LA REF: Buscamos el texto que contenga "Ref" dentro de la tarjeta
            let ref = "N/A";
            $el.find('*').each((_, subEl) => {
                const text = $(subEl).text();
                if (text.includes('Ref')) {
                    // Extraemos solo los números que siguen a "Ref"
                    const match = text.match(/\d+/);
                    if (match) ref = match[0];
                }
            });

            // Si no encontró "Ref", usamos el ID de producto como plan B
            if (ref === "N/A") ref = $el.attr('data-id-product') || "N/A";

            const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');
            const enlace = $el.find('.product-title a').attr('href');

            if (nombre && precio) {
                products.push({ ref, nombre, precio, imagen, enlace });
            }
        });

        res.status(200).json({
            success: true,
            total: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}