import { db } from '../core/firebase.js';
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { sanitize } from '../core/router.js';
import { store } from '../core/store.js';
import { openCommentsModal } from '../components/comments.js';

export async function renderProductDetail(container) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <p style="color:var(--text-muted);">No se especificó ningún producto. <a href="/" data-link style="color:var(--primary); font-weight:600;">Volver al inicio</a></p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div id="detail-loading" style="padding: 60px; text-align: center;">
            <p style="color:var(--text-muted);">Cargando especificaciones del producto...</p>
        </div>
        <div id="detail-content" class="hidden" style="padding: 24px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; animation: fadeIn 0.3s ease;">
        </div>
    `;

    const loadingEl = document.getElementById('detail-loading');
    const contentEl = document.getElementById('detail-content');

    try {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            loadingEl.innerHTML = `<p style="color:var(--text-muted);">El producto solicitado no existe en nuestro inventario.</p>`;
            return;
        }

        const product = { id: productSnap.id, ...productSnap.data() };

        // 1. REGISTRO DE ANALÍTICAS: Incrementa de manera silenciosa las visitas (+1) en Firestore
        await updateDoc(productRef, {
            views: increment(1)
        }).catch(err => console.log("Error al registrar analítica de visita:", err));

        // 2. Renderizado del producto adaptado a la estética lavanda/morada
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');

        const tagBadge = product.tag ? `<span style="position: absolute; top: 12px; left: 12px; background: var(--primary); color: white; padding: 4px 10px; border-radius: var(--radius); font-size: 12px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${product.tag}</span>` : '';

        contentEl.innerHTML = `
            <div style="position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 350px;">
                ${tagBadge}
                <img src="${product.imageUrl || '/src/assets/placeholder.svg'}" alt="${sanitize(product.name)}" style="max-width: 100%; max-height: 380px; object-fit: contain; border-radius: 8px;">
            </div>
            
            <div style="display: flex; flex-direction: column; justify-content: center; gap: 16px;">
                <div>
                    <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary);">${sanitize(product.category || 'General')}</span>
                    <h1 style="font-size: 2rem; font-weight: 700; margin-top: 4px; color: var(--text);">${sanitize(product.name)}</h1>
                </div>

                <div style="font-size: 1.8rem; font-weight: 700; color: var(--text);">$${product.price.toLocaleString()} COP</div>

                <p style="color: var(--text-muted); line-height: 1.6; font-size: 1rem;">
                    ${sanitize(product.description || 'Este excelente producto está disponible en nuestro catálogo con entrega inmediata y total garantía de autenticidad.')}
                </p>

                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                    <button id="btn-add-detail" class="btn btn-primary" style="padding: 14px; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        🛒 Añadir al Carrito de Compras
                    </button>
                    
                    <button id="btn-comments-detail" class="btn" style="background: transparent; color: var(--primary); border: 1px solid var(--primary); padding: 10px; font-size: 0.95rem;">
                        ⭐ Consultar Opiniones y Calificaciones
                    </button>
                </div>
                
                <a href="/" data-link style="margin-top: 12px; display: inline-block; font-size: 14px; color: var(--text-muted); text-decoration: none; width: fit-content; transition: color 0.2s;" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--text-muted)'">← Volver a la vitrina principal</a>
            </div>
        `;

        // Evento para añadir al carrito
        document.getElementById('btn-add-detail').onclick = () => {
            store.addToCart(product);
        };

        // Evento para abrir el sistema de comentarios
        document.getElementById('btn-comments-detail').onclick = () => {
            openCommentsModal(product.id, product.name);
        };

    } catch (error) {
        loadingEl.innerHTML = `<p style="color:red;">Error crítico al procesar la ficha técnica: ${error.message}</p>`;
    }
}