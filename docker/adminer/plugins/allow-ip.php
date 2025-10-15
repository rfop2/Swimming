<?php
class AdminerAllowIP {
  function loginForm() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';

    // Convert IPv6-mapped IPv4 (::ffff:x.x.x.x) to plain IPv4
    if (strpos($ip, '::ffff:') === 0) {
      $ip = substr($ip, 7);
    }

    // Read allowed IPs from environment variable
    $env = getenv('ADMINER_ALLOWED_IPS') ?: '';
    $allowed = array_map('trim', explode(',', $env));

    // Empty env = deny all (for safety)
    if (empty($allowed[0])) {
      header('HTTP/1.1 403 Forbidden');
      echo 'Access denied: no allowed IPs configured';
      exit;
    }

    if (!in_array($ip, $allowed, true)) {
      header('HTTP/1.1 403 Forbidden');
      echo 'Access denied for IP: ' . htmlspecialchars($ip);
      exit;
    }

    // Allow normal login
    return null;
  }
}

return new AdminerAllowIP();
