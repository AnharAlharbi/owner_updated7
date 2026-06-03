<?php
session_start(); 

error_reporting(0);
ini_set('display_errors', 0);

$host = "localhost";
$user = "root";
$pass = "";
$db   = "owner"; 

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("database_connection_error");
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';

    if (empty($email) || empty($password)) {
        die("empty_fields");
    }

    $stmt = $conn->prepare("SELECT owner_id, Facility_Name, password FROM owner WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();

        if (password_verify($password, $row['password']) || $password === $row['password']) {
            $_SESSION['owner_id']   = $row['owner_id'];
            $_SESSION['owner_name'] = $row['Facility_Name'];
            echo "success";

        } else {
            $firebase_api_key = "AIzaSyCiszOG1eVQM6n9fAu6Zb7zTwXEa-mOk_E";
            $firebase_url     = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" . $firebase_api_key;

            $payload = json_encode([
                "email"             => $email,
                "password"          => $password,
                "returnSecureToken" => true
            ]);

            $ch = curl_init($firebase_url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            $firebase_response = curl_exec($ch);
            curl_close($ch);

            $firebase_data = json_decode($firebase_response, true);

            if (isset($firebase_data['idToken'])) {
                $new_hash = password_hash($password, PASSWORD_BCRYPT);
                $update   = $conn->prepare("UPDATE owner SET password = ? WHERE email = ?");
                $update->bind_param("ss", $new_hash, $email);
                $update->execute();
                $update->close();

                $_SESSION['owner_id']   = $row['owner_id'];
                $_SESSION['owner_name'] = $row['Facility_Name'];
                echo "success";
            } else {
                echo "wrong_password";
            }
        }
    } else {
        echo "email_not_found";
    }
    $stmt->close();
}
$conn->close();
?>