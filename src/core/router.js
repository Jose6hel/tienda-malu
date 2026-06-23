import { store } from './store.js';
import { handleSignInWithLink } from './auth.js';
import { renderNavbar } from '../components/navbar.js';
import { renderHome } from '../views/home.js';
import { renderProductDetail } from '../views/product.js';
import { renderAdmin } from '../views/admin.js';
import { db } from './firebase.js';
import { auth } from './firebase.js'; // Importamos auth directamente aquí
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { initCommentsModule } from '../components/comments.js';

// Lista de correos autorizados como Administradores
const ADMIN_EMAILS = [
    'jos3davidortizverano2009@gmail.com',
    'mariaveranodevalencia@gmail.com'
];

// Sanitización de entradas globales contra ataques XSS
export function sanitize(string) {
    if (!string) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', "/": '&#x2F;' };
    return string.replace(/[&<>"'/]/g, (s) => map[s]);
}

// ==========================================================
// VISTA DE PERFIL INYECTADA DIRECTAMENTE PARA EVITAR CACHÉ
// ==========================================================
function renderProfileDirect(container) {
    if (!container) return;
    const { user } = store.state;

    if (!user) {
        container.innerHTML = `
            <div style="max-width: 500px; margin: 60px auto; padding: 32px; text-align: center; background: var(--surface); border-radius: 8px; color: var(--text); box-shadow: var(--shadow);">
                <span style="font-size: 4rem;">🔒</span>
                <h2 style="margin: 16px 0 8px 0; font-weight: 700;">Acceso Restringido</h2>
                <p style="color: var(--text-muted); margin-bottom: 24px;">Para ver tu perfil, necesitas ingresar a tu cuenta.</p>
                <button class="btn btn-primary" id="profile-login-btn" style="width: 100%; padding: 12px;">Ingresar con mi Correo</button>
            </div>
        `;
        document.getElementById('profile-login-btn').onclick = () => {
            const loginBtn = document.getElementById('btn-login-modal') || document.getElementById('btn-login-mobile');
            if (loginBtn) loginBtn.click();
        };
        return;
    }

    const avatarUrl = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + (user.email || 'invitado');

    container.innerHTML = `
        <div style="max-width: 600px; margin: 40px auto; padding: 0 16px;">
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 20px; box-shadow: var(--shadow);">
                <img src="${avatarUrl}" alt="Avatar" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--primary);">
                <div>
                    <h2 style="margin: 0 0 6px 0; font-size: 1.5rem; color: var(--text);">Tu Cuenta</h2>
                    <p style="margin: 0; color: var(--text-muted);">📧 <b>${sanitize(user.email)}</b></p>
                </div>
                <hr style="width: 100%; border: 0; border-top: 1px solid var(--border);">
                <button id="btn-logout-direct" class="btn" style="background: #EF4444; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%;">
                    🚪 Cerrar Sesión
                </button>
            </div>
        </div>
    `;

    // Listener del botón directo
    const logoutBtn = document.getElementById('btn-logout-direct');
    if (logoutBtn) {
        logoutBtn.onclick = async (e) => {
            e.preventDefault();
            if (confirm("¿Estás seguro de que deseas cerrar tu sesión?")) {
                try {
                    await auth.signOut();
                    store.setState({ user: null });
                    window.location.href = "/"; // Forzar recarga total al inicio limpiando todo rastro
                } catch (err) {
                    alert("Error al cerrar sesión: " + err.message);
                }
            }
        };
    }
}
// ==========================================================

const routes = {
    '/': renderHome,
    '/product': renderProductDetail,
    '/admin': renderAdmin,
    '/profile': renderProfileDirect, // Usamos la función interna
    '/perfil': renderProfileDirect
};

async function router() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('mode') === 'signIn') {
        try {
            await handleSignInWithLink(); 
            window.history.replaceState({}, "", "/");
        } catch (e) {
            alert("Error en validación de enlace de acceso: " + e.message);
        }
    }

    let path = window.location.pathname;
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    const currentUser = store.state.user;

    if (path.startsWith('/admin')) {
        if (!currentUser) {
            window.history.pushState({}, "", "/");
            router();
            return;
        }
        if (!ADMIN_EMAILS.includes(currentUser.email)) {
            alert("Acceso denegado: No tienes permisos de administrador.");
            window.history.pushState({}, "", "/");
            router();
            return;
        }
    }

    renderNavbar();
    
    const viewFunction = routes[path] || routes['/'];
    
    const root = document.getElementById('app-root');
    if (root) {
        root.innerHTML = ''; 
        await viewFunction(root, currentUser?.email);
    }
}

function initAnnouncements() {
    const q = query(collection(db, "announcements"), where("active", "==", true));
    onSnapshot(q, (snapshot) => {
        const bar = document.getElementById('announcement-bar');
        const textNode = document.getElementById('announcement-text');
        if (bar && textNode) {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                textNode.textContent = data.text;
                bar.classList.remove('hidden');
            } else {
                bar.classList.add('hidden');
            }
        }
    });
}

window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', e => {
        const targetLink = e.target.closest('[data-link]');
        if (targetLink) {
            e.preventDefault();
            window.history.pushState({}, "", targetLink.getAttribute('href'));
            router();
        }
    });
    
    initAnnouncements();
    initCommentsModule();
    router();
});

store.subscribe(() => {
    renderNavbar();
    router();
});