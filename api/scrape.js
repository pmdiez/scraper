const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // Añadimos un parámetro aleatorio al final para "engañar" al caché de la tienda
    const url = `https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm?v=${Date.now()}`;
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache'
            },
            timeout: 12000
        });

        const $ = cheerio.load(data);
        const products = [];

        // Buscamos las tarjetas de producto
        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            const enlace = $el.find('.product-title a').attr('href');
            const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');

            // --- EXTRACCIÓN DE LA REF (Lógica visual) ---
            // Buscamos cualquier número de 5 o 6 dígitos que aparezca cerca de la palabra "Ref"
            // o simplemente cualquier número largo en la tarjeta del producto.
            let ref = "N/A";
            const textoTarjeta = $el.text(); // Leemos todo el texto de la ficha
            
            const matchRef = textoTarjeta.match(/Ref\s*(\d{5,7})/i) || textoTarjeta.match(/(\d{5,7})/);
            
            if (matchRef) {
                ref = matchRef[1]; // Cogemos solo el número (ej: 106784)
            } else {
                // Si falla el texto, intentamos el ID de producto interno de PrestaShop
                ref = $el.attr('data-id-product') || "N/A";
            }

            if (nombre && precio) {
                products.push({ ref, nombre, precio, imagen, enlace });
            }
        });

        // Respuesta final
        res.status(200).json({
            success: true,
            total: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Error de conexión con EfectoLED",
            error: error.message 
        });
    }
}