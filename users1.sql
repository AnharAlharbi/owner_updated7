-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: 03 يونيو 2026 الساعة 06:54
-- إصدار الخادم: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `users`
--

-- --------------------------------------------------------

--
-- بنية الجدول `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `First_name` varchar(100) NOT NULL,
  `Last_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `google_id` varchar(128) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `users`
--

INSERT INTO `users` (`user_id`, `First_name`, `Last_name`, `email`, `password`, `phone`, `created_at`, `google_id`) VALUES
(1, 'anhar', 'alharbi', 'anharalharbi2003@gmail.com', '$2y$10$TUjgUtO1r5aEHCci3qD4fumv3B2exizbA3waE6sCjSRP9gc13mTju', '0552420520', '2026-04-19 18:48:32', NULL),
(2, 'Anhar ', 'Saud', 'saudanhar99@gmail.com', '$2y$10$p530Gjv655YvCIDdfh.EKOdB5WTYn5a9IYh.j15zZ6h4w27MzvLDi', '0552420524', '2026-05-18 02:03:51', 'aHtE0lVWxGO9rcpFdSwib2HF9Ip1'),
(3, 'shahad', 'fahad', 'shahadfahad0011@gmail.com', '$2y$10$L682wW4L//0NHH1rxuTBru.3Pg.A7zPnH1DoWsb.rc53fLXgCZzpi', '0503839747', '2026-05-18 02:09:46', NULL),
(4, 'rasis', 'Abdulrahman', 'rasis2222@gmail.com', '$2y$10$BAzqQd92Y11/wSJxYhJmnOnm278tSMTKzXKgxDTmZMwvYnE5XuR/W', '0504757960', '2026-05-18 02:12:14', NULL),
(5, 'Noor', 'Ali', 'noorali00948@gmail.com', '$2y$10$XHwjQHVkZck.3wyRpj2XweZO2uWOAjNRhUk/XEActpDkvJgP7uWc2', '0551020221', '2026-05-18 02:13:03', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone` (`phone`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
