const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                // Solo lo esencial para que parezca un humano pero sin saturar
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'es-ES,es;q=0.9'
            },
            timeout: 10000
        });

        const $ = cheerio.load(data);
        const products = [];

        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            const ref = $el.attr('data-id-product') || "N/A";
            const enlace = $el.find('.product-title a').attr('href');

            // EXTRAER IMAGEN: Probamos varios atributos comunes de lazy-load
            let imagen = $el.find('img').attr('data-src') || 
                         $el.find('img').attr('src') || 
                         'https://via.placeholder.com/150?text=No+Image';

            // Solo añadimos si hay nombre y precio
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