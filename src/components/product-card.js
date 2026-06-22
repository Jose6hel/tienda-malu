import { sanitize } from '../core/router.js';

export function createProductCard(product) {
    const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23E2E8F0"/></svg>';
    
    // Lógica para renderizar la etiqueta si el producto la tiene asignada
    let tagHtml = '';
    if (product.tag) {
        const tagClass = `tag-${product.tag.toLowerCase()}`; // tag-nuevo, tag-destacado, tag-descuento
        tagHtml = `<span class="product-tag ${tagClass}">${sanitize(product.tag)}</span>`;
    }

    return `
        <div class="card" data-id="${product.id}">
            <!-- Etiqueta flotante (Nuevo, Destacado, Descuento) -->
            ${tagHtml}
            
            <div class="card-img-wrapper">
                <img class="card-img" src="${product.imageUrl || placeholder}" loading="lazy" alt="${sanitize(product.name)}">
            </div>
            <div class="card-body">
                <span style="font-size:0.75rem; text-transform:uppercase; font-weight:600; color:var(--primary);">${sanitize(product.category || 'General')}</span>
                <h3 style="font-size:1rem; font-weight:600; margin:4px 0; line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; height:2.4em;">${sanitize(product.name)}</h3>
                
                <!-- Sistema de Calificación y enlace a comentarios -->
                <div class="rating-container">
                    <span>★ ${product.rating || '5.0'}</span>
                    <span class="comments-link" data-id="${product.id}">• Leer comentarios</span>
                </div>
                
                <p class="product-price">$${product.price.toLocaleString()}</p>
                <button class="btn btn-primary btn-add-cart" data-id="${product.id}" style="margin-top:auto;">Agregar al Carrito</button>
            </div>
        </div>
    `;
}