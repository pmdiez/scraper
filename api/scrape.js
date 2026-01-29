const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
    // Usamos la URL de búsqueda, suele saltar mejor los bloqueos de categoría
    const targetUrl = 'https://www.efectoled.com/es/buscar?s=60x60';
    // Usamos el proxy de Codetabs (más rápido y estable para Vercel)
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`;

    try {
        const { data } = await axios.get(proxyUrl, { timeout: 20000 });
        
        // Codetabs devuelve el HTML directamente (no en una propiedad .contents)
        const $ = cheerio.load(data);
        const products = [];

        $('.product-miniature').each((i, el) => {
            const $el = $(el);
            
            const nombre = $el.find('.product-title').text().trim();
            const precio = $el.find('.price').last().text().trim() || $el.find('.current-price').text().trim();
            const enlace = $el.find('.product-title a').attr('href');
            
            // IMAGEN: Buscamos el src o data-src
            let imagen = $el.find('img').attr('data-src') || $el.find('img').attr('src');

            // --- EXTRACCIÓN DE REF (El número de 6 dígitos) ---
            // Buscamos cualquier número de entre 5 y 7 dígitos en el texto de la ficha
            const textoCompleto = $el.text();
            const match = textoCompleto.match(/Ref\s*(\d{5,7})/i) || textoCompleto.match(/(\d{5,7})/);
            const ref = match ? match[1] : ($el.attr('data-id-product') || "N/A");

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
        res.status(500).json({ 
            success: false, 
            message: "El proxy no respondió a tiempo",
            error: error.message 
        });
    }
}