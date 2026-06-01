<?php
/**
 * contact-process.php
 * Handles both brand and corporate form submissions.
 * Sends a formatted HTML email to TEXMORRO and returns JSON.
 *
 * No data is stored — this script only reads POST fields,
 * composes an email, sends it, then discards everything.
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

/* ── Configuration ──────────────────────────────────────── */
define('TO_EMAIL',   'info@texmorro.com');
define('TO_NAME',    'TEXMORRO Enquiries');
define('FROM_EMAIL', 'noreply@texmorro.com');   // must be on your mail server
define('FROM_NAME',  'TEXMORRO Website');

/* ── Helpers ─────────────────────────────────────────────── */
function clean(string $val): string {
    return htmlspecialchars(strip_tags(trim($val)), ENT_QUOTES, 'UTF-8');
}

function field(string $label, string $value): string {
    if ($value === '') return '';
    return '<tr>
        <td style="padding:8px 16px 8px 0;font-weight:600;color:#0b2b3f;white-space:nowrap;vertical-align:top;">'
            . $label . '</td>
        <td style="padding:8px 0;color:#444;">' . $value . '</td>
    </tr>';
}

function respond(bool $ok, string $message): void {
    echo json_encode(['success' => $ok, 'message' => $message]);
    exit;
}

/* ── Validate request ────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Invalid request.');
}

$type = clean($_POST['form_type'] ?? '');
if (!in_array($type, ['brand', 'corporate', 'sample'], true)) {
    respond(false, 'Unknown form type.');
}

/* ── Honeypot (basic bot protection) ────────────────────── */
if (!empty($_POST['website'])) {
    // Bot filled the hidden honeypot field — silently succeed
    respond(true, 'sent');
}

/* ── Rate-limit by IP (simple session-based) ────────────── */
session_start();
$ip_key = 'last_submit_' . md5($_SERVER['REMOTE_ADDR']);
if (isset($_SESSION[$ip_key]) && (time() - $_SESSION[$ip_key]) < 60) {
    respond(false, 'Please wait a moment before submitting again.');
}
$_SESSION[$ip_key] = time();

/* ── Collect and sanitise fields ────────────────────────── */
$name    = clean($_POST['name']  ?? '');
$email   = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$phone   = clean($_POST['phone'] ?? '');

if (!$name || !$email || !$phone) {
    respond(false, 'Please fill in all required fields.');
}

/* ── Build email rows depending on form type ─────────────── */
$rows = '';

