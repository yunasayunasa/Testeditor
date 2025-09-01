<?php
header('Content-Type: application/json');
$dir = filter_input(INPUT_GET, 'dir', FILTER_SANITIZE_STRING);
if ($dir && is_dir($dir)) {
    $files = array_diff(scandir($dir), array('..', '.'));
    echo json_encode(array_values($files));
} else {
    echo json_encode([]);
}
?>