let ownerInvoices = [];
let currentMonth = "";
let aiOwnerRecommendations = [];
let currentOwnerId = null;

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const paymentColors = { Cash: "#76937C", Mada: "#4F8F67", Installments: "#E5B85C", "Apple Pay": "#1A2634" };
const chartColors = ["#76937C", "#5F7F67", "#A8BDA7", "#E5B85C", "#D98B6A", "#6C8A78"];

const USE_DEMO_INVOICES = false;
const demoOwnerInvoices = [];

// Analytics API base URL
const ANALYTICS_API = "http://localhost:8000";

async function getOwnerIdFromSession() {
  try {
    const res = await fetch("php/get_owner_session.php");
    if (res.ok) {
      const data = await res.json();
      return data.owner_id || null;
    }
  } catch (e) {
    console.warn("Could not fetch owner session:", e);
  }
  return null;
}

async function loadOwnerInvoices() {
  // Get owner_id from session first
  currentOwnerId = await getOwnerIdFromSession();
  console.log("Analytics loading for owner_id:", currentOwnerId);

  try {
    const ownerParam = currentOwnerId ? `owner_id=${currentOwnerId}` : "";
    const apiRes = await fetch(`${ANALYTICS_API}/api/invoices?${ownerParam}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      ownerInvoices = Array.isArray(data) && data.length ? data : (USE_DEMO_INVOICES ? demoOwnerInvoices : []);
    } else {
      throw new Error(`analytics_api: HTTP ${apiRes.status}`);
    }
  } catch (apiErr) {
    console.warn("analytics_api.py not available, trying PHP...", apiErr);
    try {
      const response = await fetch("php/owner_api.php?action=list");
      if (!response.ok) throw new Error("Could not load owner invoices");
      const data = await response.json();
      ownerInvoices = Array.isArray(data) && data.length ? data : (USE_DEMO_INVOICES ? demoOwnerInvoices : []);
    } catch (error) {
      console.warn("Database not available.", error);
      ownerInvoices = USE_DEMO_INVOICES ? demoOwnerInvoices : [];
    }
  }

  const currentDate = new Date();
  const defaultMonth = months[currentDate.getMonth()];
  currentMonth = defaultMonth;
  
  document.getElementById("selectedMonth").textContent = currentMonth;
  document.querySelectorAll(".month-grid div").forEach((item) => {
    const itemMonth = months.find((m) => m.slice(0, 3).toLowerCase() === item.textContent.trim().toLowerCase());
    item.classList.toggle("active-month", itemMonth === currentMonth);
  });

  renderOwnerAnalysis();
  runOwnerAnalysisTests();
  loadRevenueTarget();
}

window.toggleMonths = function toggleMonths() {
  const wrapper = document.querySelector(".month-wrapper");
  const list = document.getElementById("monthList");
  const isOpen = list.style.display === "block";

  list.style.display = isOpen ? "none" : "block";
  wrapper.classList.toggle("active", !isOpen);
};

window.selectMonth = function selectMonth(month) {
  currentMonth = month;

  document.getElementById("selectedMonth").textContent = month;
  document.getElementById("monthList").style.display = "none";
  document.querySelector(".month-wrapper").classList.remove("active");

  document.querySelectorAll(".month-grid div").forEach((item) => {
    const itemMonth = months.find((m) => m.slice(0, 3).toLowerCase() === item.textContent.trim().toLowerCase());
    item.classList.toggle("active-month", itemMonth === month);
  });

  renderOwnerAnalysis();
  loadChart();
};

document.addEventListener("click", function (event) {
  const wrapper = document.querySelector(".month-wrapper");
  if (wrapper && !wrapper.contains(event.target)) {
    document.getElementById("monthList").style.display = "none";
    wrapper.classList.remove("active");
  }
});

window.toggleTooltip = function toggleTooltip(id) {
  const tooltip = document.getElementById(id);
  if (!tooltip) return;

  document.querySelectorAll(".tooltip").forEach((tip) => {
    if (tip.id !== id) tip.style.display = "none";
  });

  tooltip.style.display = tooltip.style.display === "block" ? "none" : "block";
};

function renderOwnerAnalysis() {
  if (!currentMonth) {
    renderEmptyState();
    return;
  }

  const monthInvoices = ownerInvoices.filter((invoice) => getInvoiceMonth(invoice) === currentMonth);
  const totalRevenue = monthInvoices.reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0);
  const totalInvoices = monthInvoices.length;
  const avgOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  // Check if there is data for this month
  const hasData = totalInvoices > 0;

  if (hasData) {
    // Show actual data
    document.getElementById("totalRevenue").textContent = formatNumber(totalRevenue);
    document.getElementById("totalInvoices").textContent = totalInvoices;
    document.getElementById("avgOrderValue").textContent = formatNumber(avgOrderValue);
    
    // Render all cards with data
    updateRevenueTarget();
    renderPaymentDistribution(monthInvoices);
    renderTopSellingItems(monthInvoices);
    renderRevenueTrend();
    renderBreakdown(monthInvoices);
    renderRecommendations(monthInvoices);
  } else {
    // Show "No Data" message for empty months
    document.getElementById("totalRevenue").textContent = "—";
    document.getElementById("totalInvoices").textContent = "—";
    document.getElementById("avgOrderValue").textContent = "—";
    
    // Reset target bar
    const fill = document.getElementById("targetFill");
    const text = document.getElementById("targetText");
    if (fill) fill.style.width = "0%";
    if (text) text.innerHTML = "No revenue data for this month";
    
    // Show empty messages for all cards
    document.getElementById("topSellingItems").innerHTML = '<div class="empty-note">No sales data for this month</div>';
    document.getElementById("recommendations").innerHTML = '<div class="empty-note">No invoice data available for this month</div>';
    document.getElementById("breakdownList").innerHTML = '<div class="empty-note">No product data for this month</div>';
    document.getElementById("paymentLegend").innerHTML = '<div class="empty-note">No payment data for this month</div>';
    
    // Render Trend anyway to show the bars up to this empty month
    renderRevenueTrend();
    
    // Clear canvases
    clearCanvas("paymentPie");
    clearCanvas("breakdownDonut");
  }
  
  // Always load chart 
  loadChart();
}

function renderEmptyState() {
  document.getElementById("totalRevenue").textContent = "—";
  document.getElementById("totalInvoices").textContent = "—";
  document.getElementById("avgOrderValue").textContent = "—";
  document.getElementById("targetFill").style.width = "0%";
  document.getElementById("targetText").innerHTML = "Remaining to target: 0 SAR";
  document.getElementById("topSellingItems").innerHTML = '<div class="empty-note">No data yet</div>';
  document.getElementById("recommendations").innerHTML = '<div class="empty-note">AI recommendations will appear after choosing a month.</div>';
  document.getElementById("breakdownList").innerHTML = "";
  document.getElementById("paymentLegend").innerHTML = "";
  clearCanvas("paymentPie");
  clearCanvas("breakdownDonut");
  showEmptyHistogram("No data available");
}

function getInvoiceAmount(invoice) {
  return Number(invoice.total || invoice.total_amount || invoice.amount || invoice.price || invoice.revenue || 0);
}

function getInvoiceMonth(invoice) {
  if (invoice.month) return normalizeMonth(invoice.month);
  const dateValue = invoice.date || invoice.invoice_date || invoice.created_at || invoice.createdAt;
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";
  return months[date.getMonth()];
}

function normalizeMonth(monthValue) {
  const value = String(monthValue || "").trim();
  const fullIndex = months.findIndex((month) => month.toLowerCase() === value.toLowerCase());
  if (fullIndex >= 0) return months[fullIndex];
  const shortIndex = months.findIndex((month) => month.slice(0, 3).toLowerCase() === value.toLowerCase());
  if (shortIndex >= 0) return months[shortIndex];
  return value;
}

function getPaymentMethod(invoice) {
  const method = String(invoice.payment_method || invoice.payment || invoice.method || "Cash").toLowerCase();
  if (method.includes("apple")) return "Apple Pay";
  if (method.includes("mada") || method.includes("card") || method.includes("network")) return "Mada";
  if (method.includes("install")) return "Installments";
  return "Cash";
}

function getItemName(invoice) {
  return invoice.product_name || invoice.item_name || invoice.name || invoice.category || "Unknown";
}

function getQuantity(invoice) {
  return Number(invoice.quantity || invoice.qty || 1);
}

function getMonthlyRevenueTotals() {
  return months.map((month) => ownerInvoices.filter((invoice) => getInvoiceMonth(invoice) === month).reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0));
}

let _targetSaveTimer = null;

function loadRevenueTarget() {
  const saved = sessionStorage.getItem("revenueTarget");
  if (saved && Number(saved) > 0) {
    document.getElementById("revenueTarget").value = saved;
    updateRevenueTarget();
  }
}

function saveRevenueTarget(value) {
  if (value > 0) {
    sessionStorage.setItem("revenueTarget", value);
  } else {
    sessionStorage.removeItem("revenueTarget");
  }
}

window.updateRevenueTarget = function updateRevenueTarget() {
  const displayedRevenueTotal = getDisplayedInvoicesRevenueForTarget();
  const target = Number(document.getElementById("revenueTarget").value);
  const fill = document.getElementById("targetFill");
  const text = document.getElementById("targetText");

  
  clearTimeout(_targetSaveTimer);
  _targetSaveTimer = setTimeout(() => saveRevenueTarget(target), 800);

  const revenueLine = `<span style="font-size:12px;color:var(--text-soft);font-weight:800;">Current Revenue: <span style="color:#16875a;">${formatNumber(displayedRevenueTotal)} SAR</span></span>`;

  if (!target || target <= 0) {
    fill.style.width = "0%";
    fill.style.background = createTargetGradient(0);
    text.innerHTML = revenueLine + '<br>Remaining to target: 0 SAR';
    return;
  }

  const percent = Math.min((displayedRevenueTotal / target) * 100, 100);
  const remaining = Math.max(target - displayedRevenueTotal, 0);

  fill.style.width = percent + "%";
  fill.style.background = createTargetGradient(percent);

  if (remaining <= 0) {
    text.innerHTML = revenueLine + '<br><span class="target-status">Target achieved</span>';
    return;
  }

  text.innerHTML = revenueLine + `<br>Remaining to target: ${formatNumber(remaining)} SAR`;
};

function getDisplayedInvoicesRevenueForTarget() {
  if (!currentMonth) return 0;
  return ownerInvoices
    .filter((invoice) => getInvoiceMonth(invoice) === currentMonth)
    .reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0);
}

function createTargetGradient(percent) {
  if (percent < 40) return "linear-gradient(90deg, #ef4444, #ff9f00)";
  if (percent < 75) return "linear-gradient(90deg, #ef4444, #ff9f00, #d4e600)";
  return "linear-gradient(90deg, #ef4444, #ff9f00, #d4e600, #25c064)";
}

function renderPaymentDistribution(data) {
  clearCanvas("paymentPie");
  if (!data.length) {
    document.getElementById("paymentLegend").innerHTML = '<div class="empty-note">No payment data for this month</div>';
    return;
  }
  
  const totals = { Cash: 0, Mada: 0, Installments: 0, "Apple Pay": 0 };
  data.forEach((invoice) => {
    const method = getPaymentMethod(invoice);
    totals[method] += getInvoiceAmount(invoice);
  });
  const labels = Object.keys(totals);
  const values = Object.values(totals);
  const colors = labels.map((label) => paymentColors[label]);
  const totalPaymentAmount = values.reduce((sum, value) => sum + value, 0);

  if (totalPaymentAmount === 0) {
    document.getElementById("paymentLegend").innerHTML = '<div class="empty-note">No payment data for this month</div>';
    return;
  }

  drawModernDonutChart("paymentPie", values, colors);

  document.getElementById("paymentLegend").innerHTML = labels.map((label, index) => `
    <div class="pay-legend-item">
      <div class="pay-dot" style="background:${colors[index]}"></div>
      <span>${label} ${Math.round((values[index] / totalPaymentAmount) * 100)}%</span>
    </div>
  `).join("");
}

function renderTopSellingItems(data) {
  if (!data.length) {
    document.getElementById("topSellingItems").innerHTML = '<div class="empty-note">No sales data for this month</div>';
    return;
  }
  const items = {};
  data.forEach((invoice) => {
    const name = getItemName(invoice);
    items[name] = (items[name] || 0) + getQuantity(invoice);
  });
  const sorted = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 3);
  
  if (sorted.length === 0) {
    document.getElementById("topSellingItems").innerHTML = '<div class="empty-note">No sales data for this month</div>';
    return;
  }
  
  document.getElementById("topSellingItems").innerHTML = sorted.map((item, index) => `
    <div class="item-row">
      <span>${index + 1}. ${item[0]}</span>
      <span>${item[1]} sales</span>
    </div>
  `).join("");
}

/* ============================================================
    REVENUE TREND CHART - UPDATED TO CONNECT TO INVOICES DB
   ============================================================ */
let _trendChart = null;
let _trendView = 'monthly';
let _trendActiveMonth = new Date().getMonth();

const months3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtK(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : Math.round(n).toString();
}

function renderRevenueTrend() {
  const totals = getMonthlyRevenueTotals();
  _trendActiveMonth = months.indexOf(currentMonth);
  if (_trendActiveMonth < 0) _trendActiveMonth = new Date().getMonth();
  buildTrendPills(totals);
  buildTrendChart(totals);
}

function buildTrendPills(totals) {
  const container = document.getElementById('trendMonthPills');
  if (!container) return;
  container.innerHTML = months3.map((m, i) =>
    `<span style="font-size:10px;font-weight:900;padding:3px 8px;border-radius:999px;cursor:pointer;transition:.15s;
     ${i === _trendActiveMonth
       ? 'background:var(--brand-green);color:#fff;border:1px solid var(--brand-green);'
       : 'background:transparent;color:var(--text-soft);border:1px solid transparent;'}"
     onmouseover="if(${i}!==_trendActiveMonth)this.style.background='var(--brand-green-soft)'"
     onmouseout="if(${i}!==_trendActiveMonth)this.style.background='transparent'"
     onclick="selectTrendMonth(${i})">${m}</span>`
  ).join('');
}

window.selectTrendMonth = function(i) {
  _trendActiveMonth = i;
  currentMonth = months[i];
  document.getElementById('selectedMonth').textContent = currentMonth;
  document.querySelectorAll('.month-grid div').forEach(item => {
    const m = months.find(m => m.slice(0,3).toLowerCase() === item.textContent.trim().toLowerCase());
    item.classList.toggle('active-month', m === currentMonth);
  });
  renderOwnerAnalysis();
};

window.setTrendView = function(v, el) {
  _trendView = v;
  ['btnMonthly','btnCumul'].forEach(id => {
    const b = document.getElementById(id);
    if (!b) return;
    if ((id === 'btnMonthly' && v === 'monthly') || (id === 'btnCumul' && v === 'cumulative')) {
      b.style.background = 'var(--brand-green)'; b.style.color = '#fff';
    } else {
      b.style.background = 'var(--brand-green-soft)'; b.style.color = 'var(--brand-green-dark)';
    }
  });
  buildTrendChart(getMonthlyRevenueTotals());
};

function buildTrendChart(totals) {
  const canvas = document.getElementById('revenueTrendChart');
  if (!canvas) return;

  const visible = totals.slice(0, _trendActiveMonth + 1);
  const labels  = months3.slice(0, _trendActiveMonth + 1);
  const data    = _trendView === 'cumulative'
    ? visible.reduce((acc, v) => { acc.push((acc[acc.length-1]||0)+v); return acc; }, [])
    : visible;

  // Stats Calculations
  const peak    = visible.length ? Math.max(...visible) : 0;
  const peakIdx = visible.indexOf(peak);
  const cur     = totals[_trendActiveMonth] || 0;
  const prev    = _trendActiveMonth > 0 ? (totals[_trendActiveMonth - 1] || 0) : 0;
  const diff    = prev > 0 ? ((cur - prev) / prev * 100) : 0;
  const ytd     = visible.reduce((a, b) => a + b, 0);

  const peakEl = document.getElementById('trendPeakMonth');
  const vsEl   = document.getElementById('trendVsLast');
  const ytdEl  = document.getElementById('trendYtd');
  const badge  = document.getElementById('trendDirBadge');

  if (peakEl) peakEl.textContent = peak > 0 ? (months3[peakIdx] || '—') : '—';
  if (vsEl) {
    if (_trendActiveMonth === 0 || prev === 0) {
      vsEl.textContent = "—";
      vsEl.style.color = "var(--text-soft)";
    } else {
      vsEl.textContent = (diff >= 0 ? '+' : '') + Math.round(diff) + '%';
      vsEl.style.color = diff > 0 ? '#16875a' : diff < 0 ? '#e5252a' : 'var(--text-soft)';
    }
  }
  if (ytdEl) ytdEl.textContent = fmtK(ytd) + ' SAR';
  
  if (badge) {
    if (_trendActiveMonth === 0 || prev === 0) {
      badge.style.background='var(--brand-green-soft)'; badge.style.color='var(--text-soft)'; badge.textContent='— Stable';
    } else if (diff > 2) { 
      badge.style.background='rgba(22,135,90,.10)'; badge.style.color='#16875a'; badge.textContent='▲ +'+Math.round(diff)+'%'; 
    } else if (diff < -2) { 
      badge.style.background='rgba(229,37,42,.10)'; badge.style.color='#e5252a'; badge.textContent='▼ '+Math.round(diff)+'%'; 
    } else { 
      badge.style.background='var(--brand-green-soft)'; badge.style.color='var(--text-soft)'; badge.textContent='— Stable'; 
    }
  }

  if (_trendChart) _trendChart.destroy();
  const ctx = canvas.getContext('2d');
  _trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_,i) => i === _trendActiveMonth ? '#5f7f67' : 'rgba(118,147,124,.35)'),
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.65,
        order: 1
      },{
        type: 'line',
        data,
        borderColor: '#1f5f3b',
        borderWidth: 2.5,
        pointBackgroundColor: labels.map((_,i) => i === _trendActiveMonth ? '#1f5f3b' : '#76937C'),
        pointRadius: labels.map((_,i) => i === _trendActiveMonth ? 5 : 3),
        fill: { target: 'origin', above: 'rgba(118,147,124,.09)' },
        tension: 0.35,
        order: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: c => ' ' + c.raw.toLocaleString('en-US',{maximumFractionDigits:0}) + ' SAR' }
        }
      },
      scales: {
        x: { grid:{display:false}, ticks:{font:{size:11,weight:'700'},color:'#64748b',autoSkip:false,maxRotation:0} },
        y: { grid:{color:'rgba(0,0,0,.05)'}, ticks:{font:{size:10},color:'#64748b', callback: v=>fmtK(v)} }
      },
      onClick: (e, el) => {
        if (el.length) { selectTrendMonth(el[0].index); }
      }
    }
  });
}

function renderBreakdown(data) {
  clearCanvas("breakdownDonut");
  if (!data.length) {
    document.getElementById("breakdownList").innerHTML = '<div class="empty-note">No product data for this month</div>';
    return;
  }
  const products = {};
  data.forEach((invoice) => {
    const productName = getItemName(invoice);
    const quantity = getQuantity(invoice);
    const amount = getInvoiceAmount(invoice);
    if (!products[productName]) products[productName] = { quantity: 0, amount: 0 };
    products[productName].quantity += quantity;
    products[productName].amount += amount;
  });
  const totalQuantity = Object.values(products).reduce((sum, item) => sum + item.quantity, 0);
  if (!totalQuantity) {
    document.getElementById("breakdownList").innerHTML = '<div class="empty-note">No product data for this month</div>';
    return;
  }
  const values = Object.entries(products).sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 6).map(([name, item], index) => ({
    name,
    quantity: item.quantity,
    amount: item.amount,
    percent: Math.round((item.quantity / totalQuantity) * 100),
    color: chartColors[index % chartColors.length]
  }));
  drawDonutChart("breakdownDonut", values);
  document.getElementById("breakdownList").innerHTML = values.map((item) => `
    <div class="category-item">
      <div class="cat-left">
        <div class="cat-dot" style="background:${item.color}"></div>
        <div>
          <div class="cat-name" title="${item.name}">${item.name}</div>
          <div class="cat-sub">${item.quantity} orders • ${item.percent}% of demand</div>
        </div>
      </div>
      <div class="cat-amount">${formatNumber(item.amount)} SAR</div>
    </div>
  `).join("");
}

async function renderRecommendations(data) {
  const container = document.getElementById("recommendations");
  
  if (!data.length) {
    container.innerHTML = '<div class="empty-note">No invoice data available for this month</div>';
    return;
  }
  
  try {
    aiOwnerRecommendations = await getAIRecommendationsFromModel(data);
  } catch (error) {
    console.warn("AI recommendations endpoint not available, using local recommendations.", error);
    aiOwnerRecommendations = generateLocalRecommendations(data);
  }
  if (!aiOwnerRecommendations.length) {
    container.innerHTML = '<div class="empty-note">No recommendations available for this month</div>';
    return;
  }
  container.innerHTML = aiOwnerRecommendations.slice(0, 2).map((text) => `<div class="recommendation-item"><span></span><span>${text}</span></div>`).join("");
}

async function getAIRecommendationsFromModel(data) {
  const response = await fetch(`${ANALYTICS_API}/api/recommendations?month=${getMonthNumber(currentMonth)}&year=${new Date().getFullYear()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) throw new Error("AI recommendations request failed");
  const result = await response.json();
  if (Array.isArray(result.recommendations)) return result.recommendations;
  if (typeof result.recommendation === "string") return [result.recommendation];
  return [];
}

function generateLocalRecommendations(data) {
  if (!data.length) return [];
  const productTotals = {};
  data.forEach((invoice) => {
    const name = getItemName(invoice);
    productTotals[name] = (productTotals[name] || 0) + getQuantity(invoice);
  });
  const topProduct = Object.entries(productTotals).sort((a, b) => b[1] - a[1])[0];
  const recommendations = [];
  if (topProduct) recommendations.push(`${topProduct[0]} is your highest-demand product. Keep it visible in offers.`);
  const currentRevenue = currentMonth ? ownerInvoices.filter((invoice) => getInvoiceMonth(invoice) === currentMonth).reduce((sum, invoice) => sum + getInvoiceAmount(invoice), 0) : 0;
  const target = Number(document.getElementById("revenueTarget").value);
  if (target && currentRevenue < target * 0.75) recommendations.push("Revenue is still below target. Consider highlighting best-selling items or running a short promotion.");
  else recommendations.push("Revenue performance looks stable. Continue tracking invoices and payment behavior regularly.");
  return recommendations;
}

function getMonthNumber(monthName) {
  return months.indexOf(monthName) + 1;
}

function clearCanvas(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.clientWidth || 160;
  canvas.height = canvas.clientHeight || 120;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawModernDonutChart(canvasId, values, colors) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  canvas.width = 220;
  canvas.height = 150;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) {
    drawEmptyCircle(ctx, 110, 75, 58, 34);
    return;
  }
  let start = -0.5 * Math.PI;
  const gap = 0.04;
  values.forEach((value, index) => {
    if (value <= 0) return;
    const angle = (value / total) * Math.PI * 2 - gap;
    ctx.beginPath();
    ctx.arc(110, 75, 62, start + gap / 2, start + gap / 2 + angle);
    ctx.arc(110, 75, 36, start + gap / 2 + angle, start + gap / 2, true);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.shadowColor = colors[index % colors.length];
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    start += angle + gap;
  });
  ctx.beginPath();
  ctx.arc(110, 75, 34, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  const maxIndex = values.indexOf(Math.max(...values));
  const maxPercent = Math.round((values[maxIndex] / total) * 100);
  ctx.fillStyle = "#1a2634";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(maxPercent + "%", 110, 75);
}

function drawEmptyCircle(ctx, centerX, centerY, outerRadius, innerRadius) {
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
  ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
  ctx.closePath();
  ctx.fillStyle = "rgba(118,147,124,.16)";
  ctx.fill();
}

function drawDonutChart(canvasId, values) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext("2d");
  canvas.width = 160;
  canvas.height = 150;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const total = values.reduce((sum, item) => sum + (item.quantity ?? item.amount), 0);
  if (!total) return;
  let start = -0.5 * Math.PI;
  values.forEach((item) => {
    const rawValue = item.quantity ?? item.amount;
    if (rawValue <= 0) return;
    const angle = (rawValue / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(75, 75, 68, start, start + angle);
    ctx.arc(75, 75, 34, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.shadowColor = "rgba(26,38,52,.12)";
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    const mid = start + angle / 2;
    ctx.fillStyle = "white";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.percent + "%", 75 + Math.cos(mid) * 51, 75 + Math.sin(mid) * 51);
    start += angle;
  });
  ctx.beginPath();
  ctx.arc(75, 75, 31, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#5f7f67";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Orders", 75, 69);
  ctx.font = "bold 9px Arial";
  ctx.fillText(formatNumber(total), 75, 82);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function runOwnerAnalysisTests() {
  console.assert(typeof window.toggleMonths === "function", "toggleMonths should be globally available");
  console.assert(normalizeMonth("Feb") === "February", "normalizeMonth should convert short month names");
  console.assert(getInvoiceAmount({ total_amount: 150 }) === 150, "getInvoiceAmount should support total_amount");
  console.assert(getPaymentMethod({ payment_method: "Apple Pay" }) === "Apple Pay", "getPaymentMethod should support Apple Pay");
  console.assert(getMonthlyRevenueTotals().length === 12, "getMonthlyRevenueTotals should return 12 months");
  console.assert(formatNumber(1530) === "1,530", "formatNumber should add thousands separator");
}

loadOwnerInvoices();

/* ============================================================
    TOTAL PRICE DISTRIBUTION - smartbills_model.pkl
   ============================================================ */
let histChart = null;

function updateModelStatusMessage(totalBills = 0, avgActual = null, avgPredicted = null, monthName = "") {
  const statusEl = document.getElementById("expectedRevenueStatus");
  if (!statusEl) return;
  
  if (totalBills > 0 && avgActual !== null && avgPredicted !== null) {
    statusEl.innerHTML = ` <strong>active</strong> | ${totalBills} electricity bills analyzed for ${monthName || currentMonth} | ` +
                         `Actual avg: ${Math.round(avgActual).toLocaleString()} SAR | ` +
                         `Predicted avg: ${Math.round(avgPredicted).toLocaleString()} SAR`;
    statusEl.style.color = "#5f7f67";
    statusEl.style.fontSize = "11px";
    statusEl.style.fontWeight = "500";
  } else if (totalBills === 0) {
    statusEl.innerHTML = ` No electricity bills data for ${monthName || currentMonth} | Add data to electricity_bills table to enable smartbills_model predictions.`;
    statusEl.style.color = "#e5982e";
    statusEl.style.fontSize = "11px";
    statusEl.style.fontWeight = "500";
  } else {
    statusEl.innerHTML = ` Waiting for smartbills_model to analyze electricity consumption data...`;
    statusEl.style.color = "#888";
    statusEl.style.fontSize = "11px";
    statusEl.style.fontWeight = "500";
  }
}

function showEmptyHistogram(message = "No electricity data for this month") {
  const canvas = document.getElementById("histChart");
  const wrap = document.getElementById("revenueHistogramArea");
  const empty = document.getElementById("revenueHistogramEmpty");
  
  if (histChart) histChart.destroy();
  
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width || 300, canvas.height || 150);
  }
  
  if (wrap) wrap.classList.add("is-empty");
  if (empty) {
    empty.style.display = "flex";
    const emptyStrong = empty.querySelector("strong");
    const emptyP = empty.querySelector("p");
    if (emptyStrong) emptyStrong.textContent = message;
    if (emptyP) emptyP.textContent = "Add electricity bills data to see predicted price distribution from smartbills_model.";
  }
  
  updateModelStatusMessage(0, null, null, currentMonth);
}

function buildHistChart(bins, counts, avgActual = null, avgPredicted = null, totalBills = 0) {
  const canvas = document.getElementById("histChart");
  const wrap = document.getElementById("revenueHistogramArea");
  const empty = document.getElementById("revenueHistogramEmpty");
  
  if (!canvas) return;
  
  if (histChart) histChart.destroy();
  
  if (!bins || !bins.length || !counts || !counts.length) {
    showEmptyHistogram("No data from smartbills_model");
    return;
  }
  
  if (wrap) wrap.classList.remove("is-empty");
  if (empty) empty.style.display = "none";
  
  const ctx = canvas.getContext("2d");
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const mean = bins.reduce((a, b, i) => a + b * counts[i], 0) / total;
  const maxC = Math.max(...counts, 1);
  const curve = bins.map(b => Math.exp(-0.5 * ((b - mean) / 200) ** 2) * maxC * 1.05);
  
  const avgActualEl = document.getElementById("avgActualPrice");
  const avgPredictedEl = document.getElementById("avgPredictedPrice");
  const totalBillsEl = document.getElementById("totalBillsCount");
  
  if (avgActualEl) avgActualEl.textContent = avgActual !== null ? `${Math.round(avgActual).toLocaleString()} SAR` : "—";
  if (avgPredictedEl) avgPredictedEl.textContent = avgPredicted !== null ? `${Math.round(avgPredicted).toLocaleString()} SAR` : "—";
  if (totalBillsEl) totalBillsEl.textContent = totalBills || "0";
  
  updateModelStatusMessage(totalBills, avgActual, avgPredicted, currentMonth);
  
  histChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: bins.map(v => Math.round(v).toLocaleString()),
      datasets: [
        {
          type: "bar",
          data: counts,
          backgroundColor: "rgba(118,147,124,0.72)",
          borderColor: "rgba(118,147,124,0.9)",
          borderWidth: 1,
          borderRadius: 3,
          barPercentage: 0.95,
          categoryPercentage: 1,
          label: "Number of Invoices"
        },
        {
          type: "line",
          data: curve,
          borderColor: "rgba(44,62,80,0.6)",
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
          label: "Distribution Curve"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (context.dataset.label === "Number of Invoices") {
                return `${context.raw} invoices`;
              }
              return null;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Predicted Price (SAR)", font: { size: 10 }, color: "#2C3E50" },
          ticks: { font: { size: 8 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 8 },
          grid: { display: false }
        },
        y: {
          title: { display: true, text: "Number of Invoices", font: { size: 10 }, color: "#2C3E50" },
          ticks: { font: { size: 8 }, stepSize: 1, precision: 0 },
          grid: { color: "rgba(0,0,0,0.04)" }
        }
      }
    }
  });
}

