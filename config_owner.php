<?php
// البيانات السحابية الجديدة من موقع Aiven
$host = "mysql-ed7c027-saudanhar99-3cd7.h.aivencloud.com";
$user = "avnadmin";
// ضع الرقم السري الطويل الذي نسخته بعد الضغط على العين 👁️ بين القوسين بالأسفل
$pass = "AVNS_bYv7LyU4ShxqWBE8YxI"; 
$db   = "defaultdb";
$port = 12561; // المنفذ الخاص بالسيرفر السحابي

// إنشاء الاتصال مع تمرير المنفذ (Port)
$conn = new mysqli($host, $user, $pass, $db, $port);

// التحقق من أن الاتصال يعمل بدون مشاكل
if ($conn->connect_error) {
    die("فشل الاتصال بقاعدة البيانات السحابية: " . $conn->connect_error);
}
?>