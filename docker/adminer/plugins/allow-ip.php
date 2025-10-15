<?php
class AdminerAllowIP {
  function loginForm() {
    $allowed = ['62.31.246.18', '185.82.159.57'];
    // Normalize possible IPv6-mapped IPv4s (::ffff:1.2.3.4)
    $remote = $_SERVER['REMOTE_ADDR'] ?? '';
    if (strpos($remote, '::ffff:') === 0) {
      $remote = substr($remote, 7);
    }

    // Check if allowed
    if (!in_array($remote, $allowed, true)) {
      header('HTTP/1.1 403 Forbidden');
      echo 'Access denied for IP: ' . htmlspecialchars($remote);
      exit;
    }

    return null;
  }
}
return new AdminerAllowIP();

