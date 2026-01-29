const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const url = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const products = [];

        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            const enlace = $el.find('.product-title a').attr('href');

            // --- EXTRACCIÓN DE REF (Cazador de números) ---
            // Buscamos el texto "Ref" y capturamos los números que le siguen
            const textoTarjeta = $el.text();
            const matchRef = textoTarjeta.match(/Ref\s*(\d+)/i);
            const ref = matchRef ? matchRef[1] : ($el.attr('data-id-product') || "N/A");

            // --- EXTRACCIÓN DE IMAGEN ---
            // Miramos primero data-src (por si hay lazy-load) y luego src
            const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');

            if (nombre && precio) {
                products.push({
                    ref: ref,
                    nombre: nombre,
                    precio: precio,
                    imagen: imagen,
                    enlace: enlace
                });
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