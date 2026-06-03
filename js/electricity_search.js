

(function () {

    async function fetchElecBills() {
        try {
            const res = await fetch('php/electricity_api.php?action=list');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.warn('electricity_search:', e);
            return [];
        }
    }

    function buildElecCard(bill) {
        const price   = parseFloat(bill.actual_price ?? 0).toFixed(2);
        const date    = bill.date || '';
        const openTxt = (typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_card_open') : 'Open';

        return `
        <div class="invoice-card" onclick="openElecBillSearch(${bill.id})">
            <div class="card-col">
                <div class="card-col-label"># Invoice</div>
                <div class="card-col-value" style="color:#7d9e84;">
                    <i class="fa-solid fa-bolt" style="margin-right:4px;"></i>ELEC
                </div>
            </div>
            <div class="card-col">
                <div class="card-col-label">Type</div>
                <div class="card-col-value">Electricity Bill</div>
            </div>
            <div class="card-col" style="min-width:140px;">
                <div class="card-col-label">Date</div>
                <div class="card-col-value">${date}</div>
                <div class="card-col-sub">${bill.month || ''}</div>
            </div>
            <div class="card-col">
                <div class="card-col-label">Amount</div>
                <div class="card-col-value">${price} SAR</div>
            </div>
            <div>
                <button class="open-badge" onclick="event.stopPropagation(); openElecBillSearch(${bill.id})">
                    ${openTxt}
                </button>
            </div>
        </div>`;
    }

    function filterElecBills(bills) {
        const searchTerm = (document.getElementById('searchInp')?.value || '').toLowerCase().trim();
        const dateFilter = document.getElementById('dateFilter')?.value  || 'all_time';
        const payFilter  = document.getElementById('paymentFilter')?.value || 'all_methods';
        const minRaw     = document.getElementById('minRange')?.value;
        const maxRaw     = document.getElementById('maxRange')?.value;
        const minAmt     = minRaw !== '' && minRaw != null ? parseFloat(minRaw) : 0;
        const maxAmt     = maxRaw !== '' && maxRaw != null ? parseFloat(maxRaw) : Infinity;

        if (payFilter !== 'all_methods' && payFilter !== 'electricity') return [];

        const today    = new Date();
        const weekAgo  = new Date(); weekAgo.setDate(today.getDate() - 7);
        const monthAgo = new Date(); monthAgo.setMonth(today.getMonth() - 1);

        return bills.filter(bill => {
            const price     = parseFloat(bill.actual_price ?? 0);
            const matchAmt  = price >= minAmt && price <= maxAmt;
            const matchSrch = !searchTerm ||
                (bill.month || '').toLowerCase().includes(searchTerm) ||
                (bill.date  || '').toLowerCase().includes(searchTerm) ||
                'electricity'.includes(searchTerm) ||
                'electricity bill'.includes(searchTerm) ||
                'كهرباء'.includes(searchTerm);

            let matchDate = true;
            if (bill.date) {
                const d = new Date(bill.date);
                if (dateFilter === 'this_week')  matchDate = d >= weekAgo  && d <= today;
                if (dateFilter === 'this_month') matchDate = d >= monthAgo && d <= today;
            }

            return matchSrch && matchAmt && matchDate;
        });
    }

    function mergeAndRender(regularList, elecBills) {
        const container = document.getElementById('searchResultsContainer');
        const countEl   = document.getElementById('resultsCount');
        if (!container) return;

        const regularItems = regularList.map(i => ({ type: 'regular', date: i.invoice_date || '', data: i }));
        const elecItems    = elecBills.map(b  => ({ type: 'elec',    date: b.date         || '', data: b }));
        const merged = [...regularItems, ...elecItems].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (!merged.length) {
            if (countEl) countEl.textContent = '';
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-invoice"></i>
                    <h2>${(typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_no_results_title') : 'No results'}</h2>
                    <p>${(typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_no_results_sub') : ''}</p>
                </div>`;
            return;
        }

        const total = merged.length;
        if (countEl) {
            countEl.textContent = `${total} ${total !== 1
                ? ((typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_found_many') : 'invoices found')
                : ((typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_found_one')  : 'invoice found')}`;
        }

        container.innerHTML = merged.map(item => {
            if (item.type === 'elec') return buildElecCard(item.data);

            const inv = item.data;
            const hasDate     = inv.invoice_date && inv.invoice_date !== '';
            const dateDisplay = hasDate
                ? `<div class="card-col-value">${inv.invoice_date}</div>
                   <div class="card-col-sub">
                       ${inv.invoice_day  ? `<i class="fas fa-calendar-day"></i> ${inv.invoice_day}`  : ''}
                       ${inv.invoice_time ? `&nbsp;&nbsp;<i class="fas fa-clock"></i> ${inv.invoice_time}` : ''}
                   </div>`
                : `<div class="card-col-value">—</div>`;

            const openTxt = (typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_card_open') : 'Open';
            return `
            <div class="invoice-card" onclick="openModal(${inv.real_id})">
                <div class="card-col">
                    <div class="card-col-label">${(typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_card_invoice') : '# Invoice'}</div>
                    <div class="card-col-value">${inv.display_id}</div>
                </div>
                <div class="card-col">
                    <div class="card-col-label">${(typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_card_client') : 'Client'}</div>
                    <div class="card-col-value">${inv.client}</div>
                </div>
                <div class="card-col" style="min-width:140px;">
                    <div class="card-col-label">${(typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_card_date') : 'Date'}</div>
                    ${dateDisplay}
                </div>
                <div class="card-col">
                    <div class="card-col-label">${(typeof SettingsManager !== 'undefined') ? SettingsManager.getT('srch_card_amount') : 'Amount'}</div>
                    <div class="card-col-value">${inv.amount} SAR</div>
                </div>
                <div>
                    <button class="open-badge" onclick="event.stopPropagation(); openModal(${inv.real_id})">
                        ${openTxt}
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    window.openElecBillSearch = async function (id) {
        const modal   = document.getElementById('invoiceModal');
        const content = document.getElementById('modalContent');
        if (!modal || !content) return;

        modal.classList.add('show');
        content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i><p>Loading...</p></div>';

        try {
            const res  = await fetch(`php/electricity_api.php?bill_id=${id}`);
            const bill = await res.json();
            if (bill.error) { content.innerHTML = bill.error; return; }

            const lang   = localStorage.getItem('lang') || 'en';
            const isAr   = lang === 'ar';
            const actual = bill.actual_price != null ? parseFloat(bill.actual_price).toFixed(2) : '—';
            const qty    = bill.quantity + ' ' + (bill.unit_label || 'kWh');
            const num    = '#ELEC-' + String(bill.id).padStart(6, '0');

            content.innerHTML = `
            <div id="invoice-printable">
                <div style="text-align:center; margin-bottom:15px;">
                    <i class="fa-solid fa-bolt" style="font-size:32px; color:#7d9e84;"></i>
                    <div class="inv-title" style="color:#7d9e84; margin-top:8px;">ELECTRICITY BILL</div>
                    <div class="inv-subtitle">${num}</div>
                </div>

                <div style="background:#f8f9fa; border-radius:10px; padding:14px; margin-bottom:16px; font-size:13px;">
                    <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee;">
                        <span style="color:#888;">${isAr?'التاريخ':'Date'}</span>
                        <span style="font-weight:700;">${bill.date}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee;">
                        <span style="color:#888;">${isAr?'الشهر':'Month'}</span>
                        <span style="font-weight:700;">${bill.month}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:6px 0;">
                        <span style="color:#888;">${isAr?'الاستهلاك':'Consumption'}</span>
                        <span style="font-weight:700;">${qty}</span>
                    </div>
                </div>

                <div class="inv-total-row">
                    <div class="inv-total-label">${isAr?'السعر الفعلي':'Actual Price'}</div>
                    <div class="inv-total-value">${actual} SAR</div>
                </div>
            </div>

            <button class="modal-print-btn" onclick="downloadElecPdfSearch(${bill.id}, '${num}', '${bill.date}', '${bill.month}', '${qty}', '${actual}')">
                <i class="fas fa-download"></i> Download PDF
            </button>`;

        } catch (e) {
            content.innerHTML = '<p style="color:red;text-align:center;">خطأ في التحميل</p>';
        }
    };

    window.downloadElecPdfSearch = function(id, num, date, month, qty, actual) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const W = 210, margin = 18;
        let y = 20;
        const green  = [118, 147, 124];
        const navy   = [44,  62,  80];
        const gray   = [120, 120, 120];
        const ltgray = [220, 220, 220];

        function drawLine(color) {
            doc.setDrawColor(color[0], color[1], color[2]);
            doc.setLineWidth(0.3);
            doc.line(margin, y, W - margin, y);
            y += 5;
        }
        function drawText(str, x, size, color, align) {
            doc.setFontSize(size || 11);
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(String(str || ''), x, y, { align: align || 'left' });
        }
        function row2(left, right, size, colorL, colorR) {
            drawText(left,  margin,     size || 10, colorL || gray);
            drawText(right, W - margin, size || 10, colorR || navy, 'right');
            y += 6;
        }

        /* ── Header ── */
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(margin, y, W - margin*2, 22, 4, 4, 'F');
        doc.setFontSize(16); doc.setTextColor(255, 255, 255);
        doc.text('ELECTRICITY BILL', W/2, y+9, { align:'center' });
        doc.setFontSize(10);
        doc.text(num, W/2, y+16, { align:'center' });
        y += 30;

        /* ── Date ── */
        doc.setFontSize(9); doc.setTextColor(gray[0], gray[1], gray[2]);
        doc.text(date, W/2, y, { align:'center' });
        y += 10;

        drawLine(ltgray);

        /* ── Details ── */
        row2('Date:',        date,  10, gray, navy);
        row2('Month:',       month, 10, gray, navy);
        row2('Consumption:', qty,   10, gray, navy);

        drawLine(ltgray);
        y += 2;

        /* ── Total ── */
        doc.setFillColor(green[0], green[1], green[2]);
        doc.roundedRect(margin, y, W - margin*2, 12, 3, 3, 'F');
        doc.setFontSize(13); doc.setTextColor(255, 255, 255);
        doc.text('Actual Price:', margin+5, y+8);
        doc.text(actual + ' SAR', W-margin-5, y+8, { align:'right' });
        y += 20;

        /* ── Footer ── */
        doc.setFontSize(8); doc.setTextColor(gray[0], gray[1], gray[2]);
        doc.text('Spending Journey', W/2, y, { align:'center' });

        doc.save(`electricity-bill-${id}.pdf`);
    };

    let allElecBills = [];

    async function init() {
        allElecBills = await fetchElecBills();

        const origRender = window.renderInvoices;
        window.renderInvoices = function(list) {
            const filtered = filterElecBills(allElecBills);
            mergeAndRender(list, filtered);
        };

        window.renderInvoices(window.allInvoices || []);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 500);
    }
})();