async function loadChart() {
  try {
    const monthNum = getMonthNumber(currentMonth);
    const yearNum = new Date().getFullYear();
    
    console.log(`Fetching distribution data for ${monthNum}/${yearNum}...`);
    
    const ownerParam = currentOwnerId ? `&owner_id=${currentOwnerId}` : "";
    const response = await fetch(`${ANALYTICS_API}/api/distribution?month=${monthNum}&year=${yearNum}${ownerParam}`);
    
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText}`);
      showEmptyHistogram(`API error: ${response.status}`);
      updateModelStatusMessage(0, null, null, currentMonth);
      return;
    }
    
    const data = await response.json();
    console.log("Distribution data:", data);
    
    if (data.error) {
      console.error("API error:", data.error);
      showEmptyHistogram(data.error);
      updateModelStatusMessage(0, null, null, currentMonth);
      return;
    }
    
    if (data.message) {
      console.warn("API message:", data.message);
      showEmptyHistogram(data.message);
      updateModelStatusMessage(0, null, null, currentMonth);
      return;
    }
    
    if (data.hist_bins && Array.isArray(data.hist_bins) && data.hist_bins.length > 0 &&
        data.hist_counts && Array.isArray(data.hist_counts)) {
      
      buildHistChart(
        data.hist_bins,
        data.hist_counts,
        data.avg_actual,
        data.avg_predicted,
        data.total_bills
      );
      console.log(`Chart rendered successfully: ${data.total_bills || 0} electricity bills`);
    } else {
      console.warn("No distribution data for selected month");
      showEmptyHistogram(`No electricity bills for ${currentMonth} ${yearNum}`);
      updateModelStatusMessage(0, null, null, currentMonth);
    }
    
  } catch (error) {
    console.error("Failed to load chart data:", error);
    showEmptyHistogram("Connection error: " + error.message);
    updateModelStatusMessage(0, null, null, currentMonth);
  }
}