if ($type === 'brand') {
    $brand       = clean($_POST['brand_name']    ?? '');
    $location    = clean($_POST['location']      ?? '');
    $stage_type  = clean($_POST['brand_stage_type'] ?? '');
    $products    = clean($_POST['products']      ?? '');
    $quantity    = clean($_POST['quantity']      ?? '');
    $prod_stage  = clean($_POST['prod_stage']    ?? '');
    $has_design  = clean($_POST['has_design']    ?? '');
    $notes       = clean($_POST['notes']         ?? '');

    $subject     = '👕 Brand Enquiry: ' . ($brand ?: $name) . ' — TEXMORRO';

    $rows .= field('Name',             $name);
    $rows .= field('Email',            $email);
    $rows .= field('Phone',            $phone);
    $rows .= field('Brand Name',       $brand);
    $rows .= field('Location',         $location);
    $rows .= field('Brand Stage',      $stage_type === 'new' ? 'New Brand' : ($stage_type === 'existing' ? 'Existing Brand' : ''));
    $rows .= field('Products',         $products);
    $rows .= field('Quantity',         $quantity);
    $rows .= field('Production Stage', $prod_stage);
    $rows .= field('Has Design',       $has_design === 'yes' ? 'Yes' : ($has_design === 'no' ? 'No' : ''));
    $rows .= field('Notes',            $notes);
} elseif ($type === 'sample') {
    $product     = clean($_POST['product']     ?? '');
    $fabric      = clean($_POST['fabric']      ?? '');
    $sample_qty  = clean($_POST['sample_qty']  ?? '');
    $has_design  = clean($_POST['has_design']  ?? '');
    $notes       = clean($_POST['notes']       ?? '');

    $subject     = '🧵 Sample Request: ' . ($product ?: $name) . ' — TEXMORRO';

    $rows .= field('Name',       $name);
    $rows .= field('Email',      $email);
    $rows .= field('Phone',      $phone);
    $rows .= field('Product',    $product);
    $rows .= field('Fabric',     $fabric);
    $rows .= field('Samples',    $sample_qty);
    $rows .= field('Has Design', $has_design === 'yes' ? 'Yes' : ($has_design === 'no' ? 'No – needs guidance' : ''));
    $rows .= field('Notes',      $notes);
} else {
    $company     = clean($_POST['company']       ?? '');
    $requirements = clean($_POST['requirements'] ?? '');
    $quantity    = clean($_POST['quantity']      ?? '');
    $timeline    = clean($_POST['timeline']      ?? '');
    $prod_type   = clean($_POST['product_type']  ?? '');
    $branding    = clean($_POST['branding']      ?? '');
    $notes       = clean($_POST['notes']         ?? '');

    $subject     = '🏢 Corporate Enquiry: ' . ($company ?: $name) . ' — TEXMORRO';

    $rows .= field('Name',         $name);
    $rows .= field('Company',      $company);
    $rows .= field('Email',        $email);
    $rows .= field('Phone',        $phone);
    $rows .= field('Requirements', $requirements);
    $rows .= field('Quantity',     $quantity);
    $rows .= field('Timeline',     $timeline);
    $rows .= field('Product Type', $prod_type);
    $rows .= field('Branding',     $branding);
    $rows .= field('Notes',        $notes);
}

/* ── Build HTML email ────────────────────────────────────── */
$label = $type === 'brand' ? '👕 Brand Production Enquiry' : '🏢 Corporate / Bulk Order Enquiry';
$color = $type === 'brand' ? '#0b2b3f' : '#0b2b3f';

$html = '<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:\'Plus Jakarta Sans\',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:' . $color . ';padding:32px 40px;">
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:0.06em;text-transform:uppercase;">New Enquiry</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#fbe87e;">' . $label . '</h1>
        </td>
      </tr>

      <!-- Fields -->
      <tr>
        <td style="padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">'
              . $rows .
          '</table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f4f6f8;padding:20px 40px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            This enquiry was submitted via the TEXMORRO website contact form.<br>
            Reply directly to <strong>' . $email . '</strong> to respond to this lead.<br>
            <em>No data has been stored by the server.</em>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>';

/* ── Send ────────────────────────────────────────────────── */
$boundary = md5(time());

$headers  = 'MIME-Version: 1.0' . "\r\n";
$headers .= 'Content-Type: multipart/alternative; boundary="' . $boundary . '"' . "\r\n";
$headers .= 'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>' . "\r\n";
$headers .= 'Reply-To: ' . $name . ' <' . $email . '>' . "\r\n";
$headers .= 'X-Mailer: PHP/' . phpversion() . "\r\n";

// Plain text fallback
$plain  = strip_tags(str_replace(['<tr>', '</tr>', '<td>', '</td>'], ["\n", '', ' ', ''], $rows));

$body  = '--' . $boundary . "\r\n";
$body .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n\r\n";
$body .= $plain . "\r\n\r\n";
$body .= '--' . $boundary . "\r\n";
$body .= 'Content-Type: text/html; charset=UTF-8' . "\r\n\r\n";
$body .= $html . "\r\n\r\n";
$body .= '--' . $boundary . '--';

$sent = mail(TO_EMAIL, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

if ($sent) {
    respond(true, 'sent');
} else {
    respond(false, 'Email could not be sent. Please contact us directly on WhatsApp.');
}
