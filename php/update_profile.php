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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["error" => "Invalid request method"]);
    exit;
}

$facility_name = trim($_POST['facility_name'] ?? '');
$cr_number     = trim($_POST['cr_number']     ?? '');
$email         = trim($_POST['email']         ?? '');
$phone         = trim($_POST['phone']         ?? '');

if (empty($facility_name) || empty($email) || empty($phone)) {
    echo json_encode(["error" => "empty_fields"]);
    exit;
}

$check = $conn->prepare("SELECT owner_id FROM owner WHERE email = ? AND owner_id != ?");
$check->bind_param("si", $email, $owner_id);
$check->execute();
if ($check->get_result()->num_rows > 0) {
    echo json_encode(["error" => "email_taken"]);
    exit;
}
$check->close();

if (!empty($cr_number)) {
    $checkCR = $conn->prepare("SELECT owner_id FROM owner WHERE CR_Number = ? AND owner_id != ?");
    $checkCR->bind_param("si", $cr_number, $owner_id);
    $checkCR->execute();
    if ($checkCR->get_result()->num_rows > 0) {
        echo json_encode(["error" => "cr_taken"]);
        exit;
    }
    $checkCR->close();
}

$stmt = $conn->prepare("UPDATE owner SET Facility_Name = ?, CR_Number = ?, email = ?, Phone_number = ? WHERE owner_id = ?");
$stmt->bind_param("ssssi", $facility_name, $cr_number, $email, $phone, $owner_id);

if ($stmt->execute()) {
    $_SESSION['owner_name'] = $facility_name;
    echo json_encode(["success" => true, "facility_name" => $facility_name]);
} else {
    echo json_encode(["error" => "update_failed"]);
}

$stmt->close();
$conn->close();
?>
