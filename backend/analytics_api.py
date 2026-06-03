"""
analytics_api.py — SmartBills Analytics API
=============================================
Serves analytics.html page completely

Endpoints:
  GET  /health                          — Check connections and models
  GET  /api/invoices                    — All invoices (JS calculates KPIs)
  GET  /api/kpis?month=5&year=2026      — Total Revenue / Invoices / Avg
  GET  /api/distribution?month=5&year= — Histogram from smartbills_model (electricity DB)
  GET  /api/payments?month=5&year=      — Payment Distribution (invoice DB)
  GET  /api/top_items?month=5&year=     — Top Selling Items (invoice DB)
  GET  /api/trend?month=5&year=         — Revenue Trend (invoice DB)
  GET  /api/spending?month=5&year=      — Product Demand Breakdown (invoice DB)
  POST /api/analyze                     — Histogram from smartbills_model

Data Sources:
  • electricity_bills  → smartbills_model.pkl (distribution / histogram)

"""

import os
import warnings
import logging
import joblib
import numpy as np
import mysql.connector
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

# Suppress sklearn version warnings
warnings.filterwarnings("ignore", category=UserWarning)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins="*")

# ════════════════════════════════════════════════════════════════════════════
#  CONFIG — Update passwords according to your settings
# ════════════════════════════════════════════════════════════════════════════

ELEC_DB = {
    "host":     os.getenv("ELEC_HOST", "localhost"),
    "user":     os.getenv("ELEC_USER", "root"),
    "password": os.getenv("ELEC_PASS", ""),
    "database": os.getenv("ELEC_DB",   "electricity"),
    "charset":  "utf8mb4",
    "connection_timeout": 5,
}

INV_DB = {
    "host":     os.getenv("INV_HOST", "localhost"),
    "user":     os.getenv("INV_USER", "root"),
    "password": os.getenv("INV_PASS", ""),
    "database": os.getenv("INV_DB",   "invoice"),
    "charset":  "utf8mb4",
    "connection_timeout": 5,
}

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")

# ════════════════════════════════════════════════════════════════════════════
#  Load models on startup
# ════════════════════════════════════════════════════════════════════════════

# ════════════════════════════════════════════════════════════════════════════
#  Load SmartBills Model Only
# ════════════════════════════════════════════════════════════════════════════

smartbills_model = None   # LinearRegression — takes Quantity, predicts price


def load_models():
    global smartbills_model

    path = os.path.join(MODEL_DIR, "smartbills_model.pkl")

    if not os.path.exists(path):
        logger.warning(f"SmartBills model not found: {path}")
        return

    try:
        smartbills_model = joblib.load(path)
        logger.info("smartbills_model loaded successfully (LinearRegression)")
    except Exception as e:
        logger.error(f"Failed to load smartbills_model: {e}")


load_models()

# ════════════════════════════════════════════════════════════════════════════
#  DB HELPERS
# ════════════════════════════════════════════════════════════════════════════

def elec_conn():
    c = mysql.connector.connect(**ELEC_DB)
    c.autocommit = True
    return c

def inv_conn():
    c = mysql.connector.connect(**INV_DB)
    c.autocommit = True
    return c

def qp():
    """Get month and year from query params"""
    m = request.args.get("month", type=int)
    y = request.args.get("year",  type=int)
    return m, y

def month_filter_inv(m, y, col="invoice_date", prefix="WHERE"):
    """Build WHERE clause for invoices table"""
    parts = []
    if m: parts.append(f"MONTH({col}) = {m}")
    if y: parts.append(f"YEAR({col}) = {y}")
    return (prefix + " " + " AND ".join(parts)) if parts else ""

def month_filter_elec(m, y, col="bill_date", prefix="WHERE"):
    """Build WHERE clause for electricity table"""
    parts = []
    if m: parts.append(f"MONTH({col}) = {m}")
    if y: parts.append(f"YEAR({col}) = {y}")
    return (prefix + " " + " AND ".join(parts)) if parts else ""

def safe_float(v, default=0.0):
    try:
        return float(v) if v is not None else default
    except Exception:
        return default

# ════════════════════════════════════════════════════════════════════════════
#  HEALTH CHECK
# ════════════════════════════════════════════════════════════════════════════

@app.route("/health")
def health():
    status = {
        "api": "ok",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "smartbills_model": smartbills_model is not None,
        }
    }

    # Check electricity DB
    try:
        c = elec_conn(); c.cursor().execute("SELECT 1"); c.close()
        status["db_electricity"] = "ok"
    except Exception as e:
        status["db_electricity"] = f"error: {e}"

    # Check invoice DB
    try:
        c = inv_conn(); c.cursor().execute("SELECT 1"); c.close()
        status["db_invoice"] = "ok"
    except Exception as e:
        status["db_invoice"] = f"error: {e}"

    return jsonify(status)

