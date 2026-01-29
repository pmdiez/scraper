const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // Usamos 'content_only=1' para pedir solo la lista de productos y saltar bloqueos
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm?content_only=1';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Referer': 'https://www.google.com/',
                'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            }
        });

        const $ = cheerio.load(data);
        const products = [];

        // PrestaShop 1.7+ usa estas clases específicas
        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            // Nombre del producto
            const nombre = $el.find('.product-title a').text().trim() || 
                           $el.find('h3 a').text().trim() || 
                           $el.find('h2').text().trim();
            
            // Precio (buscamos el span con la clase price o el que tenga el símbolo €)
            const precio = $el.find('.price').text().trim() || 
                           $el.find('.current-price').text().trim();
            
            // Referencia (ID de producto en el atributo data)
            const ref = $el.attr('data-id-product') || "REF-" + i;
            
            // Enlace completo
            let link = $el.find('a').attr('href');
            if (link && !link.startsWith('http')) {
                link = 'https://www.efectoled.com' + link;
            }

            if (nombre && precio) {
                products.push({
                    ref: ref,
                    nombre: nombre,
                    precio: precio,
                    enlace: link
                });
            }
        });

        res.setHeader('Content-Type', 'application/json');
        res.status(200).json({
            success: true,
            total: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Error al conectar con EfectoLED",
            error: error.message 
        });
    }
}