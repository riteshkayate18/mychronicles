// Admin Dashboard Logic for MyChronicles
import { auth, db } from "./firebase-config.js";
import { 
    collection, 
    onSnapshot, 
    doc, 
    updateDoc, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const orderList = document.getElementById('order-list');
    const totalOrdersEl = document.getElementById('total-orders');
    const pendingOrdersEl = document.getElementById('pending-orders');
    const printingOrdersEl = document.getElementById('printing-orders');
    const revenueEl = document.getElementById('revenue');

    // Security Check (Simple for now, can be hardened with Custom Claims)
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        document.getElementById('admin-email').innerText = user.email;
    });

    // Listen for Orders
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    
    onSnapshot(ordersQuery, (snapshot) => {
        orderList.innerHTML = '';
        let total = 0;
        let pending = 0;
        let printing = 0;
        let revTotal = 0;

        snapshot.forEach((docSnap) => {
            const order = docSnap.data();
            const id = docSnap.id;
            
            total++;
            if (order.status === 'Pending') pending++;
            if (order.status === 'Printing') printing++;
            revTotal += 999; // Assume flat price for now

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code style="color:var(--primary);">${order.orderId}</code></td>
                <td>${order.userEmail}</td>
                <td style="font-weight:600;">${order.title}</td>
                <td><span style="font-size:0.8rem; background:#334155; padding:2px 8px; border-radius:4px;">${order.orientation}</span></td>
                <td>
                    <select class="status-select" data-id="${id}" style="background:none; border:1px solid var(--admin-border); color:white; padding:4px 8px; border-radius:6px; cursor:pointer;">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Printing" ${order.status === 'Printing' ? 'selected' : ''}>Printing</option>
                        <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                    </select>
                </td>
                <td style="color:#64748b; font-size:0.8rem;">${order.createdAt?.toDate().toLocaleDateString() || 'Just now'}</td>
                <td>
                    <button class="view-btn" onclick="window.previewOrder('${id}')">
                        <i class="ph ph-eye"></i> View
                    </button>
                </td>
            `;
            orderList.appendChild(tr);
        });

        // Update Stats
        totalOrdersEl.innerText = total;
        pendingOrdersEl.innerText = pending;
        printingOrdersEl.innerText = printing;
        revenueEl.innerText = `₹${revTotal}`;

        // Bind status changes
        document.querySelectorAll('.status-select').forEach(select => {
            select.onchange = async (e) => {
                const orderDocId = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                try {
                    await updateDoc(doc(db, "orders", orderDocId), { status: newStatus });
                } catch (err) {
                    alert("Error updating status: " + err.message);
                }
            };
        });
    });

    // Global Preview Function
    window.previewOrder = async (docId) => {
        const modal = document.getElementById('order-modal');
        const previewArea = document.getElementById('preview-area');
        
        // Find order in local cache (or fetch from db)
        onSnapshot(doc(db, "orders", docId), (docSnap) => {
            if (!docSnap.exists()) return;
            const order = docSnap.data();
            
            modal.style.display = 'flex';
            document.getElementById('modal-title').innerText = `Preview: ${order.title} (${order.orderId})`;
            
            // Render the captured HTML
            previewArea.innerHTML = order.content.html;
            
            // Apply scale to fit preview
            previewArea.style.transform = 'scale(0.5)';
            previewArea.style.transformOrigin = 'top left';
            previewArea.style.width = '200%';
            previewArea.style.height = '200%';
        });
    };
});
