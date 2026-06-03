let ownerInvoices = [];

document.addEventListener("DOMContentLoaded", () => {
    loadInvoices();
    document.getElementById('searchInp').addEventListener('input', filterInvoices);
});

async function loadInvoices() {
    try {
        const res = await fetch("php/owner_api.php"); 
        const data = await res.json();
        
        if (data.error) {
            console.error("Error:", data.error);
            return;
        }
        
        ownerInvoices = data; 
        renderInvoices(ownerInvoices);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

function renderInvoices(list) {
    const container = document.getElementById('searchResultsContainer');
    container.innerHTML = list.map(inv => `
        <div class="card" onclick="viewDetails(${inv.invoice_id})" style="cursor:pointer; background:#fff; border-radius:15px; padding:20px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <div style="flex:1;">
                <div style="color:#a1aeb8; font-size:12px; font-weight:600;"># Invoice</div>
                <div style="color:#2c3e50; font-weight:700;">INV-${inv.invoice_id.toString().padStart(4, '0')}</div>
            </div>
            <div style="flex:1;">
                <div style="color:#a1aeb8; font-size:12px; font-weight:600;">Client Name</div>
                <div style="color:#2c3e50; font-weight:600;">${inv.First_name} ${inv.Last_name}</div>
            </div>
            <div style="flex:1; text-align:center;">
                <div style="color:#a1aeb8; font-size:12px; font-weight:600;">Amount</div>
                <div style="color:#2c3e50; font-weight:700;">${parseFloat(inv.total_amount).toFixed(2)} SAR</div>
            </div>
            <div style="flex:0.5; text-align:right;">
                <span style="background:#7d9e84; color:#fff; padding:4px 12px; border-radius:8px; font-size:11px;">Open</span>
            </div>
        </div>
    `).join('');
}

function filterInvoices() {
    const term = document.getElementById('searchInp').value.toLowerCase();
    const filtered = ownerInvoices.filter(inv => 
        inv.First_name.toLowerCase().includes(term) || 
        inv.Last_name.toLowerCase().includes(term) ||
        inv.invoice_id.toString().includes(term)
    );
    renderInvoices(filtered);
}