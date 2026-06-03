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

// 2. دالة ذكية لتشغيل ملفات الـ SQL تلقائياً إذا لم تكن الجداول موجودة
function deploySqlFile($connection, $fileName) {
    if (!file_exists($fileName)) {
        return; // إذا كان الملف غير موجود يتخطاه
    }
    
    $sql = file_get_contents($fileName);
    // تقسيم الأوامر عند كل فاصلة منقوطة ;
    $queries = explode(';', $sql);
    
    foreach ($queries as $query) {
        $query = trim($query);
        if (!empty($query)) {
            $connection->query($query);
        }
    }
}

// 3. تشغيل ملفات الـ SQL الأربعة وبناء الجداول فوراً
deploySqlFile($conn, "users1.sql");
deploySqlFile($conn, "owner1.sql");
deploySqlFile($conn, "invoice1.sql");
deploySqlFile($conn, "electricity1.sql");
?>

