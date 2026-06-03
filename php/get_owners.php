<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost", "root", "", "owner");

if ($conn->connect_error) {
    die(json_encode([]));
}

$result = $conn->query("SELECT * FROM owner");
$owners = [];

while($row = $result->fetch_assoc()) {
    $owners[] = $row;
}

echo json_encode($owners);
$conn->close();
?>