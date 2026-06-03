<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

$host = "localhost";
$user = "root";
$pass = "";
$db   = "owner";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    echo json_encode(["error" => "Database connection failed"]);
    exit;
}

$owner_id = $_SESSION['owner_id'] ?? null;

if (!$owner_id) {
    echo json_encode(["error" => "not_logged_in"]);
    exit;
}

$stmt = $conn->prepare("SELECT owner_id, Facility_Name, email, Phone_number, CR_Number FROM owner WHERE owner_id = ?");
$stmt->bind_param("i", $owner_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["error" => "owner_not_found"]);
    exit;
}

$row = $result->fetch_assoc();

echo json_encode([
    "owner_id"      => $row['owner_id'],
    "facility_name" => $row['Facility_Name'],
    "email"         => $row['email'],
    "phone"         => $row['Phone_number'],
    "cr_number"     => $row['CR_Number']
]);

$stmt->close();
$conn->close();
?>
