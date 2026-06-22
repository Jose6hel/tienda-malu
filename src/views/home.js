import { db } from '../core/firebase.js';
import { collection, getDocs } from "firebase/firestore";
import { createProductCard } from '../components/product-card.js';
import { store } from '../core/store.js';
// Ajuste de importación para la modal de comentarios
import { openCommentsModal } from '../components/comments.js';

export async function renderHome(container) {
    container.innerHTML = `
        <section style="margin-bottom: 32px; text-align: center; padding: 40px 16px; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); background: linear-gradient(135deg, var(--surface) 0%, rgba(168, 85, 247, 0.05) 100%);">
            <h1 style="font-size: 2.2rem; font-weight: 700; margin-bottom: 8px; color: var(--text);">¡Tu Mundo en un Solo Lugar!</h1>
            <p style="color: var(--text-muted); font-size: 1rem;">Explore tecnología avanzada, calzado premium, ropa de moda y comida deliciosa.</p>
        </section>

        <section style="margin-bottom:24px; display:flex; gap:16px; flex-wrap:wrap;">
            <input type="text" id="search-input" class="form-input" style="flex-grow:1; max-width:400px;" placeholder="¿Qué estás buscando?">
            <select id="category-filter" class="form-input" style="max-width:200px; cursor: pointer;">
                <option value="all">Todas las Categorías</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Calzado">Calzado</option>
                <option value="Ropa">Ropa</option>
                <option value="Comida">Comida y Snacks</option>
            </select>
        </section>

        <div id="products-loading" class="grid">
            ${'<div class="skeleton" style="height:280px;"></div>'.repeat(4)}
        </div>
        <div id="products-grid" class="grid hidden"></div>
    `;

    const loadingGrid = document.getElementById('products-loading');
    const productsGrid = document.getElementById('products-grid');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');

    try {
        // Carga dinámica de categorías adicionales del administrador
        try {
            const catSnapshot = await getDocs(collection(db, "categories"));
            catSnapshot.forEach(doc => {
                const catData = doc.data();
                if (catData.name && !["tecnología", "calzado", "ropa", "comida"].includes(catData.name.toLowerCase())) {
                    const option = document.createElement('option');
                    option.value = catData.name;
                    option.textContent = catData.name;
                    categoryFilter.appendChild(option);
                }
            });
        } catch (e) {
            console.log("Colección de categorías personalizadas vacía o en desarrollo. Usando fijas.");
        }

        // Carga de productos
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        querySnapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        loadingGrid.classList.add('hidden');
        productsGrid.classList.remove('hidden');

        const displayProducts = (list) => {
            if (list.length === 0) {
                productsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">No se encontraron productos.</p>`;
                return;
            }
            productsGrid.innerHTML = list.map(p => createProductCard(p)).join('');
            
            // Asignación de clics a los botones de compra del listado dinámico
            productsGrid.querySelectorAll('.btn-add-cart').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const prod = list.find(item => item.id === btn.dataset.id);
                    if (prod) store.addToCart(prod);
                };
            });

            // AJUSTE REALIZADO: Apertura interactiva de la modal de comentarios reales
            productsGrid.querySelectorAll('.comments-link').forEach(link => {
                link.onclick = (e) => {
                    e.stopPropagation();
                    const productId = link.dataset.id;
                    const prod = list.find(item => item.id === productId);
                    if (prod) {
                        openCommentsModal(productId, prod.name);
                    }
                };
            });
        };

        displayProducts(products);

        // Motor de búsqueda reactivo en tiempo real adaptado a las nuevas categorías
        const filterProducts = () => {
            const queryText = searchInput.value.toLowerCase();
            const selectedCat = categoryFilter.value;

            const filtered = products.filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(queryText) || p.description?.toLowerCase().includes(queryText);
                const matchesCategory = selectedCat === 'all' || p.category?.toLowerCase() === selectedCat.toLowerCase();
                return matchesSearch && matchesCategory;
            });
            displayProducts(filtered);
        };

        searchInput.oninput = filterProducts;
        categoryFilter.onchange = filterProducts;

    } catch (error) {
        loadingGrid.innerHTML = `<p style="color:red;">Error al cargar el catálogo de productos: ${error.message}</p>`;
    }
}