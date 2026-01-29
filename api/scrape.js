const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // Añadimos un parámetro aleatorio para evitar que el servidor de ellos nos dé una respuesta cacheada vacía
    const url = `https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm?_=${Date.now()}`;
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                // User-Agent de iPhone: suele saltarse bloqueos de escritorio
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9'
            },
            timeout: 10000
        });

        const $ = cheerio.load(data);
        const products = [];

        // Buscamos por la clase principal de PrestaShop
        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            const ref = $el.attr('data-id-product') || "N/A";
            const enlace = $el.find('.product-title a').attr('href');

            // Buscamos la imagen (intentando capturar el atributo de lazy-load)
            let imagen = $el.find('img').attr('data-src') || 
                         $el.find('img').attr('src');

            if (nombre && precio) {
                products.push({
                    ref,
                    nombre,
                    precio,
                    imagen,
                    enlace
                });
            }
        });

        // Si total es 0, enviamos un poco de contexto para saber qué ve Vercel
        if (products.length === 0) {
            console.error("No se encontraron productos. Longitud del HTML:", data.length);
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