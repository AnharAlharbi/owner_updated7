(function () {

    const MODAL_ID   = 'invoiceModal';
    const CONTENT_ID = 'modalContent';

    async function fetchElectricityBills() {
        try {
            const res = await fetch('php/electricity_api.php?action=list');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.warn('electricity_home: فشل جلب الفواتير', e);
            return [];
        }
    }

    function buildCard(bill) {
        const lang   = localStorage.getItem('lang') || 'en';
        const isAr   = lang === 'ar';
        const label  = 'Electricity Bill';
        const price  = bill.actual_price ?? 0;
        const priceF = parseFloat(price).toFixed(2);
        const date   = bill.date || '';
        const btnTxt = isAr ? 'فتح' : 'Open';

        return `
        <div class="elec-card" data-bill-id="${bill.id}" style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            background:#fff;
            border-radius:16px;
            padding:16px 20px;
            margin-bottom:12px;
            box-shadow:0 2px 10px rgba(0,0,0,0.07);
        ">
            <div style="display:flex; align-items:center; gap:14px;">
                <i class="fa-solid fa-bolt" style="color:#7d9e84; font-size:22px;"></i>
                <div>
                    <div style="font-weight:700; font-size:15px; color:#7d9e84;">${label}</div>
                    <div style="font-size:12px; color:#a1aeb8; margin-top:3px;">${date}</div>
                    <div style="font-size:11px; color:#a1aeb8; margin-top:2px;">${bill.quantity} ${bill.unit_label || 'kWh'}</div>
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:700; color:#2c3e50; margin-bottom:8px; font-size:15px;">${priceF} SAR</div>
                <button onclick="openElecBill(${bill.id})" style="
                    background:#7d9e84;
                    color:#fff;
                    border:none;
                    border-radius:20px;
                    padding:6px 18px;
                    font-size:13px;
                    font-weight:600;
                    cursor:pointer;
                ">${btnTxt}</button>
            </div>
        </div>`;
    }

    function renderElecBills(bills, container) {
        if (!bills.length) return;

        const old = document.getElementById('elecSection');
        if (old) old.remove();

        const wrapper = document.createElement('div');
        wrapper.id = 'elecSection';
        wrapper.style.cssText = 'padding: 0 20px 20px;';
        wrapper.innerHTML = `
            <div style="font-weight:800; color:#7d9e84; margin:20px 0 12px; font-size:16px;">
                <i class="fa-solid fa-bolt"></i> Electricity Bills
            </div>
            ${bills.map(buildCard).join('')}
        `;
        container.appendChild(wrapper);
    }

    window.openElecBill = async function (id) {
        const modal   = document.getElementById(MODAL_ID);
        const content = document.getElementById(CONTENT_ID);
        if (!modal || !content) return;

        modal.classList.add('show');
        content.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i><p>Loading...</p></div>';

        try {
            const res  = await fetch(`php/electricity_api.php?bill_id=${id}`);
            const bill = await res.json();

            if (bill.error) { content.innerHTML = bill.error; return; }

            const lang = localStorage.getItem('lang') || 'en';
            const isAr = lang === 'ar';

            const actual = bill.actual_price != null ? parseFloat(bill.actual_price).toFixed(2) : '—';
            const qty    = bill.quantity + ' ' + (bill.unit_label || 'kWh');
            const num    = '#ELEC-' + String(bill.id).padStart(6, '0');

            content.innerHTML = `
            <div id="invoice-printable" style="font-family:sans-serif; direction:${isAr?'rtl':'ltr'};">
                <div style="text-align:center; margin-bottom:15px;">
                    <i class="fa-solid fa-bolt" style="font-size:32px; color:#7d9e84;"></i>
                    <h3 style="color:#7d9e84; margin:6px 0 2px;">Electricity Bill</h3>
                    <small style="color:#95a5a6;">${num}</small>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:14px;">
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px; color:#95a5a6;">${isAr?'التاريخ':'Date'}</td>
                        <td style="padding:10px; font-weight:700; text-align:${isAr?'left':'right'};">${bill.date}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px; color:#95a5a6;">${isAr?'الشهر':'Month'}</td>
                        <td style="padding:10px; font-weight:700; text-align:${isAr?'left':'right'};">${bill.month}</td>
                    </tr>
                    <tr style="border-bottom:1px solid #eee;">
                        <td style="padding:10px; color:#95a5a6;">${isAr?'الاستهلاك':'Consumption'}</td>
                        <td style="padding:10px; font-weight:700; text-align:${isAr?'left':'right'};">${qty}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; color:#95a5a6;">${isAr?'السعر الفعلي':'Actual Price'}</td>
                        <td style="padding:10px; font-weight:700; color:#7d9e84; text-align:${isAr?'left':'right'};">${actual} SAR</td>
                    </tr>
                </table>
            </div>

            <button class="modal-print-btn" onclick="downloadElecPdfFromModal('${num}', ${bill.id}, '${bill.date}', '${bill.month}', '${qty}', '${actual}')">
                <i class="fas fa-download"></i> Download PDF
            </button>`;

        } catch (e) {
            content.innerHTML = '<p style="color:red;text-align:center;">خطأ في التحميل</p>';
        }
    };

    window.downloadElecPdfFromModal = function(invoiceNum, id, date, month, qty, actual) {
        if (!window.jspdf) return;
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
        doc.text(invoiceNum, W/2, y+16, { align:'center' });
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

    function filterElecBills(bills, query) {
        if (!query) return bills;
        const q = query.toLowerCase();
        const isMatchName = 'electricity bill'.includes(q) ||
                            'كهرباء'.includes(q) ||
                            'electricity'.includes(q) ||
                            'فاتورة'.includes(q);
        return isMatchName ? bills : [];
    }

    let allElecBills = [];

    async function init() {
        const container = document.querySelector('.main-wrapper');
        if (!container) return;

        allElecBills = await fetchElectricityBills();
        if (allElecBills.length) {
            renderElecBills(allElecBills, container);
        }

        const searchInp = document.getElementById('searchInput');
        if (searchInp) {
            searchInp.addEventListener('input', () => {
                const q       = searchInp.value;
                const section = document.getElementById('elecSection');
                if (!section) return;
                const filtered = filterElecBills(allElecBills, q);
                section.style.display = filtered.length || !q ? '' : 'none';
                if (filtered.length) {
                    const heading = section.querySelector('div:first-child');
                    section.innerHTML = '';
                    section.appendChild(heading);
                    filtered.forEach(b => section.insertAdjacentHTML('beforeend', buildCard(b)));
                }
            });
        }
    }

    window.addEventListener('load', function () {
        let attempts = 0;
        function tryInit() {
            const container = document.querySelector('.main-wrapper');
            if (container && (container.children.length > 0 || attempts > 20)) {
                init();
            } else {
                attempts++;
                setTimeout(tryInit, 200);
            }
        }
        tryInit();
    });

})();