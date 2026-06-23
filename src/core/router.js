import { store } from './store.js';
import { handleSignInWithLink } from './auth.js';
import { renderNavbar } from '../components/navbar.js';
import { renderHome } from '../views/home.js';
import { renderProductDetail } from '../views/product.js';
import { renderAdmin } from '../views/admin.js';
import { db } from './firebase.js';
import { auth } from './firebase.js'; 
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { initCommentsModule } from '../components/comments.js';

const ADMIN_EMAILS = [
    'jos3davidortizverano2009@gmail.com',
    'mariaveranodevalencia@gmail.com'
];

export function sanitize(string) {
    if (!string) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', "/": '&#x2F;' };
    return string.replace(/[&<>"'/]/g, (s) => map[s]);
}

// Vista ultra-limpia inyectada sin referencias a imágenes editables
function renderProfileDirect(container) {
    if (!container) return;
    const { user } = store.state;

    if (!user) {
        container.innerHTML = `
            <div style="max-width: 500px; margin: 60px auto; padding: 32px; text-align: center; background: var(--surface); border-radius: 8px; color: var(--text);">
                <h2>Acceso Restringido</h2>
                <p>Necesitas iniciar sesión.</p>
            </div>
        `;
        return;
    }

    const avatarUrl = 'https://api.dicebear.com/7.x/bottts/svg?seed=' + (user.email || 'invitado');

    container.innerHTML = `
        <div style="max-width: 600px; margin: 40px auto; padding: 20px;">
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 20px;">
                <img src="${avatarUrl}" alt="Avatar" style="width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--primary);">
                <div>
                    <h2 style="margin: 0;">Tu Cuenta</h2>
                    <p style="color: var(--text-muted); margin: 6px 0;">📧 <b>${sanitize(user.email)}</b></p>
                </div>
                <hr style="width: 100%; border: 0; border-top: 1px solid var(--border);">
                <button id="btn-logout-force" style="background: #EF4444; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%;">
                    🚪 Cerrar Sesión Total
                </button>
            </div>
        </div>
    `;

    // Evento de click forzado
    const logoutBtn = document.getElementById('btn-logout-force');
    if (logoutBtn) {
        logoutBtn.onclick = async (e) => {
            e.preventDefault();
            if (confirm("¿Cerrar sesión?")) {
                try {
                    await auth.signOut();
                    store.setState({ user: null });
                    window.location.href = window.location.origin; // Redirección total recargando el navegador
                } catch (err) {
                    alert("Error: " + err.message);
                }
            }
        };
    }
}

const routes = {
    '/': renderHome,
    '/product': renderProductDetail,
    '/admin': renderAdmin,
    '/profile': renderProfileDirect,
    '/perfil': renderProfileDirect
};

async function router() {
    const params = new URLSearchParams(window.location.search);

    if (params.get('mode') === 'signIn') {
        try {
            await handleSignInWithLink(); 
            window.history.replaceState({}, "", "/");
        } catch (e) {
            console.error(e);
        }
    }

    let path = window.location.pathname;
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    const currentUser = store.state.user;

    if (path.startsWith('/admin')) {
        if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) {
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
                textNode.textContent = snapshot.docs[0].data().text;
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