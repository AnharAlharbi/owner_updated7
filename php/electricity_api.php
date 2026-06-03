<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$conn = new mysqli("localhost", "root", "", "invoice");

if ($conn->connect_error) {
    die(json_encode(["error" => "فشل الاتصال: " . $conn->connect_error]));
}
$conn->set_charset("utf8mb4");

if (!isset($_SESSION['owner_id'])) {
    echo json_encode(["error" => "يجب تسجيل الدخول"]);
    exit;
}

$owner_id = intval($_SESSION['owner_id']);


if (isset($_GET['action']) && $_GET['action'] === 'list') {

    $stmt = $conn->prepare("
        SELECT 
            bill_id        AS id,
            bill_date      AS date,
            bill_month     AS month,
            Quantity       AS quantity,
            unit_label,
            actual_price,
            created_at
        FROM electricity.electricity_bills
        WHERE owner_id = ?
        ORDER BY bill_date DESC
    ");

    $stmt->bind_param("i", $owner_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $bills = [];
    while ($row = $result->fetch_assoc()) {
        $bills[] = [
            "id"              => $row['id'],
            "date"            => $row['date'],
            "month"           => $row['month'],
            "quantity"        => $row['quantity'],
            "unit_label"      => $row['unit_label'],
            "actual_price"    => $row['actual_price'],
            "created_at"      => $row['created_at'],
            "store"           => "فاتورة الكهرباء",
            "total"           => $row['actual_price'] ?? 0,
            "payment_method"  => "electricity",
            "type"            => "electricity"
        ];
    }

    echo json_encode($bills);
    exit;
}


if (isset($_GET['bill_id'])) {
    $bill_id = intval($_GET['bill_id']);

    $stmt = $conn->prepare("
        SELECT *
        FROM electricity.electricity_bills
        WHERE bill_id = ? AND owner_id = ?
    ");
    $stmt->bind_param("ii", $bill_id, $owner_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $bill = $result->fetch_assoc();

    if (!$bill) {
        echo json_encode(["error" => "الفاتورة غير موجودة أو لا تملك صلاحية عرضها"]);
        exit;
    }

    echo json_encode([
        "id"           => $bill['bill_id'],
        "date"         => $bill['bill_date'],
        "month"        => $bill['bill_month'],
        "quantity"     => $bill['Quantity'],
        "unit_label"   => $bill['unit_label'],
        "actual_price" => $bill['actual_price'],
        "created_at"   => $bill['created_at']
    ]);
    exit;
}


if (isset($_GET['action']) && $_GET['action'] === 'search') {
    $keyword    = '%' . $conn->real_escape_string($_GET['q'] ?? '') . '%';
    $min_price  = isset($_GET['min']) ? floatval($_GET['min']) : 0;
    $max_price  = isset($_GET['max']) ? floatval($_GET['max']) : PHP_INT_MAX;
    $month      = $_GET['month'] ?? '';

    $sql = "
        SELECT 
            bill_id   AS id,
            bill_date AS date,
            bill_month AS month,
            Quantity  AS quantity,
            unit_label,
            actual_price
        FROM electricity.electricity_bills
        WHERE owner_id = ?
          AND (bill_month LIKE ? OR bill_date LIKE ?)
          AND COALESCE(actual_price, 0) >= ?
          AND COALESCE(actual_price, 0) <= ?
    ";

    $params = [$owner_id, $keyword, $keyword, $min_price, $max_price];
    $types  = "issdd";

    if ($month !== '') {
        $sql .= " AND bill_month = ?";
        $params[] = $month;
        $types .= "s";
    }

    $sql .= " ORDER BY bill_date DESC";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();

    $bills = [];
    while ($row = $result->fetch_assoc()) {
        $bills[] = [
            "id"             => $row['id'],
            "date"           => $row['date'],
            "month"          => $row['month'],
            "quantity"       => $row['quantity'],
            "unit_label"     => $row['unit_label'],
            "actual_price"   => $row['actual_price'],
            "store"          => "فاتورة الكهرباء",
            "total"          => $row['actual_price'] ?? 0,
            "payment_method" => "electricity",
            "type"           => "electricity"
        ];
    }

    echo json_encode($bills);
    exit;
}

echo json_encode(["error" => "طلب غير معروف"]);