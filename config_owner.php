<?php
$host = "mysql-ed7c027-saudanhar99-3cd7.h.aivencloud.com";
$user = "avnadmin";
$pass = "AVNS_byv7Lyu4ShxqWBE8YxI"; 
$db   = "defaultdb";
$port = 12561;

// 1. الاتصال بالسيرفر السحابي Aiven
$conn = new mysqli($host, $user, $pass, $db, $port);

if ($conn->connect_error) {
    die("فشل الاتصال بقاعدة البيانات: " . $conn->connect_error);
}

// 2. دالة ذكية تقرأ وترفع ملفات الـ SQL تلقائياً بمسارها الحقيقي
function executeSqlFileOnCloud($connection, $fileName) {
    // تحديد المسار الكامل للملف داخل سيرفر Render
    $filePath = __DIR__ . '/' . $fileName;
    
    if (!file_exists($filePath)) {
        return; 
    }
    
    $sql = file_get_contents($filePath);
    $queries = explode(';', $sql);
    foreach ($queries as $query) {
        $query = trim($query);
        if (!empty($query)) {
            $connection->query($query);
        }
    }
}

// 3. قراءة ورفع الجداول الأربعة فوراً
executeSqlFileOnCloud($conn, "users1.sql");
executeSqlFileOnCloud($conn, "owner1.sql");
executeSqlFileOnCloud($conn, "invoice1.sql");
executeSqlFileOnCloud($conn, "electricity1.sql");
?>