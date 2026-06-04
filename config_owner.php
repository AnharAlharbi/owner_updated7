<?php
$host = "b8vqttzxaoslymdefn1b-mysql.services.clever-cloud.com";
$user = "upbsighfzyqfsg2q";
$pass = "نسخي_كلمة_المرور_من_الموقع"; // انقري على أيقونة العين في الموقع لإظهارها ونسخها
$db   = "b8vqttzxaoslymdefn1b";
$port = 3306;

$conn = new mysqli($host, $user, $pass, $db, $port);

if ($conn->connect_error) {
    die("فشل الاتصال: " . $conn->connect_error);
}
?>