import { db, storage } from '../core/firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sanitize } from '../core/router.js';

export async function renderAdmin(container) {
    container.innerHTML = `
        <div class="admin-grid">
            <aside style="background:var(--surface); padding:20px; border-radius:var(--radius); border:1px solid var(--border); display:flex; flex-direction:column; gap:12px; height:fit-content;">
                <h3 style="margin-bottom:12px;">Malu Control Panel</h3>
                <button class="btn btn-primary" id="tab-products" style="text-align:left; background:transparent; color:var(--text); padding:8px 12px;">📦 Gestionar Productos</button>
                <button class="btn btn-primary" id="tab-categories" style="text-align:left; background:transparent; color:var(--text); padding:8px 12px;">📁 Gestionar Categorías</button>
                <button class="btn btn-primary" id="tab-announcements" style="text-align:left; background:transparent; color:var(--text); padding:8px 12px;">📢 Marquesina Global</button>
                <button class="btn btn-primary" id="tab-analytics" style="text-align:left; background:transparent; color:var(--text); padding:8px 12px;">📈 Analíticas de Popularidad</button>
            </aside>
            
            <section id="admin-content" style="background:var(--surface); padding:24px; border-radius:var(--radius); border:1px solid var(--border);">
            </section>
        </div>
    `;

    const contentArea = document.getElementById('admin-content');
    
    document.getElementById('tab-products').onclick = () => showProductManagement(contentArea);
    document.getElementById('tab-categories').onclick = () => showCategoryManagement(contentArea);
    document.getElementById('tab-announcements').onclick = () => showAnnouncementManagement(contentArea);
    document.getElementById('tab-analytics').onclick = () => showAnalyticsManagement(contentArea);

    // Inicialización por defecto en la vista de control de catálogo
    showProductManagement(contentArea);
}

