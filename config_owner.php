<?php
$host = "mysql-ed7c027-saudanhar99-3cd7.h.aivencloud.com";
$user = "avnadmin";
$pass = "AVNS_byv7Lyu4ShxqWBE8YxI"; 
$db   = "defaultdb";
$port = 12561;

// 1. الاتصال بالسيرفر السحابي
$conn = new mysqli($host, $user, $pass, $db, $port);

if ($conn->connect_error) {
    die("فشل الاتصال بقاعدة البيانات: " . $conn->connect_error);
}

// 2. دالة تقرأ ملفات الـ SQL وتنفذها داخل Aiven
function executeSqlFile($connection, $filePath) {
    if (!file_exists($filePath)) {
        return; 
    }
    $sql = file_get_contents($filePath);
    // تنظيف الأوامر وتقسيمها
    $queries = explode(';', $sql);
    foreach ($queries as $query) {
        $query = trim($query);
        if (!empty($query)) {
            $connection->query($query);
        }
    }
}

// 3. بناء الجداول الأربعة تلقائياً
executeSqlFile($conn, "users1.sql");
executeSqlFile($conn, "owner1.sql");
executeSqlFile($conn, "invoice1.sql");
executeSqlFile($conn, "electricity1.sql");
?>