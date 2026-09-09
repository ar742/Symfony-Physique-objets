<?php
require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$errors = [];
$checks = 0;
$check = function (bool $ok, string $message) use (&$errors, &$checks): void { $checks++; if (!$ok) { $errors[] = $message; } };
$pages = [];
foreach (['/' => 200, '/recueils/' => 200, '/presentation/' => 200, '/topic/' => 200, '/phys/2' => 200, '/recueils/inconnu/document' => 404, '/recueils/..%2F.env/document' => 404] as $path => $status) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === $status, 'Route '.$path);
    $pages[$path] = $response->getContent();
}
$home = $pages['/'];
$check(substr_count($home, ' data-loop-node') === 6, 'Six étapes attendues');
$check(substr_count($home, 'role="tooltip"') === 6, 'Six info-bulles attendues');
foreach (range(1, 6) as $id) {
    $check(str_contains($home, 'href="#etape-'.$id.'"'), 'Lien étape '.$id);
    $check(str_contains($home, 'id="etape-'.$id.'"'), 'Destination étape '.$id);
    $check(str_contains($home, 'aria-describedby="loop-tip-'.$id.'"'), 'Description étape '.$id);
    $check(str_contains($home, 'aria-controls="loop-tip-'.$id.'"'), 'Commande tactile étape '.$id);
}
$library = new App\Content\SourceLibrary(dirname(__DIR__));
foreach ($library->all() as $source) {
    foreach ($source['entries'] as $entry) {
        $check(str_contains($pages['/recueils/'], 'id="'.$source['key'].'-'.$entry['code'].'"'), 'Repère '.$entry['code']);
        $check(str_contains($pages['/recueils/'], '/recueils/'.$source['key'].'/document#page='.$entry['page'].'"'), 'Page '.$entry['code']);
    }
    $file = getenv('SOURCE_PDF_DIR').'/'.$source['filename'];
    $check(hash_file('sha256', $file) === $source['sha256'], 'Empreinte du PDF '.$source['key']);
    $url = 'http://127.0.0.1/recueils/'.$source['key'].'/document';
    $curl = curl_init($url);
    curl_setopt_array($curl, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_HEADER => true, CURLOPT_TIMEOUT => 30]);
    $headers = curl_exec($curl);
    $check(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) === 200, 'HEAD PDF '.$source['key']);
    $check(str_contains(strtolower($headers), 'content-type: application/pdf'), 'Type PDF '.$source['key']);
    $check(str_contains(strtolower($headers), 'content-length: '.filesize($file)), 'Taille PDF '.$source['key']);
    curl_setopt_array($curl, [CURLOPT_NOBODY => false, CURLOPT_HTTPGET => true, CURLOPT_HEADER => false, CURLOPT_RANGE => '0-4']);
    $bytes = curl_exec($curl);
    $check(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) === 206 && $bytes === '%PDF-', 'Lecture partielle PDF '.$source['key']);
    unset($curl);
}
foreach (['/', '/recueils/', '/styles/loop.css', '/scripts/loop.js'] as $asset) {
    $curl = curl_init('http://127.0.0.1'.$asset);
    curl_setopt_array($curl, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20]);
    curl_exec($curl);
    $check(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) === 200, 'Ressource '.$asset);
    unset($curl);
}
$check(str_contains($pages['/topic/'], 'Archives') && str_contains($pages['/phys/2'], 'Archive de 2018'), 'Statut du contenu historique');
$result = ['checks' => $checks, 'source_entries' => 91, 'loop_steps' => 6, 'browser_visual_test' => false, 'errors' => $errors];
file_put_contents(dirname(__DIR__).'/var/loop-verification.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n";
exit($errors ? 1 : 0);
