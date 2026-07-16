<?php
// ⚠️ INTENTIONALLY VULNERABLE — FOR EDUCATIONAL USE ONLY
// PHP Code Injection Demo — Never run on a public server

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

$code = $_POST['code'] ?? $_GET['code'] ?? '';

if (empty($code)) {
    echo json_encode([
        'error' => 'No code provided',
        'hint'  => 'POST { code: "your php code" }',
        'examples' => [
            'phpinfo()',
            'echo shell_exec("id");',
            'echo file_get_contents("/etc/passwd");',
            'print_r(scandir("."));'
        ]
    ]);
    exit;
}

ob_start();
$error = null;

try {
    // INTENTIONALLY VULNERABLE: eval with user input
    eval($code); // Never do this in production!
} catch (Throwable $e) {
    $error = $e->getMessage();
}

$output = ob_get_clean();

echo json_encode([
    'code'     => $code,
    'output'   => $output,
    'error'    => $error,
    '_warning' => 'PHP Code Injection: eval() with user input — CRITICAL vulnerability'
]);
