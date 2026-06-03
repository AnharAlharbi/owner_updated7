<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
 
$owner_id = $_SESSION['owner_id'] ?? null;
 
echo json_encode([
    "owner_id" => $owner_id ? intval($owner_id) : null
]);
?>