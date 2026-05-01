// Login UI Component - Injectable Modal
import { logIn, signUp, logInWithGoogle, logOut, checkAuthState } from "./auth.js";

const injectLoginModal = () => {
    if (document.getElementById('login-modal')) return;

    const modalHTML = `
    <div id="login-modal" class="auth-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); backdrop-filter:blur(8px); z-index:9999; align-items:center; justify-content:center;">
        <div class="auth-card" style="background:rgba(255,255,255,0.9); padding:2.5rem; border-radius:24px; width:100%; max-width:400px; box-shadow:0 20px 40px rgba(0,0,0,0.2); position:relative; animation: slideIn 0.3s ease-out;">
            <button id="close-auth" style="position:absolute; top:1.5rem; right:1.5rem; background:none; border:none; font-size:1.5rem; cursor:pointer; color:#888;">&times;</button>
            <div style="text-align:center; margin-bottom:2rem;">
                <img src="logo_mychronicle.png" style="height:50px; width:auto; margin-bottom:1rem;">
                <h2 id="auth-title" style="margin:0; color:#333; font-family:'Ubuntu', sans-serif;">Welcome Back</h2>
                <p id="auth-subtitle" style="color:#666; font-size:0.9rem; margin-top:0.5rem;">Sign in to your chronicles</p>
            </div>

            <div class="auth-tabs" style="display:flex; gap:1rem; margin-bottom:1.5rem; border-bottom:1px solid #eee;">
                <button id="tab-signin" class="auth-tab active" style="flex:1; padding:0.8rem; background:none; border:none; border-bottom:2px solid var(--primary); cursor:pointer; font-weight:600; color:var(--primary);">Sign In</button>
                <button id="tab-signup" class="auth-tab" style="flex:1; padding:0.8rem; background:none; border:none; border-bottom:2px solid transparent; cursor:pointer; color:#888;">Sign Up</button>
            </div>

            <form id="auth-form" style="display:flex; flexDirection:column; gap:1rem;">
                <input type="email" id="auth-email" placeholder="Email Address" required style="width:100%; padding:0.8rem 1rem; border-radius:12px; border:1px solid #ddd; outline:none; font-size:1rem; box-sizing:border-box;">
                <input type="password" id="auth-password" placeholder="Password" required style="width:100%; padding:0.8rem 1rem; border-radius:12px; border:1px solid #ddd; outline:none; font-size:1rem; box-sizing:border-box;">
                <button type="submit" id="auth-submit" style="width:100%; padding:1rem; border:none; border-radius:12px; background:var(--primary); color:white; font-weight:600; cursor:pointer; margin-top:0.5rem; font-size:1rem;">Sign In</button>
            </form>

            <div style="text-align:center; margin:1.5rem 0; position:relative;">
                <span style="background:white; padding:0 1rem; color:#aaa; font-size:0.8rem; position:relative; z-index:1;">OR</span>
                <div style="position:absolute; top:50%; left:0; width:100%; height:1px; background:#eee;"></div>
            </div>

            <button id="google-signin" style="width:100%; padding:0.8rem; border:1px solid #ddd; border-radius:12px; background:white; color:#555; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; font-size:0.9rem;">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" style="width:18px;">
                Continue with Google
            </button>
        </div>
    </div>
    <style>
        .auth-tab.active { color: var(--primary) !important; border-bottom-color: var(--primary) !important; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .auth-modal { display: flex !important; }
    </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Event Listeners
    const modal = document.getElementById('login-modal');
    const closeBtn = document.getElementById('close-auth');
    const form = document.getElementById('auth-form');
    const tabSignIn = document.getElementById('tab-signin');
    const tabSignUp = document.getElementById('tab-signup');
    const authTitle = document.getElementById('auth-title');
    const authSubtitle = document.getElementById('auth-subtitle');
    const authSubmit = document.getElementById('auth-submit');
    const googleBtn = document.getElementById('google-signin');

    let mode = 'signin';

    const switchMode = (newMode) => {
        mode = newMode;
        if (mode === 'signin') {
            authTitle.innerText = "Welcome Back";
            authSubtitle.innerText = "Sign in to your chronicles";
            authSubmit.innerText = "Sign In";
            tabSignIn.classList.add('active');
            tabSignUp.classList.remove('active');
            tabSignIn.style.borderBottomColor = 'var(--primary)';
            tabSignUp.style.borderBottomColor = 'transparent';
        } else {
            authTitle.innerText = "Create Account";
            authSubtitle.innerText = "Join the chronicles family";
            authSubmit.innerText = "Create Account";
            tabSignUp.classList.add('active');
            tabSignIn.classList.remove('active');
            tabSignUp.style.borderBottomColor = 'var(--primary)';
            tabSignIn.style.borderBottomColor = 'transparent';
        }
    };

    tabSignIn.onclick = () => switchMode('signin');
    tabSignUp.onclick = () => switchMode('signup');
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    googleBtn.onclick = async () => {
        const { user, error } = await logInWithGoogle();
        if (user) modal.remove();
        else alert(error);
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        
        const { user, error } = mode === 'signin' ? await logIn(email, password) : await signUp(email, password);
        if (user) modal.remove();
        else alert(error);
    };
};

// Handle Header Icons and State
const updateHeaderUI = (user) => {
    const userIcons = document.querySelectorAll('.ph-user-circle, .ph-user');
    userIcons.forEach(icon => {
        const wrapper = icon.parentElement;
        if (user) {
            // Logged In State
            wrapper.innerHTML = `
                <div class="user-profile-menu" style="position:relative; cursor:pointer;">
                    ${user.photoURL ? `<img src="${user.photoURL}" style="width:32px; height:32px; border-radius:50%; border:2px solid var(--primary);">` : `<i class="ph-fill ph-user-circle" style="font-size:1.8rem; color:var(--primary);"></i>`}
                    <div class="user-dropdown" style="display:none; position:absolute; top:calc(100% + 10px); right:0; background:white; padding:10px; border-radius:12px; box-shadow:0 10px 20px rgba(0,0,0,0.1); width:150px; z-index:100;">
                        <p style="margin:0; font-size:0.8rem; color:#888; padding:5px 10px;">${user.email}</p>
                        <hr style="border:0; border-top:1px solid #eee; margin:5px 0;">
                        <button id="logout-btn" style="width:100%; text-align:left; padding:8px 10px; background:none; border:none; cursor:pointer; color:#ff4d4d; font-weight:600;"><i class="ph ph-sign-out"></i> Log Out</button>
                    </div>
                </div>
            `;
            const profileMenu = wrapper.querySelector('.user-profile-menu');
            const dropdown = wrapper.querySelector('.user-dropdown');
            profileMenu.onclick = () => dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            wrapper.querySelector('#logout-btn').onclick = logOut;
        } else {
            // Logged Out State
            wrapper.innerHTML = `<i class="ph ph-user-circle" style="font-size:1.8rem; cursor:pointer;"></i>`;
            wrapper.onclick = injectLoginModal;
        }
    });
};

// Initialize
checkAuthState(updateHeaderUI);

export { injectLoginModal };