async function showProductManagement(target) {
    target.innerHTML = `
        <h2 id="form-title" style="margin-bottom:20px;">Agregar Nuevo Producto</h2>
        <form id="form-add-product" style="margin-bottom:40px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group" style="grid-column:1/-1;">
                <label>Nombre del Producto *</label>
                <input type="text" id="p-name" class="form-input" required>
            </div>
            <div class="form-group">
                <label>Precio (COP) *</label>
                <input type="number" id="p-price" class="form-input" required>
            </div>
            <div class="form-group">
                <label>Categoría *</label>
                <select id="p-category" class="form-input" style="cursor:pointer;"></select>
            </div>
            <div class="form-group">
                <label>Etiqueta Especial</label>
                <select id="p-tag" class="form-input" style="cursor:pointer;">
                    <option value="">Ninguna</option>
                    <option value="Nuevo">Nuevo</option>
                    <option value="Destacado">Destacado</option>
                    <option value="Descuento">Descuento</option>
                </select>
            </div>
            <div class="form-group">
                <label>Imagen del Producto</label>
                <input type="file" id="p-image" class="form-input" accept="image/*">
            </div>
            <div style="grid-column:1/-1; display:flex; gap:12px;">
                <button type="submit" id="btn-submit-form" class="btn btn-primary" style="flex-grow:1;">Guardar Producto en Producción</button>
                <button type="button" id="btn-cancel-edit" class="btn hidden" style="background:#64748B; color:white; width:auto; padding:0 20px;">Cancelar</button>
            </div>
        </form>

        <h3>Productos Activos</h3>
        <div id="admin-products-list" style="margin-top:16px; display:flex; flex-direction:column; gap:12px;">Cargando inventario...</div>
    `;

    const listContainer = document.getElementById('admin-products-list');
    const form = document.getElementById('form-add-product');
    const categorySelect = document.getElementById('p-category');
    const formTitle = document.getElementById('form-title');
    const btnSubmit = document.getElementById('btn-submit-form');
    const btnCancel = document.getElementById('btn-cancel-edit');

    let localProducts = [];

    const loadCategoriesDropdown = async () => {
        categorySelect.innerHTML = `
            <option value="Tecnología">Tecnología</option>
            <option value="Calzado">Calzado</option>
            <option value="Ropa">Ropa</option>
            <option value="Comida">Comida y Snacks</option>
        `;
        try {
            const catSnap = await getDocs(collection(db, "categories"));
            catSnap.forEach(doc => {
                const name = doc.data().name;
                if (name && !["tecnología", "calzado", "ropa", "comida"].includes(name.toLowerCase())) {
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    categorySelect.appendChild(opt);
                }
            });
        } catch (e) { console.log("Error cargando desplegable de categorías: ", e); }
    };

    const loadInventory = async () => {
        const snap = await getDocs(collection(db, "products"));
        if (snap.empty) { listContainer.innerHTML = '<p>No hay productos en base de datos.</p>'; return; }
        
        localProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        listContainer.innerHTML = localProducts.map(p => {
            const tagBadge = p.tag ? `<span style="font-size:10px; background:var(--primary); color:white; padding:2px 6px; border-radius:4px; margin-left:6px;">${p.tag}</span>` : '';
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--background); border-radius:8px; border:1px solid var(--border);">
                    <div style="flex-grow:1;">
                        <strong>${sanitize(p.name)}</strong> - $${p.price.toLocaleString()} <span style="color:var(--text-muted)">[${sanitize(p.category || 'General')}]</span> ${tagBadge}
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-edit-p" data-id="${p.id}" style="width:auto; padding:6px 12px; background:var(--primary); color:white; border-radius:6px;">Editar</button>
                        <button class="btn btn-danger btn-delete-p" data-id="${p.id}" style="width:auto; padding:6px 12px; background:#EF4444; color:white; border-radius:6px;">Eliminar</button>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.querySelectorAll('.btn-edit-p').forEach(btn => {
            btn.onclick = () => {
                const prod = localProducts.find(p => p.id === btn.dataset.id);
                if (prod) {
                    formTitle.textContent = "Editar Producto";
                    btnSubmit.textContent = "Actualizar Cambios del Producto";
                    form.setAttribute('data-edit-id', prod.id);
                    btnCancel.classList.remove('hidden');

                    document.getElementById('p-name').value = prod.name;
                    document.getElementById('p-price').value = prod.price;
                    document.getElementById('p-category').value = prod.category || 'Tecnología';
                    document.getElementById('p-tag').value = prod.tag || '';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
        });

        listContainer.querySelectorAll('.btn-delete-p').forEach(btn => {
            btn.onclick = async () => {
                if (confirm("¿Seguro que desea eliminar de forma irreversible este producto?")) {
                    await deleteDoc(doc(db, "products", btn.dataset.id));
                    loadInventory();
                }
            };
        });
    };

    btnCancel.onclick = () => {
        form.removeAttribute('data-edit-id');
        form.reset();
        formTitle.textContent = "Agregar Nuevo Producto";
        btnSubmit.textContent = "Guardar Producto en Producción";
        btnCancel.classList.add('hidden');
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const editId = form.getAttribute('data-edit-id');
        const file = document.getElementById('p-image').files[0];
        let imageUrl = "";

        try {
            if (file) {
                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                const uploadResult = await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(uploadResult.ref);
            } else if (editId) {
                const currentProd = localProducts.find(p => p.id === editId);
                imageUrl = currentProd ? currentProd.imageUrl : "";
            }

            const productData = {
                name: document.getElementById('p-name').value,
                price: parseFloat(document.getElementById('p-price').value),
                category: document.getElementById('p-category').value,
                tag: document.getElementById('p-tag').value,
                imageUrl: imageUrl,
                updatedAt: new Date()
            };

            if (editId) {
                await updateDoc(doc(db, "products", editId), productData);
                form.removeAttribute('data-edit-id');
                formTitle.textContent = "Agregar Nuevo Producto";
                btnSubmit.textContent = "Guardar Producto en Producción";
                btnCancel.classList.add('hidden');
                alert("Producto modificado correctamente.");
            } else {
                productData.createdAt = new Date();
                productData.views = 0; // Inicializar vistas en cero para nuevos productos
                await addDoc(collection(db, "products"), productData);
                alert("Producto guardado exitosamente.");
            }

            form.reset();
            loadInventory();
        } catch (error) {
            alert("Error crítico durante la transacción: " + error.message);
        }
    };

    await loadCategoriesDropdown();
    await loadInventory();
}

async function showCategoryManagement(target) {
    target.innerHTML = `
        <h2 style="margin-bottom:20px;">Gestión de Categorías Dinámicas</h2>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:16px;">Las categorías base (Tecnología, Calzado, Ropa, Comida) son por defecto. Aquí puedes añadir nuevas opciones al catálogo.</p>
        
        <div class="form-group" style="display:flex; gap:12px;">
            <input type="text" id="new-cat-name" class="form-input" placeholder="Ej: Deportes, Mascotas, Joyería">
            <button class="btn btn-primary" id="btn-add-category" style="width:auto; white-space:nowrap;">+ Agregar Categoría</button>
        </div>

        <h3 style="margin-top:24px;">Categorías Personalizadas</h3>
        <div id="admin-categories-list" style="margin-top:16px; display:flex; flex-direction:column; gap:12px;">Cargando categorías...</div>
    `;

    const input = document.getElementById('new-cat-name');
    const btn = document.getElementById('btn-add-category');
    const listContainer = document.getElementById('admin-categories-list');

    const loadCategoriesList = async () => {
        const snap = await getDocs(collection(db, "categories"));
        if (snap.empty) { listContainer.innerHTML = '<p style="color:var(--text-muted)">No hay categorías dinámicas adicionales creadas.</p>'; return; }
        
        listContainer.innerHTML = snap.docs.map(doc => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--background); border-radius:8px; border:1px solid var(--border);">
                <span>📁 <strong>${sanitize(doc.data().name)}</strong></span>
                <button class="btn btn-danger btn-delete-cat" data-id="${doc.id}" style="width:auto; padding:4px 10px; background:#EF4444; color:white; border-radius:6px; font-size:13px;">Eliminar</button>
            </div>
        `).join('');

        listContainer.querySelectorAll('.btn-delete-cat').forEach(b => {
            b.onclick = async () => {
                if (confirm("¿Deseas eliminar esta categoría? Los productos existentes bajo esta categoría no se borrarán.")) {
                    await deleteDoc(doc(db, "categories", b.dataset.id));
                    loadCategoriesList();
                }
            };
        });
    };

    btn.onclick = async () => {
        const name = input.value.trim();
        if (!name) return alert("Por favor escribe un nombre para la categoría.");
        
        try {
            await addDoc(collection(db, "categories"), { name: name, createdAt: new Date() });
            input.value = "";
            alert("Categoría creada con éxito y añadida a los selectores.");
            loadCategoriesList();
        } catch (e) { alert("Error al guardar categoría: " + e.message); }
    };

    await loadCategoriesList();
}

async function showAnnouncementManagement(target) {
    target.innerHTML = `
        <h2 style="margin-bottom:20px;">Marquesina de Anuncios</h2>
        <div class="form-group">
            <label>Texto Informativo Destacado</label>
            <input type="text" id="announcement-input" class="form-input" placeholder="Ej: ¡Descuento del 10% en accesorios pagando en efectivo!">
        </div>
        <button class="btn btn-primary" id="btn-save-announcement">Actualizar y Publicar Anuncio</button>
    `;

    const input = document.getElementById('announcement-input');
    const btn = document.getElementById('btn-save-announcement');

    const snap = await getDocs(collection(db, "announcements"));
    let existingDocId = null;
    if (!snap.empty) {
        existingDocId = snap.docs[0].id;
        input.value = snap.docs[0].data().text;
    }

    btn.onclick = async () => {
        const text = input.value.trim();
        if (!text) return alert("Por favor escriba un texto válido.");

        try {
            if (existingDocId) {
                await updateDoc(doc(db, "announcements", existingDocId), { text: text, active: true });
            } else {
                await addDoc(collection(db, "announcements"), { text: text, active: true });
            }
            alert("Marquesina global de anuncios actualizada en tiempo real.");
        } catch (e) {
            alert("Error al actualizar la marquesina: " + e.message);
        }
    };
}

// NUEVA FUNCIÓN: Módulo de Visualización de Analíticas de Popularidad
async function showAnalyticsManagement(target) {
    target.innerHTML = `
        <h2 style="margin-bottom:10px;">Métricas de Popularidad</h2>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:24px;">Organiza los artículos del inventario según la cantidad de visitas recibidas en su ficha técnica.</p>
        
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:left; background:var(--background); border-radius:8px; border:1px solid var(--border); overflow:hidden;">
                <thead>
                    <tr style="background:rgba(168, 85, 247, 0.1); color:var(--text); font-weight:600;">
                        <th style="padding:12px 16px;">Producto</th>
                        <th style="padding:12px 16px;">Categoría</th>
                        <th style="padding:12px 16px;">Precio</th>
                        <th style="padding:12px 16px; text-align:center;">Visitas totales</th>
                    </tr>
                </thead>
                <tbody id="analytics-table-body">
                    <tr>
                        <td colspan="4" style="padding:24px; text-align:center; color:var(--text-muted);">Procesando datos del catálogo...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    const tableBody = document.getElementById('analytics-table-body');

    try {
        const snap = await getDocs(collection(db, "products"));
        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" style="padding:24px; text-align:center; color:var(--text-muted);">No hay productos registrados para auditar.</td></tr>`;
            return;
        }

        // Mapear y ordenar los productos de mayor a menor cantidad de visitas (views)
        const sortedProducts = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.views || 0) - (a.views || 0));

        tableBody.innerHTML = sortedProducts.map(p => `
            <tr style="border-bottom:1px solid var(--border); transition:background 0.2s;" onmouseover="this.style.background='rgba(168, 85, 247, 0.03)'" onmouseout="this.style.background='transparent'">
                <td style="padding:12px 16px; font-weight:500;">${sanitize(p.name)}</td>
                <td style="padding:12px 16px; color:var(--text-muted); font-size:14px;">${sanitize(p.category || 'General')}</td>
                <td style="padding:12px 16px;">$${p.price.toLocaleString()} COP</td>
                <td style="padding:12px 16px; text-align:center; font-weight:700; color:var(--primary); font-size:15px;">🔥 ${p.views || 0}</td>
            </tr>
        `).join('');

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" style="padding:24px; text-align:center; color:red;">Error cargando analíticas: ${error.message}</td></tr>`;
    }
}