# ════════════════════════════════════════════════════════════════════════════
#  1. INVOICES LIST ← invoice DB
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/invoices")
def invoices_list():
    m, y     = qp()
    owner_id = request.args.get("owner_id", type=int)

    where_parts = []
    params      = []

    if owner_id:
        where_parts.append("it.owner_id = %s")
        params.append(owner_id)

    if m:
        where_parts.append("MONTH(it.invoice_date) = %s")
        params.append(m)
    if y:
        where_parts.append("YEAR(it.invoice_date) = %s")
        params.append(y)

    where_clause = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""

    try:
        conn   = inv_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT
                it.invoice_id,
                it.user_id,
                it.owner_id,
                it.total_amount,
                it.tax_amount,
                it.tax_id,
                it.invoice_date,
                it.invoice_day,
                it.invoice_time,
                it.payment_method,
                it.created_at,
                ii.product_name,
                ii.quantity,
                ii.unit_price,
                ii.subtotal
            FROM invoices_table it
            LEFT JOIN invoice_items ii ON ii.invoice_id = it.invoice_id
            {where_clause}
            ORDER BY it.invoice_date DESC, it.invoice_time DESC
        """, params)
        rows   = cursor.fetchall()
        conn.close()

        # Merge invoice items
        invoices_map = {}
        for r in rows:
            inv_id = r["invoice_id"]
            if inv_id not in invoices_map:
                invoices_map[inv_id] = {
                    "invoice_id":     inv_id,
                    "user_id":        r["user_id"],
                    "owner_id":       r["owner_id"],
                    "total_amount":   safe_float(r["total_amount"]),
                    "total":          safe_float(r["total_amount"]),
                    "tax_amount":     safe_float(r["tax_amount"]),
                    "invoice_date":   str(r["invoice_date"]),
                    "invoice_day":    r["invoice_day"],
                    "invoice_time":   str(r["invoice_time"]),
                    "payment_method": r["payment_method"],
                    "items": []
                }
            if r["product_name"]:
                invoices_map[inv_id]["items"].append({
                    "product_name": r["product_name"],
                    "quantity":     r["quantity"],
                    "unit_price":   safe_float(r["unit_price"]),
                    "subtotal":     safe_float(r["subtotal"]),
                })
                if "product_name" not in invoices_map[inv_id]:
                    invoices_map[inv_id]["product_name"] = r["product_name"]
                    invoices_map[inv_id]["quantity"]     = r["quantity"]

        result = list(invoices_map.values())
        return jsonify(result)

    except Exception as e:
        logger.error(f"invoices_list: {e}")
        return jsonify({"error": str(e)}), 500

# ════════════════════════════════════════════════════════════════════════════
#  2. KPIs ← invoice DB
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/kpis")
def kpis():
    m, y  = qp()
    where = month_filter_inv(m, y)
    try:
        conn   = inv_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT
                COALESCE(SUM(total_amount), 0)  AS total_revenue,
                COUNT(*)                         AS total_invoices,
                COALESCE(AVG(total_amount), 0)  AS avg_order_value
            FROM invoices_table
            {where}
        """)
        row  = cursor.fetchone()
        conn.close()
        return jsonify({
            "total_revenue":   round(safe_float(row["total_revenue"]),   2),
            "total_invoices":  int(row["total_invoices"]),
            "avg_order_value": round(safe_float(row["avg_order_value"]), 2),
        })
    except Exception as e:
        logger.error(f"kpis: {e}")
        return jsonify({"error": str(e)}), 500

# ════════════════════════════════════════════════════════════════════════════
#  3. DISTRIBUTION (Histogram) ← smartbills_model + electricity DB
#  Model: LinearRegression(feature=Quantity → predicted_price)
# ════════════════════════════════════════════════════════════════════════════

