<?php
header("Access-Control-Allow-Origin: https://owner-edac5.web.app");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = "localhost";
$db_name = "owner";
$username = "root";
$password = "";

try {
    $conn = new PDO("mysql:host=$host;dbname=$db_name", $username, $password);
    
    $data = json_decode(file_get_contents("php://input"));
    $email = $data->email;
    $newPass = $data->newPassword;

    $hashedPass = password_hash($newPass, PASSWORD_BCRYPT);

    $sql = "UPDATE owner SET password = ? WHERE email = ?";
    $stmt = $conn->prepare($sql);
    $stmt->execute([$hashedPass, $email]);

    echo json_encode(["status" => "success"]);
} catch(PDOException $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>