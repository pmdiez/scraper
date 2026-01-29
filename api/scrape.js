const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // Añadimos un timestamp para que la URL sea siempre "nueva" para su servidor
    const url = `https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm?random=${Date.now()}`;
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Referer': 'https://www.google.com/', // Hacemos creer que venimos de Google
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 15000
        });

        const $ = cheerio.load(data);
        const products = [];

        // Buscamos en el contenedor de miniaturas
        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            const enlace = $el.find('.product-title a').attr('href');
            const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');

            // --- EXTRACCIÓN DE REF POR TEXTO ---
            // Buscamos cualquier elemento dentro de la tarjeta que tenga números de 5 o 6 dígitos
            // que es el formato de Ref de EfectoLED.
            const tarjetaTexto = $el.text();
            const refMatch = tarjetaTexto.match(/Ref\s*(\d{5,7})/i) || tarjetaTexto.match(/(\d{5,7})/);
            const ref = refMatch ? refMatch[1] : ($el.attr('data-id-product') || "N/A");

            if (nombre && precio) {
                products.push({ ref, nombre, precio, imagen, enlace });
            }
        });

        // Si después de todo sigue dando 0, devolvemos un pedazo del HTML para debuguear
        if (products.length === 0) {
            return res.status(200).json({
                success: false,
                message: "La web devolvió una página vacía o bloqueada.",
                debug: data.substring(0, 300) // Veremos si dice "Cloudflare" o "Access Denied"
            });
        }

        res.status(200).json({ success: true, total: products.length, data: products });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}