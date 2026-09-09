<?php
require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$library = new App\Content\LearningLibrary(dirname(__DIR__), new App\Content\SourceLibrary(dirname(__DIR__)));
$domains = new App\Content\DomainLibrary(dirname(__DIR__), $library, new App\Content\SourceLibrary(dirname(__DIR__)));
$checks = 0;
$errors = [];
$check = function (bool $ok, string $message) use (&$checks, &$errors): void {
    $checks++;
    if (!$ok) { $errors[] = $message; }
};
$paths = ['/', '/recueils/', '/fiches/', '/fiches/corrections', '/domaines/'];
foreach ($domains->available() as $domain) { $paths[] = '/domaines/'.$domain['slug']; }
foreach (range(1, 6) as $base) { $paths[] = '/boucle/'.$base; }
foreach ($library->all() as $card) { $paths[] = '/fiches/'.$card['slug']; }
$documents = [];
foreach ($paths as $path) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === 200, 'Route '.$path);
    $document = new DOMDocument();
    $document->loadHTML('<?xml encoding="UTF-8">'.$response->getContent(), LIBXML_NOERROR | LIBXML_NOWARNING);
    $documents[$path] = $document;
    $ids = [];
    foreach ((new DOMXPath($document))->query('//*[@id]') as $element) {
        $id = $element->getAttribute('id');
        $check(!isset($ids[$id]), 'ID répété '.$path.'#'.$id);
        $ids[$id] = true;
    }
    foreach ((new DOMXPath($document))->query('//*[@aria-controls or @aria-describedby or @aria-labelledby]') as $element) {
        foreach (['aria-controls', 'aria-describedby', 'aria-labelledby'] as $attribute) {
            foreach (preg_split('/\s+/', trim($element->getAttribute($attribute)), flags: PREG_SPLIT_NO_EMPTY) as $id) {
                $check(isset($ids[$id]), 'Description absente '.$path.'#'.$id);
            }
        }
    }
    if (str_starts_with($path, '/boucle/')) {
        $check((new DOMXPath($document))->query('//*[@data-loop-node]')->length === 6, 'Six nœuds '.$path);
        $check((new DOMXPath($document))->query('//*[@role="tooltip"]')->length === 6, 'Six infos '.$path);
    }
    if (str_starts_with($path, '/domaines/') && $path !== '/domaines/') {
        $domain = $domains->find(substr($path, strlen('/domaines/')));
        $xpath = new DOMXPath($document);
        foreach ($domain['loops'] as $group) {
            $panels = $xpath->query('//section[@aria-labelledby="'.$group['anchor'].'"]');
            $check($panels->length === 1, 'Boucle unique '.$group['anchor']);
            if ($panels->length !== 1) { continue; }
            $panel = $panels->item(0);
            $check($xpath->query('.//*[@data-loop-node]', $panel)->length === 6, 'Six nœuds '.$group['anchor']);
            $check($xpath->query('.//*[@role="tooltip"]', $panel)->length === 6, 'Six infos '.$group['anchor']);
        }
    }
    if (str_starts_with($path, '/fiches/') && $path !== '/fiches/' && $path !== '/fiches/corrections') {
        $card = $library->find(substr($path, strlen('/fiches/')));
        $domainCards = $domains->find($card['domain'])['cards'];
        $index = array_search($card['slug'], array_column($domainCards, 'slug'), true);
        $expected = [];
        if (isset($domainCards[$index - 1])) { $expected[] = '/fiches/'.$domainCards[$index - 1]['slug']; }
        $expected[] = isset($domainCards[$index + 1]) ? '/fiches/'.$domainCards[$index + 1]['slug'] : '/fiches/';
        $actual = [];
        foreach ((new DOMXPath($document))->query('//nav[@aria-label="Parcours de lecture"]/a') as $link) { $actual[] = $link->getAttribute('href'); }
        $check($expected === $actual, 'Pagination du domaine '.$card['slug']);
    }
}
foreach ($documents as $path => $document) {
    foreach ($document->getElementsByTagName('a') as $link) {
        $url = parse_url(html_entity_decode($link->getAttribute('href')));
        if (isset($url['host'])) { continue; }
        $targetPath = $url['path'] ?? $path;
        // Existing archive routes and PDFs are checked by verify-loop / verify-catalog.
        if (!isset($documents[$targetPath])) {
            if (str_starts_with($targetPath, '/boucle/') || str_starts_with($targetPath, '/fiches/') || str_starts_with($targetPath, '/domaines/')) {
                $check(false, 'Destination inconnue '.$targetPath);
            }
            continue;
        }
        if (isset($url['fragment'])) {
            $id = rawurldecode($url['fragment']);
            $check($documents[$targetPath]->getElementById($id) !== null, 'Ancre absente '.$path.' → '.$targetPath.'#'.$id);
        }
    }
}
foreach (['/boucle/0', '/boucle/7', '/fiches/inconnue', '/fiches/..%2F.env', '/domaines/inconnu', '/domaines/optique', '/domaines/..%2F.env'] as $path) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === 404, 'Route invalide '.$path);
}
foreach (['/boucle/2', '/fiches/boltzmann', '/domaines/mecanique', '/fiches/lagrange-hamilton', '/domaines/fluides-ondes', '/fiches/onde-acoustique', '/styles/science.css', '/scripts/theme.js'] as $path) {
    $curl = curl_init('http://127.0.0.1'.$path);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30]);
    $html = curl_exec($curl);
    $check(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) === 200, 'HTTP '.$path);
    $check(is_string($html) && strlen($html) > 100, 'Contenu HTTP '.$path);
    unset($curl);
}
$result = ['checks' => $checks, 'pages' => count($documents), 'substeps' => 36, 'domain_steps' => array_sum(array_map(static fn (array $domain): int => count($domain['steps']), $domains->all())), 'cards' => count($library->all()), 'corrections' => array_sum(array_map(static fn (array $card): int => count($card['corrections']), $library->all())), 'browser_visual_test' => false, 'errors' => $errors];
file_put_contents(dirname(__DIR__).'/var/learning-verification.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n";
exit($errors ? 1 : 0);