def _build_distribution(m, y, owner_id=None):
    """
    Core distribution logic:
    1. Fetch invoices from electricity DB filtered by owner_id
    2. Run smartbills_model on quantities
    3. Build histogram
    """
    if smartbills_model is None:
        return {"error": "smartbills_model not loaded"}, 503

    try:
        conn   = elec_conn()
        cursor = conn.cursor(dictionary=True)
        where_parts = []
        params = []
        if m:
            where_parts.append(f"MONTH(bill_date) = {m}")
        if y:
            where_parts.append(f"YEAR(bill_date) = {y}")
        if owner_id:
            where_parts.append(f"owner_id = {owner_id}")
        where = ("WHERE " + " AND ".join(where_parts)) if where_parts else ""
        cursor.execute(f"""
            SELECT quantity, actual_price, bill_month
            FROM electricity_bills
            {where}
            ORDER BY bill_date
        """)
        rows = cursor.fetchall()
        conn.close()
    except Exception as e:
        return {"error": f"electricity DB: {e}"}, 500

    if not rows:
        return {
            "hist_bins":   [],
            "hist_counts": [],
            "labels":      [],
            "values":      [],
            "source":      "smartbills_model",
            "message":     f"No electricity bills for requested month ({m}/{y})",
        }, 200

    # Run model
    quantities = np.array([r["quantity"] for r in rows], dtype=float).reshape(-1, 1)
    try:
        predicted_prices = smartbills_model.predict(quantities)
    except Exception as e:
        return {"error": f"smartbills_model.predict: {e}"}, 500

    # Build histogram with 14 bins
    n         = 14
    min_p     = float(predicted_prices.min())
    max_p     = float(predicted_prices.max())
    step      = (max_p - min_p) / n if max_p != min_p else max(max_p, 1)

    bins   = [round(min_p + i * step, 2) for i in range(n)]
    counts = [0] * n
    for p in predicted_prices:
        idx = min(int((p - min_p) / step), n - 1)
        counts[idx] += 1

    # Average actual vs predicted
    actual_prices = [safe_float(r["actual_price"]) for r in rows]
    avg_actual    = round(sum(actual_prices) / len(actual_prices), 2) if actual_prices else 0
    avg_predicted = round(float(predicted_prices.mean()), 2)

    return {
        "hist_bins":       bins,
        "hist_counts":     counts,
        "labels":          [str(b) for b in bins],
        "values":          counts,
        "avg_actual":      avg_actual,
        "avg_predicted":   avg_predicted,
        "total_bills":     len(rows),
        "source":          "smartbills_model",
        "model_type":      "LinearRegression(Quantity→Price)",
    }, 200

@app.route("/api/distribution")
def distribution():
    m, y     = qp()
    owner_id = request.args.get("owner_id", type=int)
    data, code = _build_distribution(m, y, owner_id)
    return jsonify(data), code

@app.route("/analyze", methods=["GET", "POST"])
def analyze_legacy():
    """Legacy endpoint for JS: returns hist_bins and hist_counts"""
    m, y     = qp()
    data, code = _build_distribution(m, y)
    return jsonify(data), code

# ════════════════════════════════════════════════════════════════════════════
#  4. PAYMENT DISTRIBUTION ← invoice DB
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/payments")
def payments():
    m, y  = qp()
    where = month_filter_inv(m, y)
    try:
        conn   = inv_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT payment_method, COUNT(*) AS cnt,
                   SUM(total_amount) AS total
            FROM invoices_table
            {where}
            GROUP BY payment_method
            ORDER BY cnt DESC
        """)
        rows   = cursor.fetchall()
        conn.close()

        total_cnt = sum(r["cnt"] for r in rows) or 1
        labels    = [r["payment_method"] for r in rows]
        counts    = [int(r["cnt"]) for r in rows]
        percents  = [round(r["cnt"] / total_cnt * 100) for r in rows]
        amounts   = [round(safe_float(r["total"]), 2) for r in rows]

        return jsonify({
            "labels":   labels,
            "values":   percents,
            "counts":   counts,
            "amounts":  amounts,
        })
    except Exception as e:
        logger.error(f"payments: {e}")
        return jsonify({"error": str(e)}), 500

# ════════════════════════════════════════════════════════════════════════════
#  5. TOP SELLING ITEMS ← invoice_items + invoice DB
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/top_items")
def top_items():
    m, y        = qp()
    date_filter = month_filter_inv(m, y, col="it.invoice_date", prefix="AND")
    try:
        conn   = inv_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT
                ii.product_name  AS name,
                SUM(ii.quantity) AS sales,
                SUM(ii.subtotal) AS revenue
            FROM invoice_items ii
            JOIN invoices_table it ON it.invoice_id = ii.invoice_id
            WHERE 1=1 {date_filter}
            GROUP BY ii.product_name
            ORDER BY sales DESC
            LIMIT 5
        """)
        rows = cursor.fetchall()
        conn.close()
        items = [
            {
                "name":    r["name"],
                "sales":   int(r["sales"]),
                "revenue": round(safe_float(r["revenue"]), 2),
            }
            for r in rows
        ]
        return jsonify({"items": items})
    except Exception as e:
        logger.error(f"top_items: {e}")
        return jsonify({"error": str(e)}), 500

