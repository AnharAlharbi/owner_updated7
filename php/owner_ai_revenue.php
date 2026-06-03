<?php


header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

//  Config
define('ANALYTICS_API', getenv('ANALYTICS_API_URL') ?: 'http://localhost:8000');


$raw  = file_get_contents('php://input');
$body = json_decode($raw, true) ?: [];


$ch = curl_init(ANALYTICS_API . '/api/ai_revenue');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($body),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_CONNECTTIMEOUT => 5,
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);


if ($curl_error) {
    http_response_code(503);
    echo json_encode([
        'error'   => 'Analytics API غير متاح: ' . $curl_error,
        'detail'  => 'تأكد أن analytics_api.py يعمل على localhost:8000',
    ]);
    exit;
}

http_response_code($http_code ?: 500);
echo $response;
?>
