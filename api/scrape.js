const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // Añadimos parámetros para forzar a PrestaShop a darnos la lista limpia
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm?resultsPerPage=999';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache'
            },
            timeout: 15000
        });

        const $ = cheerio.load(data);
        const products = [];

        // BUSCADOR UNIVERSAL: Buscamos cualquier cosa que parezca un producto
        const selectors = [
            '.product-miniature',
            'article',
            '.js-product-miniature',
            '[data-id-product]'
        ];

        $(selectors.join(',')).each((i, el) => {
            const $el = $(el);
            
            // Nombre: buscamos en títulos o enlaces
            const nombre = $el.find('.product-title, .h3, h2, a.product-name').first().text().trim();
            
            // Precio: buscamos el último precio (el rebajado)
            let precio = $el.find('.price, .current-price').last().text().trim();
            
            // REFERENCIA: Buscamos el texto exacto que viste en el frontend
            let ref = "N/A";
            // Escaneamos todos los elementos de la tarjeta buscando el patrón de Ref
            $el.find('*').each((_, sub) => {
                const text = $(sub).text();
                if (text.includes('Ref')) {
                    const match = text.match(/\d+/);
                    if (match) ref = match[0];
                }
            });

            // Si no hay Ref por texto, intentamos el ID de producto
            if (ref === "N/A") ref = $el.attr('data-id-product') || "N/A";

            // Imagen y Enlace
            const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');
            const enlace = $el.find('a').attr('href');

            if (nombre && precio && products.length < 50) {
                products.push({ ref, nombre, precio, imagen, enlace });
            }
        });

        // RESPUESTA
        res.status(200).json({
            success: true,
            total: products.length,
            data: products,
            // Solo para debug si vuelve a dar 0
            empty: products.length === 0 ? data.substring(0, 500) : null
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}