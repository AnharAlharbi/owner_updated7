# SmartBills Analytics API — دليل التشغيل

## الهيكل العام

```
owner_updated/
├── analytics.html          ← صفحة التحليلات
├── js/
│   └── owner-analysis.js   ← يتصل بـ analytics_api.py مباشرةً
├── php/
│   ├── owner_api.php           ← قائمة الفواتير (fallback)
│   ├── owner_ai_revenue.php    ← proxy → analytics_api /api/ai_revenue
│   └── owner_ai_recommendations.php  ← proxy → analytics_api /api/ai_recommendations
└── backend/
    ├── analytics_api.py    ← 🔥 الـ API الرئيسي الجديد
    ├── main.py             ← الـ API القديم (recommendation engine)
    ├── model/
    │   ├── smartbills_model.pkl    ← LinearRegression (Quantity→Price)
    │   ├── kmeans_model.pkl        ← KMeans clustering
    │   ├── scaler.pkl              ← RobustScaler
    │   ├── user_segments.pkl       ← {user_id: cluster_id}
    │   └── cluster_characteristics.pkl
    └── requirements.txt
```

---

## مصادر البيانات لكل كارد

| الكارد | المصدر | الـ Endpoint |
|--------|--------|-------------|
| Total Revenue / Invoices / Avg | `invoice.invoices_table` | `/api/kpis` |
| **Total Price Distribution** (Histogram) | `electricity.electricity_bills` + **smartbills_model.pkl** | `/api/distribution` |
| Payment Distribution | `invoice.invoices_table` | `/api/payments` |
| Top Selling Items | `invoice.invoice_items` | `/api/top_items` |
| Revenue Trend | `invoice.invoices_table` | `/api/trend` |
| Product Demand Breakdown | `invoice.invoice_items` | `/api/spending` |
| **Recommendations** | `invoice DB` + **recommendation model (KMeans)** | `/api/recommendations` |

---

## طريقة التشغيل

### 1. تثبيت المكتبات
```bash
cd owner_updated/backend
pip install -r requirements.txt
```

### 2. ضبط قواعد البيانات (اختياري — الافتراضي localhost/root/بدون كلمة مرور)
```bash
export ELEC_HOST=localhost
export ELEC_USER=root
export ELEC_PASS=yourpassword
export ELEC_DB=electricity

export INV_HOST=localhost
export INV_USER=root
export INV_PASS=yourpassword
export INV_DB=invoice
```

### 3. تشغيل الـ API
```bash
python analytics_api.py
# يعمل على http://localhost:8000
```

### 4. تشغيل الـ PHP server
```bash
cd owner_updated
php -S localhost:3000
```

### 5. افتح المتصفح
```
http://localhost:3000/analytics.html
```

---

## Endpoints الكاملة

| Method | URL | الوصف |
|--------|-----|-------|
| GET | `/health` | فحص الاتصالات والموديلات |
| GET | `/api/invoices?month=5&year=2026` | كل الفواتير |
| GET | `/api/kpis?month=5&year=2026` | KPIs (Revenue / Invoices / Avg) |
| GET | `/api/distribution?month=5&year=2026` | Histogram من smartbills_model |
| GET | `/analyze` | نفس distribution (legacy للـ JS القديم) |
| GET | `/api/payments?month=5&year=2026` | توزيع طرق الدفع |
| GET | `/api/top_items?month=5&year=2026` | أكثر المنتجات مبيعاً |
| GET | `/api/trend?month=5&year=2026` | اتجاه الإيراد |
| GET | `/api/spending?month=5&year=2026` | توزيع المنتجات |
| GET | `/api/recommendations?month=5&year=2026` | توصيات ذكية |
| POST | `/api/ai_revenue` | توقّع الإيراد (للـ PHP proxy) |
| POST | `/api/ai_recommendations` | توصيات (للـ PHP proxy) |

---

## كيف يعمل كل موديل

### smartbills_model.pkl
- **النوع:** `LinearRegression`
- **الـ feature:** `Quantity` (kWh من electricity_bills)
- **الـ target:** السعر المتوقع
- **يُستخدم في:** كارد "Total Price Distribution" (الهستوغرام)

### recommendation model (KMeans)
- **النوع:** `KMeans` (3 clusters)
- **الـ clusters:**
  - Cluster 2 → VIP (متوسط إنفاق ~2,867 SAR، recency ~39 يوم)
  - Cluster 0 → Regular (متوسط إنفاق ~592 SAR، recency ~123 يوم)
  - Cluster 1 → Occasional (متوسط إنفاق ~428 SAR، recency ~98 يوم)
- **يُستخدم في:** كارد "Recommendations" لتحديد فئة العملاء

---

## ملاحظات مهمة

1. **CORS:** الـ API مفتوح لجميع الـ origins — قيّده في الإنتاج
2. **الـ Port:** الافتراضي 8000 — غيّره بـ `export PORT=5000`
3. **تحذيرات sklearn:** الموديلات مدرّبة على sklearn 1.7 والـ API يعمل على 1.8 — لا تأثير على الدقة
4. **الـ PHP proxy:** يتصل بـ analytics_api.py على localhost:8000 — يمكن تغييره عبر `ANALYTICS_API_URL`
