const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // Usamos la URL limpia
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'es-ES,es;q=0.9',
                'Cache-Control': 'no-cache'
            },
            timeout: 15000 // 15 segundos máximo
        });

        const $ = cheerio.load(data);
        const products = [];

        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            // Cogemos el último precio (el que está en negrita/grande)
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            const enlace = $el.find('.product-title a').attr('href');
            const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');

            // --- BUSCADOR DE REFERENCIA (EL NÚMERO DE 6 DÍGITOS) ---
            // Buscamos dentro de la tarjeta cualquier texto que contenga "Ref"
            let ref = "N/A";
            const textoTarjeta = $el.text();
            const match = textoTarjeta.match(/Ref\s*(\d+)/i) || textoTarjeta.match(/(\d{5,7})/);
            
            if (match) {
                ref = match[1];
            } else {
                ref = $el.attr('data-id-product') || "N/A";
            }

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
        // Si hay un error de timeout o red, lo informamos
        res.status(500).json({ 
            success: false, 
            message: "La web de EfectoLED no respondió a tiempo",
            error: error.message 
        });
    }
}