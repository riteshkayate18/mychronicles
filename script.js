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

    // --- Modals (Cart & Auth) ---
    let currentUser = localStorage.getItem('mychronicle_user') || null;
    const cartIcon = document.querySelector('.cart-icon');
    const accountIcon = document.querySelector('.account-icon');
    const cartModal = document.getElementById('cart-modal');
    const authModal = document.getElementById('auth-modal');
    const profileModal = document.getElementById('profile-modal');
    const closeCart = document.getElementById('close-cart');
    const closeAuth = document.getElementById('close-auth');
    const closeProfile = document.getElementById('close-profile');
    
    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const profileEmail = document.getElementById('profile-email');
    const logoutBtn = document.getElementById('logout-btn');
    const checkoutBtn = document.querySelector('.checkout-btn');

    cartIcon.addEventListener('click', () => cartModal.classList.add('open'));
    closeCart.addEventListener('click', () => cartModal.classList.remove('open'));
    
    accountIcon.addEventListener('click', () => {
        if (currentUser) {
            profileEmail.innerText = currentUser;
            profileModal.classList.add('open');
        } else {
            authModal.classList.add('open');
        }
    });

    closeAuth.addEventListener('click', () => authModal.classList.remove('open'));
    closeProfile.addEventListener('click', () => profileModal.classList.remove('open'));

    // Close modal when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) cartModal.classList.remove('open');
        if (e.target === authModal) authModal.classList.remove('open');
        if (e.target === profileModal) profileModal.classList.remove('open');
    });

    // Auth Submit
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        currentUser = authEmail.value;
        localStorage.setItem('mychronicle_user', currentUser);
        authModal.classList.remove('open');
        authForm.reset();
        alert('Successfully logged in as ' + currentUser);
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('mychronicle_user');
        profileModal.classList.remove('open');
        alert('You have logged out.');
    });

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

            editorAddCart.innerText = 'launching studio...';
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
