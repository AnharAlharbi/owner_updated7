<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

$conn = new mysqli("localhost", "root", "", "invoice");
if ($conn->connect_error) { 
    die(json_encode(["error" => "Database connection failed"])); 
}

if (isset($_GET['details_id'])) {
    $inv_id = intval($_GET['details_id']);

    $sql_info = "SELECT i.invoice_id, i.total_amount, i.tax_amount, i.tax_id,
                        i.invoice_date, i.invoice_day, i.invoice_time,
                        i.payment_method,
                        u.First_name, u.Last_name
                 FROM invoices_table i 
                 JOIN users.users u ON i.user_id = u.user_id 
                 WHERE i.invoice_id = ?";
    $stmt = $conn->prepare($sql_info);
    $stmt->bind_param("i", $inv_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (!empty($row['invoice_time'])) {
        $t = DateTime::createFromFormat('H:i:s', $row['invoice_time']);
        $row['invoice_time'] = $t ? $t->format('h:i A') : $row['invoice_time'];
    }

    $sql_items = "SELECT product_name, quantity, unit_price, subtotal 
                  FROM invoice_items WHERE invoice_id = ?";
    $stmt_items = $conn->prepare($sql_items);
    $stmt_items->bind_param("i", $inv_id);
    $stmt_items->execute();
    $items = $stmt_items->get_result()->fetch_all(MYSQLI_ASSOC);

    echo json_encode(["info" => $row, "items" => $items]);
    exit;
}

$owner_id = $_SESSION['owner_id'] ?? null;

if (!$owner_id) {
    echo json_encode(["error" => "Unauthorized"]);
    exit;
}

$sql = "SELECT i.invoice_id, i.total_amount,
               i.invoice_date, i.invoice_day, i.invoice_time,
               i.payment_method,
               u.First_name, u.Last_name
        FROM invoices_table i 
        JOIN users.users u ON i.user_id = u.user_id
        WHERE i.owner_id = ? 
        ORDER BY i.invoice_date DESC, i.invoice_time DESC";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $owner_id);
$stmt->execute();
$result = $stmt->get_result();

$invoices = [];
while ($row = $result->fetch_assoc()) {
    $time_fmt = '';
    if (!empty($row['invoice_time'])) {
        $t = DateTime::createFromFormat('H:i:s', $row['invoice_time']);
        $time_fmt = $t ? $t->format('h:i A') : $row['invoice_time'];
    }

    $invoices[] = [
        "display_id"     => "INV-" . str_pad(1000 + $row['invoice_id'], 4, '0', STR_PAD_LEFT),
        "real_id"        => $row['invoice_id'],
        "client"         => $row['First_name'] . " " . $row['Last_name'],
        "total_amount"   => (float)$row['total_amount'],
        "amount"         => number_format((float)$row['total_amount'], 2),
        "invoice_date"   => $row['invoice_date'],
        "invoice_day"    => $row['invoice_day'],
        "invoice_time"   => $time_fmt,
        "payment_method" => $row['payment_method']
    ];
}

echo json_encode($invoices);
$conn->close();
?>