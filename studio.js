document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('upload-btn');
    const fileArea = document.getElementById('drag-area');
    const stepUpload = document.getElementById('step-upload');
    const stepMagic = document.getElementById('step-magic');
    const stepEditor = document.getElementById('step-editor');
    const spreadContainer = document.getElementById('spread-container');
    const leftSidebar = document.getElementById('uploaded-photos-sidebar');
    const cartOrderBtn = document.getElementById('cart-order-btn');

    let uploadedPhotos = [];
    const urlParams = new URLSearchParams(window.location.search);
    let totalPages = parseInt(urlParams.get('pages')) || parseInt(localStorage.getItem('mychronicle_book_pages')) || 24;
    let currentActiveSpread = null;
    let currentActiveIndex = 0;

    // --- Dynamic Book Configuration ---
    const BOOK_CONFIGS = {
        'Square': {
            pageWidth: 210,
            pageHeight: 210,
            spreadWidth: 420,
            spreadHeight: 210,
            ratio: 2 / 1
        },
        'Landscape': {
            pageWidth: 297,
            pageHeight: 210,
            spreadWidth: 594,
            spreadHeight: 210,
            ratio: 594 / 210
        },
        'Portrait': {
            pageWidth: 210,
            pageHeight: 297,
            spreadWidth: 420,
            spreadHeight: 297,
            ratio: 420 / 297
        }
    };

    const selectedOrient = localStorage.getItem('mychronicle_book_orientation') || 'Portrait';
    const config = BOOK_CONFIGS[selectedOrient] || BOOK_CONFIGS['Portrait'];
    
    // Inject the aspect ratio into CSS
    document.documentElement.style.setProperty('--spread-ratio', config.ratio);
    
    const PAGE_WIDTH_MM = config.pageWidth;
    const PAGE_HEIGHT_MM = config.pageHeight;
    const SPREAD_WIDTH_MM = config.spreadWidth;
    const SPREAD_HEIGHT_MM = config.spreadHeight;

    // --- Undo/Redo History System (Moved to Top) ---
    const HistoryManager = {
        past: [],
        present: null,
        future: [],

        init() {
            this.present = this.captureState();
            this.updateButtons();
            this.attachKeyboardShortcuts();
            this.attachButtonListeners();
        },

        captureState() {
            const container = document.getElementById('spread-container');
            if (!container) return null;
            const allSpreads = Array.from(document.querySelectorAll('#spread-container .spread-wrap'));
            return { html: container.innerHTML, activeIndex: currentActiveIndex };
        },

        saveState() {
            const newState = this.captureState();
            if (!newState || (this.present && newState.html === this.present.html && newState.activeIndex === this.present.activeIndex)) return;
            this.past.push(this.present);
            this.present = newState;
            this.future = []; 
            this.updateButtons();
        },

        undo() {
            if (this.past.length === 0) return;
            this.future.push(this.present);
            this.present = this.past.pop();
            this.applyState(this.present);
            this.updateButtons();
        },

        redo() {
            if (this.future.length === 0) return;
            this.past.push(this.present);
            this.present = this.future.pop();
            this.applyState(this.present);
            this.updateButtons();
        },

        applyState(state) {
            const container = document.getElementById('spread-container');
            if (!container || !state) return;
            container.innerHTML = state.html;

            // RE-ATTACH LISTENERS to all restored spreads
            const allSpreads = Array.from(container.querySelectorAll('.spread-wrap'));
            allSpreads.forEach(spread => {
                if (typeof attachSpreadEvents === 'function') {
                    attachSpreadEvents(spread);
                }
            });
            
            // Restore active spread in the editor
            const targetSpread = allSpreads[state.activeIndex] || allSpreads[0];
            if (targetSpread && typeof openCanvaEditor === 'function') {
                openCanvaEditor(targetSpread);
            }

            // Sync timeline scroll after state application
            if (typeof syncTimelineScroll === 'function') {
                syncTimelineScroll();
            }
        },

        updateButtons() {
            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');
            if (undoBtn) undoBtn.disabled = this.past.length === 0;
            if (redoBtn) redoBtn.disabled = this.future.length === 0;
        },

        attachKeyboardShortcuts() {
            window.addEventListener('keydown', (e) => {
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const cmd = isMac ? e.metaKey : e.ctrlKey;
                
                if (cmd && e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) this.redo();
                    else this.undo();
                } else if (cmd && e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    this.redo();
                } else if (cmd && e.key.toLowerCase() === 'x') {
                    e.preventDefault();
                    const btn = document.getElementById('menu-cut');
                    if (btn) btn.click();
                } else if (cmd && e.key.toLowerCase() === 'c') {
                    e.preventDefault();
                    const btn = document.getElementById('menu-copy');
                    if (btn) btn.click();
                } else if (cmd && e.key.toLowerCase() === 'v') {
                    e.preventDefault();
                    const btn = document.getElementById('menu-paste');
                    if (btn) btn.click();
                } else if (cmd && e.key.toLowerCase() === 'd') {
                    e.preventDefault();
                    const btn = document.getElementById('menu-duplicate');
                    if (btn) btn.click();
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                        const btn = document.getElementById('menu-delete');
                        if (btn) {
                            e.preventDefault();
                            btn.click();
                        }
                    }
                } else if (e.key.startsWith('Arrow')) {
                    if (contextTargetItem && contextTargetItem.classList.contains('active') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        const parentRect = contextTargetItem.parentElement.getBoundingClientRect();
                        const stepX = (1 / parentRect.width) * 100;
                        const stepY = (1 / parentRect.height) * 100;
                        
                        let currentLeft = parseFloat(contextTargetItem.style.left) || 0;
                        let currentTop = parseFloat(contextTargetItem.style.top) || 0;

                        if (e.key === 'ArrowLeft') currentLeft -= stepX;
                        if (e.key === 'ArrowRight') currentLeft += stepX;
                        if (e.key === 'ArrowUp') currentTop -= stepY;
                        if (e.key === 'ArrowDown') currentTop += stepY;

                        contextTargetItem.style.left = `${currentLeft}%`;
                        contextTargetItem.style.top = `${currentTop}%`;
                        syncToOriginal();
                        syncToThumbnail(contextTargetItem);
                    } else if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                        // Navigation Mode: Flip pages if no image is selected
                        if (e.key === 'ArrowLeft') {
                            const btn = document.getElementById('timeline-prev');
                            if (btn) btn.click();
                        } else if (e.key === 'ArrowRight') {
                            const btn = document.getElementById('timeline-next');
                            if (btn) btn.click();
                        }
                        // Sync timeline after arrow navigation
                        setTimeout(syncTimelineScroll, 50);
                    }
                }
            });

            // Save history only on KeyUp to avoid bloating the stack with 1px steps
            window.addEventListener('keyup', (e) => {
                if (e.key.startsWith('Arrow') && contextTargetItem) {
                    saveHistory();
                }
            });
        },

        attachButtonListeners() {
            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');
            if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
            if (redoBtn) redoBtn.addEventListener('click', () => this.redo());
        }
    };

    // --- Sidebar Selection Logic ---
    const canvaSidebar = document.querySelector('.canva-sidebar');
    if (canvaSidebar) {
        const tools = canvaSidebar.querySelectorAll('.canva-tool');
        tools.forEach(tool => {
            tool.addEventListener('click', () => {
                // Remove active from all neighbors
                tools.forEach(t => t.classList.remove('is-active'));
                // Add active to this one
                tool.classList.add('is-active');
                // Inform parent sidebar that we have an active item
                canvaSidebar.classList.add('has-active-item');
                
                // --- FUTURE EXTENSION POINT ---
                // Here you would trigger the opening of specific panels 
                // (e.g., Template Grid, Elements Panel, etc.)
            });
        });
    }

    function saveHistory() {
        HistoryManager.saveState();
    }

    const fileInput = document.getElementById('file-input');

    // Handle File Selection from Input
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                processFiles(e.target.files);
            }
        });
    }

    // Handle Drag & Drop
    fileArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileArea.style.backgroundColor = '#e0e0e0';
        fileArea.style.borderColor = '#333';
    });

    fileArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        fileArea.style.backgroundColor = '#cfcfcf';
        fileArea.style.borderColor = '#999';
    });

    fileArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileArea.style.backgroundColor = '#cfcfcf';
        fileArea.style.borderColor = '#999';
        if (e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    });

    // Delegate click on drag area to the hidden file input
    fileArea.addEventListener('click', () => {
        if (fileInput) fileInput.click();
    });

    const stepReview = document.getElementById('step-review');
    const reviewGrid = document.getElementById('review-grid');
    const reviewPhotoCount = document.getElementById('review-photo-count');
    const doMagicBtn = document.getElementById('do-magic-btn');
    const fileInputReview = document.getElementById('file-input-review');
    const reviewDragArea = document.getElementById('review-drag-area');
    const studioAddMoreBtn = document.getElementById('studio-add-more-btn');
    const studioAddPhotosInput = document.getElementById('studio-add-photos-input');

    function processFiles(files) {
        // Use only actual user uploaded files
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('image/')) {
                uploadedPhotos.push(URL.createObjectURL(files[i]));
            }
        }
        showReview();
    }

    function showReview() {
        stepUpload.style.display = 'none';
        stepReview.style.display = 'grid';
        renderReviewGrid();
    }

    function renderReviewGrid() {
        reviewGrid.innerHTML = '';
        reviewPhotoCount.innerText = uploadedPhotos.length;

        uploadedPhotos.forEach((src, index) => {
            const item = document.createElement('div');
            item.className = 'review-photo-item';
            
            const img = document.createElement('img');
            img.src = src;
            
            const delBtn = document.createElement('button');
            delBtn.className = 'review-delete-btn';
            delBtn.innerHTML = '<i class="ph ph-trash"></i>';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                uploadedPhotos.splice(index, 1);
                renderReviewGrid();
            };

            item.appendChild(img);
            item.appendChild(delBtn);
            reviewGrid.appendChild(item);
        });
    }

    // Review Actions
    doMagicBtn.addEventListener('click', () => {
        stepReview.style.display = 'none';
        startMagic();
    });



    // Add more photos in review step
    if (fileInputReview) {
        fileInputReview.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                // Get actual user uploaded files
                for (let i = 0; i < e.target.files.length; i++) {
                    if (e.target.files[i].type.startsWith('image/')) {
                        uploadedPhotos.push(URL.createObjectURL(e.target.files[i]));
                    }
                }
                renderReviewGrid();
            }
        });
    }

    reviewDragArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        reviewDragArea.style.backgroundColor = '#e6f6f1';
    });
    reviewDragArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        reviewDragArea.style.backgroundColor = '#fcfcfc';
    });
    reviewDragArea.addEventListener('drop', (e) => {
        e.preventDefault();
        reviewDragArea.style.backgroundColor = '#fcfcfc';
        if (e.dataTransfer.files.length > 0) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                if (e.dataTransfer.files[i].type.startsWith('image/')) {
                    uploadedPhotos.push(URL.createObjectURL(e.dataTransfer.files[i]));
                }
            }
            renderReviewGrid();
        }
    });

    // studio-add-more-btn listener
    if (studioAddMoreBtn && studioAddPhotosInput) {
        studioAddMoreBtn.addEventListener('click', () => {
            studioAddPhotosInput.click();
        });

        studioAddPhotosInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                // Add new photos to the existing pool
                for (let i = 0; i < files.length; i++) {
                    if (files[i].type.startsWith('image/')) {
                        uploadedPhotos.push(URL.createObjectURL(files[i]));
                    }
                }
                // Go back to magic step to re-arrange
                stepEditor.style.display = 'none';
                startMagic();
            }
        });
    }

    function startMagic() {
        stepUpload.style.display = 'none';
        stepReview.style.display = 'none';
        stepMagic.style.display = 'flex';
        
        let step1 = document.getElementById('magic-check-1');
        let step2 = document.getElementById('magic-check-2');
        let step3 = document.getElementById('magic-check-3');

        // Timing animation of checklist matching the loading wheel
        setTimeout(() => step1.classList.add('checked'), 1200);
        setTimeout(() => step2.classList.add('checked'), 2400);
        setTimeout(() => step3.classList.add('checked'), 3500);

        setTimeout(() => {
            stepMagic.style.display = 'none';
            stepEditor.style.display = 'grid'; // Shift to Grid Editor mode
            autoArrangePhotos(uploadedPhotos, totalPages);
        }, 4200);
    }



    // Grid layout auto-arranger (Double-page spreads)
    function autoArrangePhotos(photos, pages) {
        spreadContainer.innerHTML = '';
        
        let photoQueue = [...photos];
        // If we run out of photos, just return null so it renders a blank white page
        const getPhoto = () => photoQueue.length > 0 ? photoQueue.shift() : null;

        // 1. Cover Spread
        let backCover = getPhoto();
        let frontCover = getPhoto();
        renderSpread('Cover', backCover, frontCover, false, false, false, true);

        // 2. Page 1 Spread
        let page1 = getPhoto();
        renderSpread('Page 1', null, page1, true, false, false, true);

        // 3. Middle Pages Loop
        for(let i=2; i<=pages-1; i+=2) {
            let leftPage = getPhoto();
            let rightPage = getPhoto();
            renderSpread(`Page ${i}-${i+1}`, leftPage, rightPage, false, false);
        }

        // 4. Last Page Spread
        let lastPage = getPhoto();
        renderSpread(`Page ${pages}`, lastPage, null, false, true, false, true);



        // Initialize History now that the layout is complete
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.init();
        }
    }

    function createItemHTML(photoUrl, left, top, width, height = 'auto') {
        if (!photoUrl) return '';
        return `
            <div class="canvas-item" style="left:${left}; top:${top}; width:${width}; height:${height};">
                <img src="${photoUrl}" alt="Photo" class="item-img">
                <div class="transform-handle handle-nw"></div>
                <div class="transform-handle handle-ne"></div>
                <div class="transform-handle handle-sw"></div>
                <div class="transform-handle handle-se"></div>
                <div class="transform-handle handle-n"></div>
                <div class="transform-handle handle-s"></div>
                <div class="transform-handle handle-e"></div>
                <div class="transform-handle handle-w"></div>
            </div>`;
    }

    // Visual Render function for a double-page spread
    function renderSpread(label, leftPhoto, rightPhoto, isLeftBlank, isRightBlank, skipAppend = false, isLocked = false) {
        let spreadEl = document.createElement('div');
        spreadEl.className = 'spread-wrap';
        if (isLocked) spreadEl.classList.add('locked-spread');
        spreadEl.setAttribute('draggable', isLocked ? 'false' : 'true');

        let leftItem = isLeftBlank ? '' : createItemHTML(leftPhoto, '5%', '10%', '40%');
        let rightItem = isRightBlank ? '' : createItemHTML(rightPhoto, '55%', '10%', '40%');
        let moveBarHTML = isLocked ? '' : '<div class="spread-move-bar"><i class="ph ph-arrows-out-cardinal"></i> Move Spread</div>';

        // Add Watermark Logic (New Size: 90%, New Opacity: 50%)
        let watermarkHTML = '';
        if (label === 'Page 1') {
            // Watermark on Left Page (Blank)
            watermarkHTML = `<div class="page-watermark" style="position:absolute; left:0; top:0; width:50%; height:100%; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:1;">
                                <img src="logo_mychronicle.png" style="width:90%; height:auto; opacity:0.5;">
                             </div>`;
        } else if (label === `Page ${totalPages}`) {
            // Watermark on Right Page (Blank)
            watermarkHTML = `<div class="page-watermark" style="position:absolute; left:50%; top:0; width:50%; height:100%; display:flex; align-items:center; justify-content:center; pointer-events:none; z-index:1;">
                                <img src="logo_mychronicle.png" style="width:90%; height:auto; opacity:0.5;">
                             </div>`;
        }

        let dupBtnHTML = isLocked ? '' : '<button class="spread-action-btn dup-btn"><i class="ph ph-copy"></i> DUPLICATE</button>';

        spreadEl.innerHTML = `
            <div class="spread-paper">
                <div class="spread-overlay">
                    <button class="spread-action-btn edit-btn"><i class="ph ph-palette"></i> EDIT</button>
                    ${dupBtnHTML}
                </div>
                <div class="canvas-surface">
                    ${watermarkHTML}
                    ${leftItem}
                    ${rightItem}
                </div>
                <div class="page-left"></div>
                <div class="page-right"></div>
                <div class="binding-shadow"></div>
            </div>
            ${moveBarHTML}
            <p class="spread-label">${label}</p>
        `;
        
        attachSpreadEvents(spreadEl);
        if (!skipAppend) {
            spreadContainer.appendChild(spreadEl);
        }
        return spreadEl;
    }

    let draggedSpread = null;

    function attachSpreadEvents(spreadEl) {
        const editBtn = spreadEl.querySelector('.edit-btn');
        const dupBtn = spreadEl.querySelector('.dup-btn');
        
        if(editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openCanvaEditor(spreadEl);
            });
        }
        
        if(dupBtn) {
            dupBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Clone the entire spread
                const clone = spreadEl.cloneNode(true);
                // The cloned node loses event listeners, so we must re-attach
                attachSpreadEvents(clone);
                // Insert clone immediately after the current spread
                spreadEl.parentNode.insertBefore(clone, spreadEl.nextSibling);
                updateSpreadLabels();
            });
        }

        // --- Drag & Drop Logic ---
        if (spreadEl.getAttribute('draggable') === 'true') {
            spreadEl.addEventListener('dragstart', (e) => {
                draggedSpread = spreadEl;
                spreadEl.style.opacity = '0.4';
                e.dataTransfer.effectAllowed = 'move';
            });

            spreadEl.addEventListener('dragend', () => {
                spreadEl.style.opacity = '1';
                draggedSpread = null;
                const allSpreads = spreadContainer.querySelectorAll('.spread-wrap');
                allSpreads.forEach(s => s.style.border = 'none');
            });
        }

        spreadEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (spreadEl === draggedSpread || spreadEl.classList.contains('locked-spread')) return;
            spreadEl.style.border = '2px dashed var(--primary)';
        });

        spreadEl.addEventListener('dragleave', () => {
            spreadEl.style.border = 'none';
        });

        spreadEl.addEventListener('drop', (e) => {
            e.preventDefault();
            spreadEl.style.border = 'none';
            if (spreadEl === draggedSpread || spreadEl.classList.contains('locked-spread')) return;
            
            const spreads = Array.from(spreadContainer.querySelectorAll('.spread-wrap'));
            const draggedIndex = spreads.indexOf(draggedSpread);
            const targetIndex = spreads.indexOf(spreadEl);

            // Additional safety: Never allow dropping before index 2 or after the second-to-last index
            if (targetIndex < 2 || targetIndex >= spreads.length - 1) return;

            if (draggedIndex < targetIndex) {
                spreadContainer.insertBefore(draggedSpread, spreadEl.nextSibling);
            } else {
                spreadContainer.insertBefore(draggedSpread, spreadEl);
            }
            
            updateSpreadLabels();
        });
    }

    function updateSpreadLabels() {
        const spreads = Array.from(spreadContainer.querySelectorAll('.spread-wrap'));
        spreads.forEach((spread, index) => {
            const labelEl = spread.querySelector('.spread-label');
            if (!labelEl) return;
            
            if (index === 0) {
                labelEl.innerText = 'Cover';
            } else if (index === 1) {
                labelEl.innerText = 'Page 1';
            } else if (index === spreads.length - 1) {
                // If it's the last page, it's usually just one page
                const prevLabel = spreads[index-1].querySelector('.spread-label').innerText;
                if (prevLabel.includes('-')) {
                    const lastNum = parseInt(prevLabel.split('-')[1]);
                    labelEl.innerText = `Page ${lastNum + 1}`;
                } else if (prevLabel === 'Page 1') {
                    labelEl.innerText = 'Page 2';
                }
            } else {
                // Determine start based on previous
                const prevLabel = spreads[index-1].querySelector('.spread-label').innerText;
                let start = 2;
                if (prevLabel.includes('-')) {
                    start = parseInt(prevLabel.split('-')[1]) + 1;
                } else if (prevLabel === 'Page 1') {
                    start = 2;
                }
                labelEl.innerText = `Page ${start}-${start + 1}`;
            }
        });
    }

    // Canva Editor Logic
    const canvaEditor = document.getElementById('canva-editor');
    const canvaCloseBtn = document.getElementById('canva-close-btn');
    const canvaCanvasArea = document.getElementById('canva-canvas-area');
    const designTitleInput = document.getElementById('design-title-input');
    const canvaZoomSlider = document.getElementById('canva-zoom-slider');
    const canvaZoomText = document.getElementById('canva-zoom-text');
    const canvaZoomWrapper = document.getElementById('canva-zoom-wrapper');

    // Load saved design title if they have an account / returning session
    if (designTitleInput) {
        const savedTitle = localStorage.getItem('mychronicle_design_name');
        if (savedTitle) {
            designTitleInput.value = savedTitle;
        }

        // Auto-save title as the user types
        designTitleInput.addEventListener('input', (e) => {
            localStorage.setItem('mychronicle_design_name', e.target.value);
        });
    }

    // Handle Zoom slider
    if (canvaZoomSlider && canvaZoomWrapper && canvaZoomText) {
        canvaZoomSlider.addEventListener('input', (e) => {
            const zoomValue = e.target.value;
            canvaZoomText.innerText = `${zoomValue}%`;
            
            const scale = (zoomValue / 100) * 0.66;
            canvaZoomWrapper.style.transform = `scale(${scale})`;
            
            // Fix "Scrolling far down" bug: 
            // Update wrapper height to match scaled content so scrollbars are accurate
            const canvasHeight = canvaCanvasArea.offsetHeight;
            canvaZoomWrapper.style.height = (canvasHeight * scale + 100) + 'px';
            
            // Enable scrolling only if zoom is > 100%
            canvaWorkspace.style.overflow = zoomValue > 100 ? 'auto' : 'hidden';
        });

        // Handle Ctrl+Scroll / Touchpad Pinch-to-Zoom
        const canvaWorkspace = document.querySelector('.canva-workspace');
        if (canvaWorkspace) {
            canvaWorkspace.addEventListener('wheel', (e) => {
                if (e.ctrlKey) {
                    e.preventDefault(); // Prevent browser from zooming the entire window
                    
                    let currentValue = parseInt(canvaZoomSlider.value, 10);
                    
                    // Standardize delta for zooming (pinch zoom gives small deltaY, wheel gives large)
                    const zoomSensitivity = 2;
                    if (e.deltaY < 0) {
                        currentValue += zoomSensitivity; // Zoom in
                    } else {
                        currentValue -= zoomSensitivity; // Zoom out
                    }

                    // Clamp limits
                    if (currentValue < 10) currentValue = 10;
                    if (currentValue > 200) currentValue = 200;

                    // Update UI and CSS Scale
                    canvaZoomSlider.value = currentValue;
                    canvaZoomText.innerText = `${currentValue}%`;
                    const scale = (currentValue / 100) * 0.66;
                    canvaZoomWrapper.style.transform = `scale(${scale})`;
                    
                    const canvasHeight = canvaCanvasArea.offsetHeight;
                    canvaZoomWrapper.style.height = (canvasHeight * scale + 100) + 'px';
                    
                    // Enable scrolling only if zoom is > 100%
                    canvaWorkspace.style.overflow = currentValue > 100 ? 'auto' : 'hidden';
                }
            }, { passive: false });
        }
    }

    // Handle Fullscreen toggle
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                // Try to make the Canva editor full screen
                canvaEditor.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    function relabelSpreads() {
        const spreads = Array.from(document.querySelectorAll('#spread-container .spread-wrap'));
        spreads.forEach((spread, index) => {
            let label = spread.querySelector('.spread-label');
            if (!label) return;
            
            if (index === 0) {
                label.innerText = 'Cover';
            } else if (index === 1) {
                label.innerText = 'Page 1';
            } else if (index === spreads.length - 1) {
                label.innerText = `Page ${index * 2 - 2}`; // Rough estimate of last page
            } else {
                let pNum = (index * 2) - 2;
                label.innerText = `Page ${pNum}-${pNum+1}`;
            }
        });
    }

    const timelineThumbnails = document.getElementById('timeline-thumbnails');

    function syncTimelineScroll() {
        if (!timelineThumbnails) return;
        const activeThumb = timelineThumbnails.querySelector('.mini-spread.active');
        if (!activeThumb) return;

        const containerWidth = timelineThumbnails.clientWidth;
        const scrollLeft = timelineThumbnails.scrollLeft;
        
        const thumbLeft = activeThumb.offsetLeft;
        const thumbWidth = activeThumb.offsetWidth;
        const thumbRight = thumbLeft + thumbWidth;

        // Check if off-screen to the right
        if (thumbRight > (scrollLeft + containerWidth)) {
            timelineThumbnails.scrollLeft = thumbRight - containerWidth + 20; // +20 for padding
        } 
        // Check if off-screen to the left
        else if (thumbLeft < scrollLeft) {
            timelineThumbnails.scrollLeft = thumbLeft - 20; // -20 for padding
        }
    }

    // Re-link thumbnails helper
    function refreshTimelineHighlight() {
        const timelineThumbnails = document.getElementById('timeline-thumbnails');
        if (!timelineThumbnails) return;
        const thumbs = timelineThumbnails.querySelectorAll('.mini-spread');
        thumbs.forEach((t, i) => {
            if (i === currentActiveIndex) t.classList.add('active');
            else t.classList.remove('active');
        });
    }

    function openCanvaEditor(spreadEl) {
        // Auto-close Transform panel if open during page switch (Fixes ghost panel bug)
        const cropPanel = document.getElementById('crop-panel');
        if (cropPanel && cropPanel.style.display === 'block') {
            const cancelBtn = document.getElementById('crop-cancel');
            if (cancelBtn) cancelBtn.click();
        }

        currentActiveSpread = spreadEl;
        
        // Update the global index for history tracking
        const allSpreads = Array.from(document.querySelectorAll('#spread-container .spread-wrap'));
        currentActiveIndex = allSpreads.indexOf(spreadEl);
        if (currentActiveIndex === -1) currentActiveIndex = 0;
        // Clear previous
        canvaCanvasArea.innerHTML = '';
        
        // Clone the spread visually for the editor
        const visualClone = spreadEl.cloneNode(true);
        
        // Add or remove the black border based on whether it is the cover
        if (currentActiveIndex === 0) {
            visualClone.style.border = 'none';
        } else {
            visualClone.style.border = '10px solid #333';
            visualClone.style.borderRadius = '12px'; // Match the rounded aesthetic
        }
        
        canvaCanvasArea.appendChild(visualClone);
        
        // Initialize interactivity for the clone
        initCanvasInteractivity(visualClone);
        
        // Populate/Update Timeline thumbnails
        const timelineThumbnails = document.getElementById('timeline-thumbnails');
        if (timelineThumbnails) {
            const allSpreads = Array.from(document.querySelectorAll('#spread-container .spread-wrap'));
            const existingThumbs = Array.from(timelineThumbnails.querySelectorAll('.mini-spread'));
            
            // 1. Check if thumbnails need a full rebuild (Count or Order mismatch)
            let needsRebuild = existingThumbs.length !== allSpreads.length;
            if (!needsRebuild) {
                // Check if the order matches
                for (let i = 0; i < allSpreads.length; i++) {
                    if (existingThumbs[i]._originalSpread !== allSpreads[i]) {
                        needsRebuild = true;
                        break;
                    }
                }
            }

            if (needsRebuild) {
                timelineThumbnails.innerHTML = '';
                allSpreads.forEach((originalSpread, index) => {
                    const miniClone = originalSpread.cloneNode(true);
                    miniClone.classList.add('mini-spread');
                    miniClone._originalSpread = originalSpread; // IDENTITY LINK
                    
                    miniClone.addEventListener('click', () => {
                        openCanvaEditor(originalSpread);
                        saveHistory();
                    });
                    
                    const isLocked = originalSpread.classList.contains('locked-spread');
                    
                    miniClone.addEventListener('click', () => {
                        openCanvaEditor(originalSpread);
                        saveHistory();
                    });
                    
                    // Drag and Drop Logic
                    if (isLocked) {
                        miniClone.setAttribute('draggable', 'false');
                        miniClone.style.cursor = 'default';
                    } else {
                        miniClone.setAttribute('draggable', 'true');
                    }
                    
                    miniClone.addEventListener('dragstart', (e) => {
                        if (isLocked) return;
                        miniClone.classList.add('is-dragging');
                        e.dataTransfer.setData('text/plain', index);
                    });
                    miniClone.addEventListener('dragend', () => miniClone.classList.remove('is-dragging'));
                    miniClone.addEventListener('dragover', (e) => { 
                        if (isLocked) return;
                        e.preventDefault(); 
                        miniClone.classList.add('drag-hover'); 
                    });
                    miniClone.addEventListener('dragleave', () => miniClone.classList.remove('drag-hover'));
                    miniClone.addEventListener('drop', (e) => {
                        e.preventDefault();
                        miniClone.classList.remove('drag-hover');
                        const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        
                        // Safety: Check if target or dragged is locked
                        const draggedOriginal = allSpreads[draggedIndex];
                        if (isLocked || (draggedOriginal && draggedOriginal.classList.contains('locked-spread'))) return;
                        
                        if (!isNaN(draggedIndex) && draggedIndex !== index) {
                            const container = document.getElementById('spread-container');
                            const targetSpread = allSpreads[index];
                            const draggedSpread = allSpreads[draggedIndex];
                            container.removeChild(draggedSpread);
                            if (draggedIndex < index) container.insertBefore(draggedSpread, targetSpread.nextSibling);
                            else container.insertBefore(draggedSpread, targetSpread);
                            updateSpreadLabels();
                            openCanvaEditor(draggedSpread);
                            saveHistory();
                        }
                    });
                    
                    timelineThumbnails.appendChild(miniClone);
                    
                    // Interstitial "Add Page" Button
                    // RULES: 
                    // 1. Never add between Cover (0) and Page 1 (1)
                    // 2. Never add after the Last Page (length - 1)
                    // Add gap after every spread except the very last one
                    if (index < allSpreads.length - 1) {
                        const gapContainer = document.createElement('div');
                        gapContainer.className = 'add-page-between';
                        
                        // ONLY add the plus button for indices > 0 (Middle pages)
                        if (index > 0) {
                            gapContainer.innerHTML = '<i class="ph ph-plus-circle"></i>';
                            gapContainer.addEventListener('click', () => {
                                const newSpread = renderSpread('', null, null, false, false, true);
                                const container = document.getElementById('spread-container');
                                container.insertBefore(newSpread, originalSpread.nextSibling);
                                updateSpreadLabels();
                                openCanvaEditor(newSpread);
                            });
                        } else {
                            // index 0 (After Cover): Just a spacer, no icon, no click
                            gapContainer.style.cursor = 'default';
                            gapContainer.style.opacity = '1'; // Ensure the space is reserved
                        }
                        timelineThumbnails.appendChild(gapContainer);
                    }
                });
            }

            // 2. Update Active States and Link Every Element (Identity-Lock)
            const finalThumbs = timelineThumbnails.querySelectorAll('.mini-spread');
            finalThumbs.forEach((thumb, i) => {
                if (i === currentActiveIndex) {
                    thumb.classList.add('active');
                    visualClone._linkedThumbnail = thumb; 
                    
                    // CRITICAL: Identity-Lock every item between Editor, Original, and Thumbnail
                    const editorItems = Array.from(visualClone.querySelectorAll('.canvas-item'));
                    const thumbItems = Array.from(thumb.querySelectorAll('.canvas-item'));
                    const originalItems = Array.from(currentActiveSpread.querySelectorAll('.canvas-item'));
                    
                    editorItems.forEach((item, idx) => {
                        item._linkedThumbItem = thumbItems[idx];
                        item._linkedOriginalItem = originalItems[idx];
                    });

                    let labelText = spreadEl.querySelector('.spread-label').innerText;
                    const pageTextEl = document.getElementById('timeline-current-page');
                    if (pageTextEl) pageTextEl.innerText = labelText;
                } else {
                    thumb.classList.remove('active');
                }
            });
        }
        
        // Use a small timeout to ensure DOM is ready for scroll calculation
        setTimeout(syncTimelineScroll, 50);
        
        // Dynamic Default Zoom: Optimization for each orientation
        if (canvaZoomSlider && canvaZoomWrapper && canvaZoomText) {
            let defaultZoom = 100;
            let defaultScale = 0.66;

            if (selectedOrient === 'Landscape') {
                defaultZoom = 150;
                defaultScale = 1.0;
            } else if (selectedOrient === 'Square') {
                defaultZoom = 118;
                defaultScale = 0.78; // 118% translates to ~0.78 scale (0.66 * 1.18)
            }
            
            canvaZoomSlider.value = defaultZoom;
            canvaZoomText.innerText = defaultZoom + '%';
            canvaZoomWrapper.style.transform = `scale(${defaultScale})`;
        }

        // Show editor
        canvaEditor.style.display = 'flex';
        
        // --- Structural Protection: Disable Duplicate/Remove for Locked Spreads ---
        const isLocked = originalSpread.classList.contains('locked-spread');
        const timelineDupBtn = document.getElementById('timeline-dup-btn');
        const timelineRemoveBtn = document.getElementById('timeline-remove-btn');
        
        if (timelineDupBtn) {
            timelineDupBtn.disabled = isLocked;
            timelineDupBtn.style.opacity = isLocked ? '0.5' : '1';
            timelineDupBtn.style.cursor = isLocked ? 'not-allowed' : 'pointer';
        }
        if (timelineRemoveBtn) {
            timelineRemoveBtn.disabled = isLocked;
            timelineRemoveBtn.style.opacity = isLocked ? '0.5' : '1';
            timelineRemoveBtn.style.cursor = isLocked ? 'not-allowed' : 'pointer';
        }

        // Ensure "One Page" button is active
        const btnOne = document.getElementById('view-one-page');
        const btnAll = document.getElementById('view-all-pages');
        if (btnOne) btnOne.classList.add('active');
        if (btnAll) btnAll.classList.remove('active');
    }

    // View Switchers (Grid vs Single Spread)
    const viewOnePage = document.getElementById('view-one-page');
    const viewAllPages = document.getElementById('view-all-pages');
    
    if (viewAllPages) {
        viewAllPages.addEventListener('click', () => {
            if (canvaEditor && stepEditor) {
                canvaEditor.style.display = 'none';
                stepEditor.style.display = 'grid'; // Return to full grid overview
                
                // Update button states
                viewAllPages.classList.add('active');
                if (viewOnePage) viewOnePage.classList.remove('active');
            }
        });
    }
    
    if (viewOnePage) {
        viewOnePage.addEventListener('click', () => {
            if (currentActiveSpread) {
                openCanvaEditor(currentActiveSpread);
            }
        });
    }

    // Bind Timeline Action Buttons (Duplicate, Remove)
    const timelineDupBtn = document.getElementById('timeline-dup-btn');
    const timelineRemoveBtn = document.getElementById('timeline-remove-btn');

    if (timelineDupBtn) {
        timelineDupBtn.addEventListener('click', () => {
            if (currentActiveSpread) {
                // HARD GUARD: Prevent duplication of structural pages
                if (currentActiveSpread.classList.contains('locked-spread')) {
                    console.warn("Structural pages cannot be duplicated.");
                    return;
                }
                
                // Duplicates the currently active spread and inserts it right after
                const clone = currentActiveSpread.cloneNode(true);
                attachSpreadEvents(clone);
                currentActiveSpread.parentNode.insertBefore(clone, currentActiveSpread.nextSibling);
                relabelSpreads();
                openCanvaEditor(clone);
            }
        });
    }

    if (timelineRemoveBtn) {
        timelineRemoveBtn.addEventListener('click', () => {
            if (currentActiveSpread) {
                // HARD GUARD: Prevent removal of structural pages
                if (currentActiveSpread.classList.contains('locked-spread')) {
                    console.warn("Structural pages cannot be removed.");
                    return;
                }

                const container = document.getElementById('spread-container');
                if (container.children.length > 1) { // Prevent removing the only page
                    const nextToOpen = currentActiveSpread.nextElementSibling || currentActiveSpread.previousElementSibling;
                    container.removeChild(currentActiveSpread);
                    relabelSpreads();
                    if (nextToOpen) {
                        openCanvaEditor(nextToOpen);
                    }
                } else {
                    alert("You cannot remove the only page in the photobook.");
                }
            }
        });
    }

    // Bind Previous/Next Timeline Navigation
    const timelinePrevBtn = document.getElementById('timeline-prev');
    const timelineNextBtn = document.getElementById('timeline-next');

    if (timelinePrevBtn) {
        timelinePrevBtn.addEventListener('click', () => {
            if (currentActiveSpread) {
                const prevNode = currentActiveSpread.previousElementSibling;
                if (prevNode && prevNode.classList.contains('spread-wrap')) {
                    openCanvaEditor(prevNode);
                    saveHistory();
                    syncTimelineScroll();
                }
            }
        });
    }

    if (timelineNextBtn) {
        timelineNextBtn.addEventListener('click', () => {
            if (currentActiveSpread) {
                const nextNode = currentActiveSpread.nextElementSibling;
                if (nextNode && nextNode.classList.contains('spread-wrap')) {
                    openCanvaEditor(nextNode);
                    saveHistory();
                    syncTimelineScroll();
                }
            }
        });
    }

    if(canvaCloseBtn) {
        canvaCloseBtn.addEventListener('click', () => {
            canvaEditor.style.display = 'none';
        });
    }

    // --- Live Studio Tracking ---
    async function trackStudioActivity() {
        if (!auth.currentUser) return;
        
        const activityData = {
            user_id: auth.currentUser.uid,
            user_email: auth.currentUser.email,
            status: 'designing',
            last_active: firebase.firestore.FieldValue.serverTimestamp(),
            page_count: document.querySelectorAll('.spread-wrap').length,
            orientation: localStorage.getItem('mychronicle_book_orientation') || 'N/A'
        };

        try {
            await db.collection('studio_activity').doc(auth.currentUser.uid).set(activityData, { merge: true });
        } catch (e) {
            console.error("Tracking Error:", e);
        }
    }

    // Update tracking every 60 seconds or on entry
    trackStudioActivity();
    const trackingInterval = setInterval(trackStudioActivity, 60000);

    // Clean up tracking on unload
    window.addEventListener('beforeunload', async () => {
        if (auth.currentUser) {
            await db.collection('studio_activity').doc(auth.currentUser.uid).update({
                status: 'inactive'
            });
        }
    });


    // Add to cart with PDF Generation & Cloud Sync
    cartOrderBtn.addEventListener('click', async () => {
        if (!auth.currentUser) {
            alert('Please sign in to place an order.');
            return;
        }

        const loader = document.getElementById('pdf-loader');
        const statusText = document.getElementById('pdf-status');
        
        try {
            loader.style.display = 'flex';
            statusText.innerText = 'Preparing your design for printing...';

            // 1. Initialize PDF based on selected book orientation
            const { jsPDF } = window.jspdf;
            const orientationStr = localStorage.getItem('mychronicle_book_orientation') || 'Square';
            let pdfWidth = 210;
            let pdfHeight = 210;
            let pdfFormat = [210, 210]; // default square

            if (orientationStr.toLowerCase() === 'landscape') {
                pdfWidth = 290;
                pdfHeight = 210;
                pdfFormat = [290, 210];
            } else if (orientationStr.toLowerCase() === 'portrait') {
                pdfWidth = 210;
                pdfHeight = 290;
                pdfFormat = [210, 290];
            }

            // Using 'p' for Portrait if height > width, else 'l' for Landscape
            const orientationMode = pdfWidth > pdfHeight ? 'l' : 'p';
            const pdf = new jsPDF(orientationMode, 'mm', pdfFormat);

            // 2. Capture all spreads and split them
            const spreads = document.querySelectorAll('#spread-container .spread-wrap');
            const total = spreads.length;
            let pageIndex = 0; // Tracks actual PDF pages added

            for (let i = 0; i < total; i++) {
                statusText.innerText = `High-Fidelity Render: Spread ${i + 1} of ${total} (${Math.round((i/total)*100)}%)`;
                
                // Hide editor UI elements temporarily for clean capture
                const uiElements = spreads[i].querySelectorAll('.spread-label, .spread-actions, .spread-move-bar, .binding-shadow');
                const originalDisplays = [];
                uiElements.forEach(el => {
                    originalDisplays.push(el.style.display);
                    el.style.display = 'none';
                });

                // PHASE 3: High-Fidelity Print Quality Protection
                const fullCanvas = await html2canvas(spreads[i], {
                    scale: 3, // Elevated scale factor for ~300 DPI print quality
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                // Restore UI elements
                uiElements.forEach((el, idx) => {
                    el.style.display = originalDisplays[idx];
                });

                // PHASE 2: The Spread-Splitting Logic
                const halfWidth = fullCanvas.width / 2;
                const fullHeight = fullCanvas.height;

                // Create Left Page Canvas
                const leftCanvas = document.createElement('canvas');
                leftCanvas.width = halfWidth;
                leftCanvas.height = fullHeight;
                const leftCtx = leftCanvas.getContext('2d');
                leftCtx.drawImage(fullCanvas, 0, 0, halfWidth, fullHeight, 0, 0, halfWidth, fullHeight);
                const leftImgData = leftCanvas.toDataURL('image/jpeg', 1.0);

                // Create Right Page Canvas
                const rightCanvas = document.createElement('canvas');
                rightCanvas.width = halfWidth;
                rightCanvas.height = fullHeight;
                const rightCtx = rightCanvas.getContext('2d');
                rightCtx.drawImage(fullCanvas, halfWidth, 0, halfWidth, fullHeight, 0, 0, halfWidth, fullHeight);
                const rightImgData = rightCanvas.toDataURL('image/jpeg', 1.0);

                // Dimensional Mapping (1:1 Ratio Management)
                const pdfRatio = pdfWidth / pdfHeight;
                const imgRatio = halfWidth / fullHeight;

                let drawWidth = pdfWidth;
                let drawHeight = pdfHeight;
                let drawX = 0;
                let drawY = 0;

                if (imgRatio > pdfRatio) {
                    drawHeight = pdfWidth / imgRatio;
                    drawY = (pdfHeight - drawHeight) / 2;
                } else {
                    drawWidth = pdfHeight * imgRatio;
                    drawX = (pdfWidth - drawWidth) / 2;
                }

                // Add Left Page
                if (pageIndex > 0) pdf.addPage();
                pdf.addImage(leftImgData, 'JPEG', drawX, drawY, drawWidth, drawHeight);
                pageIndex++;

                // Add Right Page
                pdf.addPage();
                pdf.addImage(rightImgData, 'JPEG', drawX, drawY, drawWidth, drawHeight);
                pageIndex++;
            }

            statusText.innerText = 'Uploading your design to our secure server...';
            
            // 3. Convert PDF to Blob
            const pdfBlob = pdf.output('blob');

            // 4. Upload to Cloudinary with Progress Tracking
            const formData = new FormData();
            formData.append('file', pdfBlob, `order_${auth.currentUser.uid}_${Date.now()}.pdf`);
            formData.append('upload_preset', 'mychronicle');

            const downloadURL = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', 'https://api.cloudinary.com/v1_1/dg5ailpa3/auto/upload');
                
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        statusText.innerText = `Uploading your design to our secure server... ${Math.round(progress)}%`;
                    }
                };
                
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response.secure_url);
                    } else {
                        reject(new Error('Cloudinary upload failed: ' + xhr.responseText));
                    }
                };
                
                xhr.onerror = () => reject(new Error('Network error during upload'));
                
                xhr.send(formData);
            });

            statusText.innerText = 'Finalizing your order...';

            // 5. Save Order to Firestore
            const orderData = {
                user_id: auth.currentUser.uid,
                user_email: auth.currentUser.email,
                pdf_url: downloadURL,
                status: 'pending',
                price: 3499, // Set dynamic price here if needed
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                items: [{ title: 'Custom Designed Photobook', quantity: 1 }]
            };

            await db.collection('orders').add(orderData);

            // 6. Update tracking status to 'ordered'
            await db.collection('studio_activity').doc(auth.currentUser.uid).update({
                status: 'ordered',
                pdf_url: downloadURL
            });

            // 7. Update local cart for consistency
            let cart = JSON.parse(localStorage.getItem('mychronicle_cart')) || [];
            cart.push({ id: 'order-' + Date.now(), title: 'Custom Designed Photobook', price: 3499, quantity: 1, pdf_url: downloadURL });
            localStorage.setItem('mychronicle_cart', JSON.stringify(cart));

            statusText.innerText = 'Order Placed Successfully!';
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('Order Error:', error);
            alert('Something went wrong while placing your order. Please try again. ' + error.message);
            loader.style.display = 'none';
        }
    });

    // --- Canvas Item Interactivity (Drag/Resize) ---
    const contextMenu = document.getElementById('image-context-menu');
    let contextTargetItem = null;
    let clipboardItem = null;

    function initCanvasInteractivity(container) {
        const items = container.querySelectorAll('.canvas-item');
        
        items.forEach(item => {
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                contextTargetItem = item;
                
                // Reset all submenus before showing
                document.querySelectorAll('.sub-menu.open').forEach(sm => sm.classList.remove('open'));
                
                // Show and position the menu
                contextMenu.style.display = 'block';
                contextMenu.style.left = `${e.clientX}px`;
                contextMenu.style.top = `${e.clientY}px`;
                
                // Close sub-menu if it was open
                const subMenu = contextMenu.querySelector('.sub-menu');
                if (subMenu) subMenu.classList.remove('open');
                
                // Adjust if menu goes off screen
                const rect = contextMenu.getBoundingClientRect();
                if (e.clientX + rect.width > window.innerWidth) {
                    contextMenu.style.left = `${window.innerWidth - rect.width - 10}px`;
                }
                if (e.clientY + rect.height > window.innerHeight) {
                    contextMenu.style.top = `${window.innerHeight - rect.height - 10}px`;
                }

                // Update Lock/Unlock label and icon
                const lockItem = document.getElementById('menu-lock');
                if (lockItem) {
                    const isLocked = item.getAttribute('data-locked') === 'true';
                    if (isLocked) {
                        lockItem.innerHTML = '<i class="ph ph-lock-key-open"></i> Unlock';
                        // Disable all other items
                        contextMenu.querySelectorAll('.menu-item').forEach(mi => {
                            if (mi.id !== 'menu-lock') mi.classList.add('disabled');
                        });
                    } else {
                        lockItem.innerHTML = '<i class="ph ph-lock"></i> Lock';
                        // Re-enable all items
                        contextMenu.querySelectorAll('.menu-item').forEach(mi => {
                            mi.classList.remove('disabled');
                        });
                    }
                }
                
                // Select the item visually
                container.querySelectorAll('.canvas-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });

            item.addEventListener('mousedown', (e) => {
                const handle = e.target.closest('.transform-handle');
                if (handle) {
                    startResizing(e, item, handle);
                } else {
                    startDragging(e, item);
                }
            });
        });

        // Click outside to deselect and hide context menu
        document.addEventListener('click', (e) => {
            contextMenu.style.display = 'none';
            if (e.target.closest('.canvas-surface') || e.target.closest('.spread-paper')) {
                const item = e.target.closest('.canvas-item');
                if (!item) {
                    container.querySelectorAll('.canvas-item').forEach(i => i.classList.remove('active'));
                    contextTargetItem = null; // FORGET the item when deselecting
                }
            }
        });
    }

    // Context Menu Actions
    document.getElementById('menu-copy').addEventListener('click', () => {
        if (contextTargetItem) {
            clipboardItem = {
                html: contextTargetItem.innerHTML,
                width: contextTargetItem.style.width,
                height: contextTargetItem.style.height,
                left: contextTargetItem.style.left,
                top: contextTargetItem.style.top,
                transform: contextTargetItem.style.transform || ''
            };
            contextMenu.style.display = 'none';
        }
    });

    document.getElementById('menu-paste').addEventListener('click', () => {
        if (clipboardItem) {
            const surface = canvaCanvasArea.querySelector('.canvas-surface');
            const newItem = document.createElement('div');
            newItem.className = 'canvas-item';
            newItem.style.width = clipboardItem.width;
            newItem.style.height = clipboardItem.height;
            newItem.style.left = (parseFloat(clipboardItem.left) + 4) + '%';
            newItem.style.top = (parseFloat(clipboardItem.top) + 4) + '%';
            newItem.style.transform = clipboardItem.transform;
            newItem.innerHTML = clipboardItem.html;
            
            surface.appendChild(newItem);
            
            // 1. Mirror to original spread (Persistence)
            if (currentActiveSpread) {
                const originalSurface = currentActiveSpread.querySelector('.canvas-surface');
                const originalItem = newItem.cloneNode(true);
                originalSurface.appendChild(originalItem);
                newItem._linkedOriginalItem = originalItem;
            }

            // 2. Mirror to thumbnail (Live Track)
            const visualClone = canvaCanvasArea.querySelector('.spread-wrap');
            if (visualClone && visualClone._linkedThumbnail) {
                const thumbSurface = visualClone._linkedThumbnail.querySelector('.canvas-surface');
                const thumbItem = newItem.cloneNode(true);
                thumbSurface.appendChild(thumbItem);
                newItem._linkedThumbItem = thumbItem;
            }

            initCanvasInteractivity(surface);
            saveHistory();
            contextMenu.style.display = 'none';
        }
    });

    document.getElementById('menu-cut').addEventListener('click', () => {
        if (contextTargetItem) {
            clipboardItem = {
                html: contextTargetItem.innerHTML,
                width: contextTargetItem.style.width,
                height: contextTargetItem.style.height,
                left: contextTargetItem.style.left,
                top: contextTargetItem.style.top,
                transform: contextTargetItem.style.transform || ''
            };
            
            // Remove from all 3 places
            if (contextTargetItem._linkedOriginalItem) contextTargetItem._linkedOriginalItem.remove();
            if (contextTargetItem._linkedThumbItem) contextTargetItem._linkedThumbItem.remove();
            contextTargetItem.remove();
            
            saveHistory();
            contextMenu.style.display = 'none';
        }
    });

    document.getElementById('menu-delete').addEventListener('click', () => {
        if (contextTargetItem) {
            if (contextTargetItem._linkedOriginalItem) contextTargetItem._linkedOriginalItem.remove();
            if (contextTargetItem._linkedThumbItem) contextTargetItem._linkedThumbItem.remove();
            contextTargetItem.remove();
            
            saveHistory();
            contextMenu.style.display = 'none';
        }
    });

    document.getElementById('menu-duplicate').addEventListener('click', () => {
        if (contextTargetItem) {
            const clone = contextTargetItem.cloneNode(true);
            clone.classList.remove('active');
            clone.style.left = (parseFloat(clone.style.left) + 2) + '%';
            clone.style.top = (parseFloat(clone.style.top) + 2) + '%';
            contextTargetItem.parentElement.appendChild(clone);
            
            // Mirror to original spread
            if (currentActiveSpread) {
                const originalSurface = currentActiveSpread.querySelector('.canvas-surface');
                const originalClone = clone.cloneNode(true);
                originalSurface.appendChild(originalClone);
                clone._linkedOriginalItem = originalClone;
            }

            // Mirror to thumbnail (Live Track)
            const visualClone = canvaCanvasArea.querySelector('.spread-wrap');
            if (visualClone && visualClone._linkedThumbnail) {
                const thumbSurface = visualClone._linkedThumbnail.querySelector('.canvas-surface');
                const thumbClone = clone.cloneNode(true);
                thumbSurface.appendChild(thumbClone);
                clone._linkedThumbItem = thumbClone;
            }

            initCanvasInteractivity(clone.parentElement);
            saveHistory();
            contextMenu.style.display = 'none';
        }
    });

    const alignMap = {
        'align-left': (item, w, h) => { 
            const currentLeft = parseFloat(item.style.left);
            const isRightPage = (currentLeft + w/2) > 50;
            item.style.left = isRightPage ? '50%' : '0%'; 
        },
        'align-center': (item, w, h) => { 
            const currentLeft = parseFloat(item.style.left);
            const isRightPage = (currentLeft + w/2) > 50;
            item.style.left = isRightPage ? (75 - w / 2) + '%' : (25 - w / 2) + '%'; 
        },
        'align-right': (item, w, h) => { 
            const currentLeft = parseFloat(item.style.left);
            const isRightPage = (currentLeft + w/2) > 50;
            item.style.left = isRightPage ? (100 - w) + '%' : (50 - w) + '%'; 
        },
        'align-top': (item, w, h) => { item.style.top = '0%'; },
        'align-middle': (item, w, h) => { item.style.top = (50 - h / 2) + '%'; },
        'align-bottom': (item, w, h) => { item.style.top = (100 - h) + '%'; }
    };

    Object.keys(alignMap).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (contextTargetItem) {
                    const rect = contextTargetItem.getBoundingClientRect();
                    const parentRect = contextTargetItem.parentElement.getBoundingClientRect();
                    const w = (rect.width / parentRect.width) * 100;
                    const h = (rect.height / parentRect.height) * 100;
                    
                    alignMap[id](contextTargetItem, w, h);
                    syncToOriginal();
                    syncToThumbnail(contextTargetItem);
                    contextMenu.style.display = 'none';
                }
            });
        }
    });

    // Layering logic
    const layerForward = document.getElementById('layer-forward');
    const layerBackward = document.getElementById('layer-backward');
    const layerFront = document.getElementById('layer-front');
    const layerBack = document.getElementById('layer-back');

    if (layerForward) layerForward.addEventListener('click', (e) => { e.stopPropagation(); moveLayer('forward'); });
    if (layerBackward) layerBackward.addEventListener('click', (e) => { e.stopPropagation(); moveLayer('backward'); });
    if (layerFront) layerFront.addEventListener('click', (e) => { e.stopPropagation(); moveLayer('front'); });
    if (layerBack) layerBack.addEventListener('click', (e) => { e.stopPropagation(); moveLayer('back'); });

    function moveLayer(action) {
        if (!contextTargetItem) return;
        const parent = contextTargetItem.parentElement;
        if (!parent) return;

        // Sync helper to perform same DOM move on linked elements
        const performMove = (item, act) => {
            const p = item.parentElement;
            if (!p) return;
            
            // Remove any inline z-index that might conflict with DOM order
            item.style.zIndex = ''; 
            
            if (act === 'forward') {
                const next = item.nextElementSibling;
                if (next && next.classList.contains('canvas-item')) p.insertBefore(next, item);
            } else if (act === 'backward') {
                const prev = item.previousElementSibling;
                if (prev && prev.classList.contains('canvas-item')) p.insertBefore(item, prev);
            } else if (act === 'front') {
                p.appendChild(item);
            } else if (act === 'back') {
                // Find the first canvas item specifically
                const items = p.querySelectorAll('.canvas-item');
                if (items.length > 1) {
                    const first = items[0];
                    if (first !== item) p.insertBefore(item, first);
                }
            }
        };

        // 1. Move in Editor (Live View)
        performMove(contextTargetItem, action);

        // 2. Move in Thumbnail (Live Mirror)
        if (contextTargetItem._linkedThumbItem) {
            performMove(contextTargetItem._linkedThumbItem, action);
        }

        // 3. Move in Original (Project State)
        if (contextTargetItem._linkedOriginalItem) {
            performMove(contextTargetItem._linkedOriginalItem, action);
        }

        syncToOriginal();
        syncToThumbnail(contextTargetItem);
        saveHistory();
        contextMenu.style.display = 'none';
    }

    // Layer Menu Click Trigger
    const menuLayer = document.getElementById('menu-layer');
    if (menuLayer) {
        menuLayer.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // CLOSE OTHER SUBMENUS FIRST (Fixes overlapping)
            document.querySelectorAll('.sub-menu.open').forEach(sm => {
                if (sm.parentElement !== menuLayer) sm.classList.remove('open');
            });

            const subMenu = menuLayer.querySelector('.sub-menu');
            if (subMenu) {
                const isOpen = subMenu.classList.toggle('open');
                if (isOpen) {
                    subMenu.style.top = '-6px';
                    subMenu.style.bottom = 'auto';
                    subMenu.style.left = 'calc(100% + 4px)';
                    subMenu.style.right = 'auto';
                    const subRect = subMenu.getBoundingClientRect();
                    if (subRect.bottom > window.innerHeight) {
                        subMenu.style.top = 'auto';
                        subMenu.style.bottom = '-6px';
                    }
                }
            }
        });
    }

    // Align Menu Click Trigger (entire item)
    const menuAlign = document.getElementById('menu-align');
    if (menuAlign) {
        menuAlign.addEventListener('click', (e) => {
            e.stopPropagation();

            // CLOSE OTHER SUBMENUS FIRST (Fixes overlapping)
            document.querySelectorAll('.sub-menu.open').forEach(sm => {
                if (sm.parentElement !== menuAlign) sm.classList.remove('open');
            });

            const subMenu = menuAlign.querySelector('.sub-menu');
            if (subMenu) {
                const isOpen = subMenu.classList.toggle('open');
                
                if (isOpen) {
                    // Reset to default
                    subMenu.style.top = '-6px';
                    subMenu.style.bottom = 'auto';
                    subMenu.style.left = 'calc(100% + 4px)';
                    subMenu.style.right = 'auto';
                    
                    const subRect = subMenu.getBoundingClientRect();
                    
                    // Fix bottom overflow
                    if (subRect.bottom > window.innerHeight) {
                        subMenu.style.top = 'auto';
                        subMenu.style.bottom = '-6px';
                    }
                    
                    // Fix right overflow
                    if (subRect.right > window.innerWidth) {
                        subMenu.style.left = 'auto';
                        subMenu.style.right = 'calc(100% + 4px)';
                    }
                }
            }
        });
    }

    // Ensure main items close submenus
    document.querySelectorAll('.menu-item:not(.sub-menu-trigger)').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sub-menu.open').forEach(sm => sm.classList.remove('open'));
        });
    });

    document.getElementById('menu-lock').addEventListener('click', () => {
        if (contextTargetItem) {
            const isLocked = contextTargetItem.getAttribute('data-locked') === 'true';
            const newState = !isLocked;
            contextTargetItem.setAttribute('data-locked', newState);
            contextTargetItem.style.cursor = newState ? 'not-allowed' : 'move';
            
            // Re-sync and save history for the lock state change
            syncToOriginal();
            saveHistory();
            
            contextMenu.style.display = 'none';
        }
    });

    // --- Crop Panel Logic ---
    const cropPanel = document.getElementById('crop-panel');
    const cropRotateSlider = document.getElementById('crop-rotate-slider');
    const cropRotateInput = document.getElementById('crop-rotate-input');
    const cropDone = document.getElementById('crop-done');
    const cropCancel = document.getElementById('crop-cancel');
    const cropClose = document.getElementById('crop-close');
    const aspectItems = document.querySelectorAll('.aspect-item');
    const aspectCarousel = document.getElementById('aspect-carousel');
    const aspectPrev = document.getElementById('aspect-prev');
    const aspectNext = document.getElementById('aspect-next');

    // Moved updateArrowVisibility to be accessible when opening the panel
    function updateArrowVisibility() {
        const aspectCarousel = document.querySelector('.aspect-carousel');
        const aspectPrev = document.querySelector('.aspect-arrow.left');
        const aspectNext = document.querySelector('.aspect-arrow.right');
        if (!aspectCarousel || !aspectPrev || !aspectNext) return;

        const canScroll = aspectCarousel.scrollWidth > aspectCarousel.clientWidth + 5;
        const isAtStart = aspectCarousel.scrollLeft <= 5;
        const isAtEnd = aspectCarousel.scrollLeft + aspectCarousel.clientWidth >= aspectCarousel.scrollWidth - 5;
        
        aspectPrev.style.opacity = (canScroll && !isAtStart) ? '1' : '0';
        aspectPrev.style.pointerEvents = (canScroll && !isAtStart) ? 'auto' : 'none';
        
        aspectNext.style.opacity = (canScroll && !isAtEnd) ? '1' : '0';
        aspectNext.style.pointerEvents = (canScroll && !isAtEnd) ? 'auto' : 'none';
    }

    if (aspectCarousel && aspectPrev && aspectNext) {
        aspectPrev.addEventListener('click', () => {
            aspectCarousel.scrollLeft -= 100;
            setTimeout(updateArrowVisibility, 300);
        });
        aspectNext.addEventListener('click', () => {
            aspectCarousel.scrollLeft += 100;
            setTimeout(updateArrowVisibility, 300);
        });
        aspectCarousel.addEventListener('scroll', updateArrowVisibility);
    }

    // --- Real Cropper Logic ---
    let cropper = null;

    document.getElementById('menu-crop').addEventListener('click', () => {
        if (contextTargetItem) {
            const targetImg = contextTargetItem.querySelector('img');
            if (!targetImg) return;

            cropPanel.style.display = 'block';
            contextMenu.style.display = 'none';
            
            // Update arrows now that the panel is visible
            setTimeout(updateArrowVisibility, 50);
            
            // Sync opacity slider
            const currentOpacity = parseFloat(window.getComputedStyle(contextTargetItem).opacity);
            document.getElementById('crop-opacity-slider').value = currentOpacity * 100;
            document.getElementById('crop-opacity-text').innerText = `${Math.round(currentOpacity * 100)}%`;

            // Save initial state for Cancel restoration
            initialCropState = {
                transform: contextTargetItem.style.transform || '',
                opacity: contextTargetItem.style.opacity || '1'
            };

            // Hide parent handles
            contextTargetItem.classList.add('cropping-active');
            
            // Initialize Cropper on the IMG
            if (cropper) cropper.destroy();
            cropper = new Cropper(targetImg, {
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                ready() {
                    cropRotateSlider.value = 0;
                    cropRotateInput.value = 0;
                }
            });
        }
    });


    function updateRotation(val) {
        if (contextTargetItem) {
            contextTargetItem.style.transform = `rotate(${val}deg)`;
            cropRotateSlider.value = val;
            cropRotateInput.value = val;
        }
    }

    cropRotateSlider.addEventListener('input', (e) => {
        updateRotation(e.target.value);
    });
    cropRotateSlider.addEventListener('change', () => {
        saveHistory();
        syncToThumbnail(contextTargetItem);
    });

    cropRotateInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value) || 0;
        if (val > 180) val = 180;
        if (val < -180) val = -180;
        updateRotation(val);
    });
    cropRotateInput.addEventListener('change', () => {
        saveHistory();
        syncToThumbnail(contextTargetItem);
    });

    document.getElementById('crop-opacity-slider').addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('crop-opacity-text').innerText = `${val}%`;
        if (contextTargetItem) {
            contextTargetItem.style.opacity = val / 100;
        }
    });
    document.getElementById('crop-opacity-slider').addEventListener('change', () => {
        saveHistory();
        syncToThumbnail(contextTargetItem);
    });


    document.getElementById('crop-flip-h').addEventListener('click', () => {
        if (cropper) {
            cropper.scaleX(-cropper.getData().scaleX || -1);
            saveHistory();
        }
    });

    document.getElementById('crop-flip-v').addEventListener('click', () => {
        if (cropper) {
            cropper.scaleY(-cropper.getData().scaleY || -1);
            saveHistory();
        }
    });

    document.getElementById('crop-rotate-l').addEventListener('click', () => {
        let current = parseInt(cropRotateInput.value) || 0;
        updateRotation(current - 90);
        saveHistory();
        syncToThumbnail(contextTargetItem);
    });

    document.getElementById('crop-rotate-r').addEventListener('click', () => {
        let current = parseInt(cropRotateInput.value) || 0;
        updateRotation(current + 90);
        saveHistory();
        syncToThumbnail(contextTargetItem);
    });




    aspectItems.forEach(item => {
        item.addEventListener('click', () => {
            aspectItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            if (!cropper) return;
            const ratio = item.getAttribute('data-ratio');
            
            switch(ratio) {
                case 'free': cropper.setAspectRatio(NaN); break;
                case 'original': 
                    cropper.reset(); // Restore the full image size
                    const data = cropper.getImageData();
                    cropper.setAspectRatio(data.naturalWidth / data.naturalHeight);
                    break;
                case '1-1': cropper.setAspectRatio(1); break;
                case '16-9': cropper.setAspectRatio(16/9); break;
                case '9-16': cropper.setAspectRatio(9/16); break;
                case '4-3': cropper.setAspectRatio(4/3); break;
                case '3-4': cropper.setAspectRatio(3/4); break;
                case '3-2': cropper.setAspectRatio(3/2); break;
                case '5-4': cropper.setAspectRatio(5/4); break;
                case '4-5': cropper.setAspectRatio(4/5); break;
            }
        });
    });

    cropDone.addEventListener('click', () => {
        if (cropper) {
            const canvas = cropper.getCroppedCanvas({
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            
            const targetImg = contextTargetItem.querySelector('img');
            if (targetImg) {
                targetImg.src = canvas.toDataURL('image/png');
            }
            
            cropper.destroy();
            cropper = null;
        }
        if (contextTargetItem) {
            contextTargetItem.classList.remove('cropping-active');
        }
        cropPanel.style.display = 'none';
        syncToOriginal();
        syncToThumbnail(contextTargetItem);
        saveHistory();
    });

    cropCancel.addEventListener('click', () => {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        if (contextTargetItem && initialCropState) {
            contextTargetItem.classList.remove('cropping-active');
            // Restore initial state
            contextTargetItem.style.transform = initialCropState.transform;
            contextTargetItem.style.opacity = initialCropState.opacity;
            
            // Sync the visual clone in the editor area if it was changed
            syncToOriginal();
            syncToThumbnail(contextTargetItem);
        }
        cropPanel.style.display = 'none';
    });

    cropClose.addEventListener('click', () => {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        if (contextTargetItem && initialCropState) {
            contextTargetItem.classList.remove('cropping-active');
            // Restore initial state
            contextTargetItem.style.transform = initialCropState.transform;
            contextTargetItem.style.opacity = initialCropState.opacity;
            syncToOriginal();
            syncToThumbnail(contextTargetItem);
        }
        cropPanel.style.display = 'none';
    });




    function startDragging(e, item) {
        if (item.getAttribute('data-locked') === 'true') return;
        e.preventDefault();
        e.stopPropagation();
        
        // Selection
        item.closest('.spread-paper').querySelectorAll('.canvas-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        contextTargetItem = item; // Make it the target for shortcuts

        let startX = e.clientX;
        let startY = e.clientY;
        
        const parent = item.parentElement;
        const parentRect = parent.getBoundingClientRect();
        
        // Get initial positions in percentage using bounding rect
        const rect = item.getBoundingClientRect();
        const initialLeft = ((rect.left - parentRect.left) / parentRect.width) * 100;
        const initialTop = ((rect.top - parentRect.top) / parentRect.height) * 100;

        function onMouseMove(e) {
            const dx = ((e.clientX - startX) / parentRect.width) * 100;
            const dy = ((e.clientY - startY) / parentRect.height) * 100;
            
            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            
            const itemRect = item.getBoundingClientRect();
            const itemWPercent = (itemRect.width / parentRect.width) * 100;
            const itemHPercent = (itemRect.height / parentRect.height) * 100;

            // --- BOUNDARY CONSTRAINTS FOR LOGO PAGES ---
            const spreadWrap = item.closest('.spread-wrap');
            const spreadLabel = spreadWrap ? spreadWrap.querySelector('.spread-label').innerText : '';
            
            if (spreadLabel === 'Page 1') {
                // Must stay on the Right (>= 50%)
                if (newLeft < 50.1) newLeft = 50.1; 
            } else if (spreadLabel === `Page ${totalPages}`) {
                // Must stay on the Left (<= 50%)
                if (newLeft + itemWPercent > 49.9) newLeft = 49.9 - itemWPercent;
            }
            
            // Smart Snapping Threshold (in pixels, converted to %)
            const snapThresholdPx = 8;
            const snapX = (snapThresholdPx / parentRect.width) * 100;
            const snapY = (snapThresholdPx / parentRect.height) * 100;

            // Clear previous guides
            clearGuides(parent);

            // Snapping Targets
            const targetsX = [0, 50 - itemWPercent/2, 100 - itemWPercent]; // Left, Center, Right
            const targetsY = [0, 50 - itemHPercent/2, 100 - itemHPercent]; // Top, Center, Bottom
            
            // Add other elements as targets
            parent.querySelectorAll('.canvas-item').forEach(other => {
                if (other === item) return;
                const oRect = other.getBoundingClientRect();
                const oLeft = ((oRect.left - parentRect.left) / parentRect.width) * 100;
                const oTop = ((oRect.top - parentRect.top) / parentRect.height) * 100;
                const oW = (oRect.width / parentRect.width) * 100;
                const oH = (oRect.height / parentRect.height) * 100;
                
                targetsX.push(oLeft, oLeft + oW/2 - itemWPercent/2, oLeft + oW - itemWPercent);
                targetsY.push(oTop, oTop + oH/2 - itemHPercent/2, oTop + oH - itemHPercent);
            });

            let snappedX = false;
            let snappedY = false;

            // Check X Snapping
            for (let tx of targetsX) {
                if (Math.abs(newLeft - tx) < snapX) {
                    newLeft = tx;
                    snappedX = true;
                    showGuide(parent, 'vertical', tx + (tx === targetsX[1] ? itemWPercent/2 : (tx === targetsX[2] ? itemWPercent : 0)));
                    break;
                }
            }

            // Check Y Snapping
            for (let ty of targetsY) {
                if (Math.abs(newTop - ty) < snapY) {
                    newTop = ty;
                    snappedY = true;
                    showGuide(parent, 'horizontal', ty + (ty === targetsY[1] ? itemHPercent/2 : (ty === targetsY[2] ? itemHPercent : 0)));
                    break;
                }
            }

            if (!snappedX) newLeft = Math.max(-10, Math.min(newLeft, 110 - itemWPercent));
            if (!snappedY) newTop = Math.max(-10, Math.min(newTop, 110 - itemHPercent));

            item.style.left = `${newLeft}%`;
            item.style.top = `${newTop}%`;
            
            syncToOriginal();
            syncToThumbnail(item);
        }

        function showGuide(parent, type, percent) {
            let guide = parent.querySelector(`.smart-guide.${type}[data-pos="${percent}"]`);
            if (!guide) {
                guide = document.createElement('div');
                guide.className = `smart-guide ${type}`;
                guide.setAttribute('data-pos', percent);
                if (type === 'horizontal') guide.style.top = `${percent}%`;
                else guide.style.left = `${percent}%`;
                parent.appendChild(guide);
            }
            guide.style.display = 'block';
        }

        function clearGuides(parent) {
            parent.querySelectorAll('.smart-guide').forEach(g => g.style.display = 'none');
        }

        function onMouseUp() {
            clearGuides(parent);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveHistory();
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    function startResizing(e, item, handle) {
        if (item.getAttribute('data-locked') === 'true') return;
        e.preventDefault();
        e.stopPropagation();

        // Selection
        item.closest('.spread-paper').querySelectorAll('.canvas-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        contextTargetItem = item; // Make it the target for shortcuts

        let startX = e.clientX;
        let startY = e.clientY;
        
        const parent = item.parentElement;
        const parentRect = parent.getBoundingClientRect();
        
        const rect = item.getBoundingClientRect();
        const initialWidth = (rect.width / parentRect.width) * 100;
        const initialHeight = (rect.height / parentRect.height) * 100;
        const initialLeft = ((rect.left - parentRect.left) / parentRect.width) * 100;
        const initialTop = ((rect.top - parentRect.top) / parentRect.height) * 100;

        const isRight = handle.classList.contains('handle-ne') || handle.classList.contains('handle-se') || handle.classList.contains('handle-e');
        const isLeft = handle.classList.contains('handle-nw') || handle.classList.contains('handle-sw') || handle.classList.contains('handle-w');
        const isBottom = handle.classList.contains('handle-sw') || handle.classList.contains('handle-se') || handle.classList.contains('handle-s');
        const isTop = handle.classList.contains('handle-nw') || handle.classList.contains('handle-ne') || handle.classList.contains('handle-n');

        const aspectRatio = initialWidth / initialHeight;

        function onMouseMove(e) {
            const dx = ((e.clientX - startX) / parentRect.width) * 100;
            const dy = ((e.clientY - startY) / parentRect.height) * 100;
            
            let newWidth = initialWidth;
            let newHeight = initialHeight;

            if (isRight || isLeft) {
                if (isRight) newWidth = Math.max(5, initialWidth + dx);
                if (isLeft) {
                    newWidth = Math.max(5, initialWidth - dx);
                    item.style.left = `${initialLeft + (initialWidth - newWidth)}%`;
                }
                newHeight = newWidth / aspectRatio;
                if (isTop) item.style.top = `${initialTop + (initialHeight - newHeight)}%`;
            } else if (isBottom || isTop) {
                if (isBottom) newHeight = Math.max(5, initialHeight + dy);
                if (isTop) {
                    newHeight = Math.max(5, initialHeight - dy);
                    item.style.top = `${initialTop + (initialHeight - newHeight)}%`;
                }
                newWidth = newHeight * aspectRatio;
            }

            item.style.width = `${newWidth}%`;
            item.style.height = `${newHeight}%`;
            
            syncToOriginal();
            syncToThumbnail(item);
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            saveHistory();
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }


    // --- Add saveHistory() calls to all mutation points ---
    // (I will wrap the existing functions or add calls manually)

    function syncToOriginal() {
        if (!currentActiveSpread || !canvaCanvasArea) return;
        const editorSpread = canvaCanvasArea.querySelector('.spread-wrap');
        if (!editorSpread) return;
        
        const currentItems = Array.from(editorSpread.querySelectorAll('.canvas-item'));
        currentItems.forEach((item) => {
            const originalItem = item._linkedOriginalItem;
            if (originalItem) {
                originalItem.style.cssText = item.style.cssText;
                originalItem.classList.toggle('locked', item.classList.contains('locked'));
                
                const editorImg = item.querySelector('.item-img');
                const originalImg = originalItem.querySelector('.item-img');
                if (editorImg && originalImg) {
                    originalImg.style.cssText = editorImg.style.cssText;
                }
            }
        });
    }

    function syncToThumbnail(editorItem) {
        const thumbItem = editorItem._linkedThumbItem;
        if (thumbItem) {
            thumbItem.style.cssText = editorItem.style.cssText;
            
            if (editorImg && thumbImg) {
                thumbImg.style.cssText = editorImg.style.cssText;
            }
        }
    }

    // --- Reset Zoom Logic ---
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    if (zoomResetBtn && canvaZoomSlider && canvaZoomWrapper && canvaZoomText) {
        zoomResetBtn.addEventListener('click', () => {
            let defaultZoom = 100;
            let defaultScale = 0.66;

            if (selectedOrient === 'Landscape') {
                defaultZoom = 150;
                defaultScale = 1.0;
            } else if (selectedOrient === 'Square') {
                defaultZoom = 118;
                defaultScale = 0.78;
            }
            
            canvaZoomSlider.value = defaultZoom;
            canvaZoomText.innerText = defaultZoom + '%';
            canvaZoomWrapper.style.transform = `scale(${defaultScale})`;
            
            // Visual feedback - smooth rotation
            zoomResetBtn.style.transform = 'rotate(-360deg)';
            zoomResetBtn.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                zoomResetBtn.style.transform = '';
                zoomResetBtn.style.transition = '';
            }, 500);
        });
    }
});

