document.addEventListener('DOMContentLoaded', () => {
    fetchOwnerInvoices();
    fetchElectricityBills();

    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();

            const rows = document.querySelectorAll('#ownerInvoicesBody tr');
            rows.forEach(row => {
                const clientName = row.children[1].textContent.toLowerCase();
                const invoiceId  = row.children[0].textContent.toLowerCase();
                row.style.display = (clientName.includes(term) || invoiceId.includes(term)) ? '' : 'none';
            });

            const elecRows = document.querySelectorAll('#elecBillsBody tr');
            elecRows.forEach(row => {
                const month = row.children[0].textContent.toLowerCase();
                const date  = row.children[1].textContent.toLowerCase();
                row.style.display = (month.includes(term) || date.includes(term) || 'كهرباء'.includes(term) || 'electricity'.includes(term)) ? '' : 'none';
            });
        });
    }
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

async function fetchOwnerInvoices() {
    try {
        const response = await fetch('php/owner_api.php');
        const data = await response.json();
        if (data.error === "no_session") { window.location.href = "login.html"; return; }
        const tbody = document.getElementById('ownerInvoicesBody');
        tbody.innerHTML = '';
        data.forEach(inv => {
            tbody.innerHTML += `
                <tr>
                    <td>${inv.display_id}</td>
                    <td>${inv.client}</td>
                    <td>${inv.amount} SAR</td>
                    <td><button class="open-btn" onclick="openInvoiceModal(${inv.real_id})">Open</button></td>
                </tr>`;
        });
    } catch (err) { console.error("Error:", err); }
}

async function openInvoiceModal(invoiceId) {
    const modal   = document.getElementById('invoiceModal');
    const content = document.getElementById('modalContent');
    modal.classList.add('show');
    content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i><p>Loading invoice...</p></div>';

    try {
        const res   = await fetch(`php/owner_api.php?details_id=${invoiceId}`);
        const data  = await res.json();
        const info  = data.info;
        const items = data.items || [];

        const dateStr = info.invoice_date || '';
        const dayStr  = info.invoice_day  || '';
        const timeStr = info.invoice_time  || '';

        const itemsHtml = items.length > 0
            ? items.map(item => `
                <div class="inv-item-row">
                    <div>
                        <div class="inv-item-name">${item.product_name}</div>
                        <div class="inv-item-qty">Qty: ${item.quantity}</div>
                    </div>
                    <div class="inv-item-price">${parseFloat(item.subtotal).toFixed(2)} SAR</div>
                </div>`).join('')
            : '<p style="color:#ccc; text-align:center; padding:15px;">No items found</p>';

        const invNum = 'INV-' + (1000 + parseInt(info.invoice_id));

        content.innerHTML = `
            <div id="invoice-printable">
                <div class="inv-title">TAX INVOICE</div>
                <div class="inv-subtitle">${invNum}</div>

                <div style="text-align:center; margin-bottom:20px; font-size:13px; color:#a1aeb8;">
                    ${dateStr}
                    ${dayStr  ? ` &nbsp;·&nbsp; <i class="fas fa-calendar-day"></i> ${dayStr}`  : ''}
                    ${timeStr ? ` &nbsp;·&nbsp; <i class="fas fa-clock"></i> ${timeStr}` : ''}
                </div>

                <div class="inv-info-grid">
                    <div class="inv-info-block">
                        <p><strong>Customer:</strong> ${info.First_name} ${info.Last_name}</p>
                        <p><strong>Payment:</strong> ${info.payment_method || '—'}</p>
                    </div>
                </div>

                <hr class="inv-divider">

                <div>${itemsHtml}</div>

                <div class="inv-total-row">
                    <div class="inv-total-label">TOTAL</div>
                    <div class="inv-total-value">${parseFloat(info.total_amount).toFixed(2)} SAR</div>
                </div>
            </div>

            <button class="modal-print-btn" onclick="downloadPdf('${invNum}')">
                <i class="fas fa-download"></i> Download PDF
            </button>
        `;
    } catch (err) {
        content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h2>Error loading invoice</h2></div>';
    }
}

function closeModal() {
    document.getElementById('invoiceModal').classList.remove('show');
}

function downloadPdf(filename) {
    const element = document.getElementById('invoice-printable');
    html2pdf().from(element).set({
        margin: [0.5, 0.5],
        filename: filename + '.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4' }
    }).save();
}


async function fetchElectricityBills() {
    try {
        const res  = await fetch('php/electricity_api.php?action=list');
        const data = await res.json();

        const tbody = document.getElementById('elecBillsBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#a1aeb8; padding:20px;">No electricity bills found</td></tr>`;
            return;
        }

        data.forEach(bill => {
            tbody.innerHTML += `
                <tr>
                    <td>${bill.month || '—'}</td>
                    <td>${bill.date  || '—'}</td>
                    <td>${parseFloat(bill.actual_price || 0).toFixed(2)} SAR</td>
                    <td><button class="open-btn" onclick="openElecModal(${bill.id})">Open</button></td>
                </tr>`;
        });
    } catch (err) { console.error("Electricity fetch error:", err); }
}

async function openElecModal(billId) {
    const modal   = document.getElementById('invoiceModal');
    const content = document.getElementById('modalContent');
    modal.classList.add('show');
    content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i><p>Loading...</p></div>';

    try {
        const res  = await fetch(`php/electricity_api.php?bill_id=${billId}`);
        const bill = await res.json();

        if (bill.error) { content.innerHTML = `<p style="color:red;text-align:center;padding:20px;">${bill.error}</p>`; return; }

        content.innerHTML = `
            <div id="invoice-printable">
                <div class="inv-title">⚡ ELECTRICITY BILL</div>
                <div class="inv-subtitle">#${String(bill.id).padStart(6,'0')}</div>

                <div style="text-align:center; margin-bottom:20px; font-size:13px; color:#a1aeb8;">
                    ${bill.date || ''} &nbsp;·&nbsp; ${bill.month || ''}
                </div>

                <hr class="inv-divider">

                <div class="inv-item-row">
                    <div>
                        <div class="inv-item-name">Electricity Consumption</div>
                        <div class="inv-item-qty">${bill.quantity || 0} ${bill.unit_label || 'kWh'}</div>
                    </div>
                    <div class="inv-item-price">${parseFloat(bill.actual_price || 0).toFixed(2)} SAR</div>
                </div>

                <div class="inv-total-row" style="margin-top:20px;">
                    <div class="inv-total-label">TOTAL</div>
                    <div class="inv-total-value">${parseFloat(bill.actual_price || 0).toFixed(2)} SAR</div>
                </div>
            </div>

            <button class="modal-print-btn" onclick="downloadPdf('ELEC-${String(bill.id).padStart(6,'0')}')">
                <i class="fas fa-download"></i> Download PDF
            </button>
        `;
    } catch (err) {
        content.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h2>Error loading bill</h2></div>';
    }
}