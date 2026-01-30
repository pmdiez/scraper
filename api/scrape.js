const axios = require('axios');

export default async function handler(req, res) {
    // URL de la colección + el "truco" .json
    const baseUrl = 'https://greenice.com/collections/tiras-led-770/products.json';
    const allProducts = [];
    
    try {
        // Shopify permite hasta 250 productos por petición con limit=250
        // Vamos a pedir 2 páginas (500 productos en total), que suele ser más que suficiente
        for (let i = 1; i <= 2; i++) {
            const { data } = await axios.get(`${baseUrl}?limit=250&page=${i}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
                }
            });

            if (!data.products || data.products.length === 0) break;

            data.products.forEach(p => {
                // Shopify guarda la información en variantes
                const variant = p.variants[0]; 
                
                allProducts.push({
                    ref: variant.sku || "S/R", // La referencia es el SKU en Shopify
                    nombre: p.title,
                    precio: `${variant.price} €`,
                    imagen: p.images[0]?.src || "",
                    enlace: `https://greenice.com/products/${p.handle}`
                });
            });
        }

        res.status(200).json({
            success: true,
            total: allProducts.length,
            pages: 2, // Con limit=250, barremos casi todo en 1 o 2 páginas
            data: allProducts
        });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
