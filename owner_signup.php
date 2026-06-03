<?php
include 'config_owner.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $facility = $_POST['facilityName'];
    $crNumber = $_POST['crNumber'];
    $phone    = $_POST['phone'];
    $email    = $_POST['email'];
    $password = $_POST['password'];

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    $check = $conn->prepare("SELECT email FROM owner WHERE email = ? OR CR_Number = ?");
    $check->bind_param("ss", $email, $crNumber);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows > 0) {
        echo "exists";
    } else {
        $sql = "INSERT INTO owner (Facility_Name, email, password, Phone_number, CR_Number) VALUES (?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssss", $facility, $email, $hashed_password, $phone, $crNumber);

        if ($stmt->execute()) {
            echo "success";
        } else {
            echo "error";
        }
    }
}
$conn->close();
?>