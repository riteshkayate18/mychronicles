document.addEventListener('DOMContentLoaded', () => {

    // --- Sticky Navbar ---
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- Active Link Highlight ---
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links li a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (current && link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });

    // --- Advanced FAQ Accordion ---
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');
            
            // Close all items
            document.querySelectorAll('.accordion-item').forEach(acc => {
                acc.classList.remove('active');
                acc.querySelector('.accordion-content').style.maxHeight = null;
            });

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
                const content = item.querySelector('.accordion-content');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });

    // --- Firebase Auth Logic ---
    let currentUser = null;
    const accountIcons = document.querySelectorAll('.account-icon');
    const authModal = document.getElementById('auth-modal');
    const profileModal = document.getElementById('profile-modal');
    const closeAuth = document.getElementById('close-auth');
    const closeProfile = document.getElementById('close-profile');
    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const authTitle = document.getElementById('auth-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const googleAuthBtn = document.getElementById('google-auth-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const toggleAuthLink = document.getElementById('toggle-auth');
    const adminDashBtn = document.getElementById('admin-dash-btn');
    const profileEmailText = document.getElementById('profile-email');

    let isSignUpMode = false;

    // Helper to sync UI mode
    const syncAuthUI = () => {
        if (!authTitle || !authSubmitBtn || !toggleAuthLink) return;
        authTitle.innerText = isSignUpMode ? 'Create Account' : 'Welcome Back';
        authSubmitBtn.innerText = isSignUpMode ? 'Sign Up' : 'Sign In';
        toggleAuthLink.innerText = isSignUpMode ? 'Already have an account? Sign In' : "Don't have an account? Register";
    };

    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            if (profileEmailText) profileEmailText.innerText = user.email;
            accountIcons.forEach(icon => {
                icon.innerHTML = `<div style="width:32px; height:32px; background:var(--primary); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:0.8rem;">${user.email[0].toUpperCase()}</div>`;
            });
            
            if (adminDashBtn) {
                if (user.email && user.email.toLowerCase() === 'riteshkayate18@gmail.com') {
                    adminDashBtn.style.display = 'block';
                } else {
                    adminDashBtn.style.display = 'none';
                }
            }
        } else {
            accountIcons.forEach(icon => {
                icon.innerHTML = '<i class="ph ph-user"></i>';
            });
            if (adminDashBtn) adminDashBtn.style.display = 'none';
        }
    });

    // Auto-open login if requested
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true' && !currentUser) {
        setTimeout(() => {
            if (authModal) authModal.classList.add('open');
        }, 1000);
    }

    // Toggle between Sign In and Register
    if (toggleAuthLink) {
        toggleAuthLink.addEventListener('click', (e) => {
            e.preventDefault();
            isSignUpMode = !isSignUpMode;
            syncAuthUI();
        });
    }

    accountIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            if (currentUser) {
                if (profileModal) profileModal.classList.add('open');
            } else {
                if (authModal) {
                    isSignUpMode = false; // Reset to Sign In when opening
                    syncAuthUI();
                    authModal.classList.add('open');
                }
            }
        });
    });

    if (closeAuth) closeAuth.addEventListener('click', () => authModal.classList.remove('open'));
    if (closeProfile) closeProfile.addEventListener('click', () => profileModal.classList.remove('open'));

    // Auth Submit (Login / Signup)
    if (authForm) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = authEmail.value;
            const passwordInput = document.getElementById('auth-password');
            if (!passwordInput) return;
            const password = passwordInput.value;

            const authAction = isSignUpMode 
                ? auth.createUserWithEmailAndPassword(email, password)
                : auth.signInWithEmailAndPassword(email, password);

            authAction
                .then(() => {
                    authModal.classList.remove('open');
                    authForm.reset();
                    // alert(isSignUpMode ? 'Account created successfully!' : 'Welcome back!');
                })
                .catch((error) => alert('Auth Error: ' + error.message));
        });
    }

    // Google Auth
    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(() => {
                    authModal.classList.remove('open');
                    alert('Signed in with Google successfully!');
                })
                .catch((error) => alert('Google Auth Error: ' + error.message));
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                profileModal.classList.remove('open');
                alert('You have logged out.');
            });
        });
    }

    // --- Modals (Cart & FAQ) ---
    const cartIcon = document.querySelector('.cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeCart = document.getElementById('close-cart');
    const checkoutBtn = document.querySelector('.checkout-btn');

    if (cartIcon) cartIcon.addEventListener('click', () => cartModal.classList.add('open'));
    if (closeCart) closeCart.addEventListener('click', () => cartModal.classList.remove('open'));

    // --- Dynamic Cart Functionality ---
    let cart = JSON.parse(localStorage.getItem('mychronicle_cart')) || [];
    const addToCartBtns = document.querySelectorAll('.add-to-cart-btn');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartBadge = document.getElementById('cart-badge');
    const cartTotalPrice = document.getElementById('cart-total-price');

    addToCartBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            const id = e.target.getAttribute('data-id');
            const title = card.querySelector('h3').innerText;
            const priceStr = card.querySelector('.price').innerText;
            const price = parseFloat(priceStr.replace('₹', '').replace(/,/g, ''));

            // Check if exists
            const existingItem = cart.find(item => item.id === id);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ id, title, price, quantity: 1 });
            }

            updateCartUI();
            
            // Visual feedback
            btn.innerText = 'Added!';
            btn.style.background = 'var(--primary)';
            btn.style.color = '#fff';
            setTimeout(() => {
                btn.innerText = 'Add to Cart';
                btn.style.background = 'transparent';
                btn.style.color = 'var(--primary)';
            }, 1000);
            
            // Open cart after short delay
            setTimeout(() => {
                cartModal.classList.add('open');
            }, 300);
        });
    });

    function updateCartUI() {
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is currently empty.</p>';
            cartBadge.innerText = '0';
            cartTotalPrice.innerText = '₹0.00';
            return;
        }

        cartItemsContainer.innerHTML = '';
        let total = 0;
        let count = 0;

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            count += item.quantity;

            const div = document.createElement('div');
            div.classList.add('cart-item');
            div.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.title}</h4>
                    <p>₹${item.price.toFixed(2)} x ${item.quantity}</p>
                    <button class="remove-item" data-id="${item.id}">Remove</button>
                </div>
                <div class="cart-item-total">
                    <p><b>₹${itemTotal.toFixed(2)}</b></p>
                </div>
            `;
            cartItemsContainer.appendChild(div);
        });

        cartBadge.innerText = count;
        cartTotalPrice.innerText = '₹' + total.toFixed(2);
        localStorage.setItem('mychronicle_cart', JSON.stringify(cart));

        // Bind remove buttons
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const removeId = e.target.getAttribute('data-id');
                const idx = cart.findIndex(item => item.id === removeId);
                if (idx > -1) {
                    cart[idx].quantity -= 1;
                    if(cart[idx].quantity <= 0) {
                        cart.splice(idx, 1);
                    }
                }
                updateCartUI();
            });
        });
    }
    
    // Checkout Event
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                alert('Your cart is empty!');
                return;
            }
            
            if (!currentUser) {
                alert('Please sign in to checkout.');
                cartModal.classList.remove('open');
                authModal.classList.add('open');
            } else {
                alert('Checkout successful! Thank you for your purchase.');
                cart = [];
                updateCartUI();
                cartModal.classList.remove('open');
            }
        });
    }

    // --- Editor Page Interactions ---
    const editorAddCart = document.getElementById('editor-add-cart');
    if (editorAddCart) {
        editorAddCart.addEventListener('click', () => {
            // Get the text from the active page card
            const activePageCard = document.querySelector('.thick-card.active');
            let pageCount = 24;
            if (activePageCard) {
                const text = activePageCard.querySelector('span').innerText;
                pageCount = parseInt(text) || 24;
                localStorage.setItem('mychronicle_book_pages', pageCount.toString());
            }
            
            const activeOrientCard = document.querySelector('.orientation-card.active');
            if (!activeOrientCard) {
                alert('Please select a book orientation (Square, Landscape, or Portrait) to continue.');
                const orientGrid = document.querySelector('.orientation-grid');
                if (orientGrid) {
                    orientGrid.style.outline = '2px solid var(--primary)';
                    orientGrid.style.borderRadius = '8px';
                    orientGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => orientGrid.style.outline = 'none', 2000);
                }
                return;
            }

            localStorage.setItem('mychronicle_book_orientation', activeOrientCard.querySelector('.orient-name').innerText);
            localStorage.setItem('mychronicle_book_size', activeOrientCard.querySelector('.orient-size').innerText);

            editorAddCart.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Preparing your studio...';
            editorAddCart.style.opacity = '0.8';
            editorAddCart.style.pointerEvents = 'none';
            setTimeout(() => {
                window.location.href = `studio.html?pages=${pageCount}`;
            }, 600);
        });

        // Thumbnail interactions
        const mainImg = document.getElementById('editor-main-img');
        const thumbs = document.querySelectorAll('.thumb');
        thumbs.forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbs.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                mainImg.src = thumb.src;
            });
        });



        // Orientation Card selection
        const orientationCards = document.querySelectorAll('.orientation-card');
        orientationCards.forEach(card => {
            card.addEventListener('click', () => {
                orientationCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                const name = card.querySelector('.orient-name').innerText;
                const size = card.querySelector('.orient-size').innerText;
                localStorage.setItem('mychronicle_book_orientation', name);
                localStorage.setItem('mychronicle_book_size', size);
            });
        });

        // Page selection (Thickness)
        const thickCards = document.querySelectorAll('.thick-card');
        thickCards.forEach(card => {
            card.addEventListener('click', () => {
                thickCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                
                // Extract number from the text (e.g. "50 pages" -> 50)
                const text = card.querySelector('span').innerText;
                const pages = parseInt(text) || 24;
                localStorage.setItem('mychronicle_book_pages', pages.toString());
            });
        });
    }

    // Initial UI state & Defaults sync
    const syncDefaults = () => {
        // Clear old orientation to force a new selection
        localStorage.removeItem('mychronicle_book_orientation');
        localStorage.removeItem('mychronicle_book_size');

        const activePageCard = document.querySelector('.thick-card.active');
        if (activePageCard) {
            const text = activePageCard.querySelector('span').innerText;
            localStorage.setItem('mychronicle_book_pages', (parseInt(text) || 24).toString());
        }
    };
    syncDefaults();

    updateCartUI();
});