# ════════════════════════════════════════════════════════════════════════════
#  6. REVENUE TREND ← invoice DB
# ════════════════════════════════════════════════════════════════════════════

@app.route("/api/trend")
def trend():
    m, y  = qp()
    where = month_filter_inv(m, y)
    try:
        conn   = inv_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT
                DATE_FORMAT(invoice_date, '%b %Y') AS period,
                MONTH(invoice_date)                 AS month_num,
                YEAR(invoice_date)                  AS year_num,
                SUM(total_amount)                   AS revenue,
                COUNT(*)                            AS invoice_count
            FROM invoices_table
            {where}
            GROUP BY YEAR(invoice_date), MONTH(invoice_date)
            ORDER BY YEAR(invoice_date), MONTH(invoice_date)
        """)
        rows   = cursor.fetchall()
        conn.close()

        labels  = [r["period"] for r in rows]
        values  = [round(safe_float(r["revenue"]), 2) for r in rows]
        counts  = [int(r["invoice_count"]) for r in rows]

        return jsonify({"labels": labels, "values": values, "counts": counts})
    except Exception as e:
        logger.error(f"trend: {e}")
        return jsonify({"error": str(e)}), 500

# ════════════════════════════════════════════════════════════════════════════
#  7. PRODUCT DEMAND BREAKDOWN ← invoice_items + invoice DB
# ════════════════════════════════════════════════════════════════════════════

KEYWORD_MAP = {
    "Coffee":  ["coffee", "latte", "espresso", "mocha", "brew", "cappuccino", "cold brew", "iced"],
    "Food":    ["subway", "burger", "pizza", "sandwich", "meal", "tray", "platter", "box",
                "bmt", "teriyaki", "veggie", "club", "special", "party"],
    "Bakery":  ["cake", "cookies", "bread", "pastry"],
}

@app.route("/api/spending")
def spending():
    m, y        = qp()
    date_filter = month_filter_inv(m, y, col="it.invoice_date", prefix="AND")
    try:
        conn   = inv_conn()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT
                ii.product_name,
                SUM(ii.quantity) AS qty,
                SUM(ii.subtotal) AS amount
            FROM invoice_items ii
            JOIN invoices_table it ON it.invoice_id = ii.invoice_id
            WHERE 1=1 {date_filter}
            GROUP BY ii.product_name
            ORDER BY amount DESC
        """)
        rows = cursor.fetchall()
        conn.close()

        categories = {}
        for r in rows:
            name   = str(r["product_name"]).lower()
            amount = safe_float(r["amount"])
            qty    = int(r["qty"] or 0)
            cat    = "Other"
            for c, keywords in KEYWORD_MAP.items():
                if any(k in name for k in keywords):
                    cat = c
                    break
            if cat not in categories:
                categories[cat] = {"amount": 0, "qty": 0}
            categories[cat]["amount"] += amount
            categories[cat]["qty"]    += qty

        total_amount = sum(v["amount"] for v in categories.values()) or 1

        labels  = list(categories.keys())
        amounts = [round(categories[l]["amount"], 2) for l in labels]
        values  = [round(categories[l]["amount"] / total_amount * 100) for l in labels]
        qtys    = [categories[l]["qty"] for l in labels]

        return jsonify({
            "labels":  labels,
            "values":  values,
            "amounts": amounts,
            "qtys":    qtys,
        })
    except Exception as e:
        logger.error(f"spending: {e}")
        return jsonify({"error": str(e)}), 500



# ════════════════════════════════════════════════════════════════════════════
#  RUN
# ════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print("=" * 65)
    print(f"🚀  SmartBills Analytics API — http://localhost:{port}")
    print("=" * 65)
    print("📊  Endpoints:")
    print(f"   GET  /health")
    print(f"   GET  /api/invoices")
    print(f"   GET  /api/kpis")
    print(f"   GET  /api/distribution?month=5&year=2026  (smartbills_model)")
    print(f"   GET  /api/payments")
    print(f"   GET  /api/top_items")
    print(f"   GET  /api/trend")
    print(f"   GET  /api/spending")
    print("=" * 65)
    print("📦  Models:")
    print(f"   smartbills_model : {'✅' if smartbills_model else '❌'} LinearRegression(Quantity→Price)")
    
    print("=" * 65)
    app.run(debug=True, host="0.0.0.0", port=port)