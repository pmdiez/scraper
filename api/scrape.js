const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    const targetUrl = 'https://www.efectoled.com/es/11577-comprar-paneles-led-60x60cm';
    // Usamos un proxy público para saltar el bloqueo de IP de Vercel
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    try {
        const { data } = await axios.get(proxyUrl);
        // allorigins devuelve el HTML dentro de una propiedad llamada 'contents'
        const html = data.contents;
        const $ = cheerio.load(html);
        const products = [];

        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            const enlace = $el.find('.product-title a').attr('href');
            const imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');

            // --- EXTRACCIÓN DE REF (Cazador de números) ---
            // Buscamos cualquier número de 5 o 6 dígitos en el texto de la tarjeta
            const textContent = $el.text();
            const refMatch = textContent.match(/Ref[:\s]*(\d{5,7})/i) || textContent.match(/(\d{5,7})/);
            const ref = refMatch ? refMatch[1] : ($el.attr('data-id-product') || "N/A");

            if (nombre && precio) {
                products.push({ ref, nombre, precio, imagen, enlace });
            }
        });

        res.status(200).json({
            success: true,
            total: products.length,
            data: products,
            proxyUsed: true
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}