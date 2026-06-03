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
-- Database: `owner`
--

-- --------------------------------------------------------

--
-- بنية الجدول `owner`
--

CREATE TABLE `owner` (
  `owner_id` int(11) NOT NULL,
  `Facility_Name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `Phone_number` varchar(150) NOT NULL,
  `CR_Number` varchar(15) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `monthly_target` decimal(12,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- إرجاع أو استيراد بيانات الجدول `owner`
--

INSERT INTO `owner` (`owner_id`, `Facility_Name`, `email`, `password`, `Phone_number`, `CR_Number`, `created_at`, `monthly_target`) VALUES
(1, 'restaurant', 'restaurant0192@gmail.com', '$2y$10$6G1IM.poBf3spTmDvCaj1uMzE75k.RRzXRVqwoTCxma7fVAW1u33S', '0500000000', '4032211456', '2026-04-19 19:15:41', 0.00),
(2, 'cafe', 'cafe3498@gmail.com', '$2y$10$O5K6MAdxrDOWwqFsImOvEeVMSMJqrG40xGZagJHU/BGdBY1fS7IoO', '0544111115', '7004589213', '2026-04-19 19:16:19', 0.00),
(3, 'Supermarket', 'Supermarket00063@gmail.com', '$2y$10$WOZ6dLGrFK0Z3cuU0Eu9aOnS.WN83nd42/byQLM.CDwTh673wIyZe', '0533333333', '1010123456', '2026-05-08 17:27:14', 0.00),
(4, 'electronics', 'electronics0015@gmail.com', '$2y$10$oDqnRkM6z0eIcQojNwF77.O8Pj4q3as/2qvryR2rfAHyGc7x.tgLm', '0522222222', '2056789123', '2026-05-08 17:28:28', 0.00);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `owner`
--
ALTER TABLE `owner`
  ADD PRIMARY KEY (`owner_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `Phone_number` (`Phone_number`),
  ADD UNIQUE KEY `CR_Number` (`CR_Number`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `owner`
--
ALTER TABLE `owner`
  MODIFY `owner_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
