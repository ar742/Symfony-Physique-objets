<?php

require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');

$root = dirname(__DIR__);
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$productionPath = '/graphes/production';
$graphPaths = ['/graphes/', '/graphes/dependances', $productionPath];
$checks = 0;
$errors = [];
$documents = [];
$httpRequests = 0;
$dynamicAnchors = 0;
$check = function (bool $ok, string $message) use (&$checks, &$errors): void {
    $checks++;
    if (!$ok) { $errors[] = $message; }
};
$fetch = function (string $path) use ($kernel, $check, &$documents): DOMDocument {
    if (isset($documents[$path])) { return $documents[$path]; }
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === 200, 'Rendu GET '.$path);
    $document = new DOMDocument();
    $document->loadHTML('<?xml encoding="UTF-8">'.$response->getContent(), LIBXML_NOERROR | LIBXML_NOWARNING);
    $xpath = new DOMXPath($document);
    $ids = [];
    foreach ($xpath->query('//*[@id]') as $element) {
        $id = $element->getAttribute('id');
        $check(!isset($ids[$id]), 'ID répété '.$path.'#'.$id);
        $ids[$id] = true;
    }
    foreach ($xpath->query('//*[@aria-controls or @aria-describedby or @aria-labelledby or @aria-owns]') as $element) {
        foreach (['aria-controls', 'aria-describedby', 'aria-labelledby', 'aria-owns'] as $attribute) {
            foreach (preg_split('/\s+/', trim($element->getAttribute($attribute)), flags: PREG_SPLIT_NO_EMPTY) as $id) {
                $check(isset($ids[$id]), 'Repère ARIA absent '.$path.'#'.$id);
            }
        }
    }
    foreach ($xpath->query('//label[@for]') as $label) {
        $check(isset($ids[$label->getAttribute('for')]), 'Champ du libellé absent '.$path.'#'.$label->getAttribute('for'));
    }
    return $documents[$path] = $document;
};
$hasName = function (DOMElement $element, DOMXPath $xpath): bool {
    if (trim($element->getAttribute('aria-label')) !== '') { return true; }
    $text = '';
    foreach (preg_split('/\s+/', trim($element->getAttribute('aria-labelledby')), flags: PREG_SPLIT_NO_EMPTY) as $id) {
        $text .= $element->ownerDocument->getElementById($id)?->textContent ?? '';
    }
    if (trim($text) !== '') { return true; }
    foreach ($xpath->query('ancestor::label | //label[@for="'.$element->getAttribute('id').'"] | ./*[local-name()="title"]', $element) as $label) {
        if (trim($label->textContent) !== '') { return true; }
    }
    return false;
};

try {
    $check($kernel->getContainer()->get('router')->generate('graph_production') === $productionPath, 'Nom de route graph_production');
} catch (Symfony\Component\Routing\Exception\RouteNotFoundException) {
    $check(false, 'Nom de route graph_production absent');
}
$home = $fetch('/');
$check((new DOMXPath($home))->query('//main//a[@href="'.$productionPath.'"]')->length > 0, 'Accès à la production depuis le contenu de l’accueil');
foreach ($graphPaths as $path) {
    $document = $fetch($path);
    $xpath = new DOMXPath($document);
    $check($xpath->query('//header//nav//a[@href="/graphes/" and (@aria-current="page" or @aria-current="true")]')->length === 1, 'Navigation Graphes active '.$path);
    $tabs = '//nav[contains(concat(" ",normalize-space(@class)," ")," graph-tabs ")]';
    foreach ($graphPaths as $target) { $check($xpath->query($tabs.'/a[@href="'.$target.'"]')->length === 1, 'Onglet '.$target.' depuis '.$path); }
    $check($xpath->query($tabs.'/a[@href="'.$path.'" and @aria-current="page"]')->length === 1, 'Onglet courant '.$path);
}

$document = $documents[$productionPath];
$xpath = new DOMXPath($document);
$requiredElement = function (string $id, ?string $tag = null) use ($document, $check): ?DOMElement {
    $element = $document->getElementById($id);
    $check($element !== null && ($tag === null || strtolower($element->tagName) === $tag), 'Élément de production '.$id.($tag === null ? '' : ' ('.$tag.')'));
    return $element;
};
$check($xpath->query('//*[@data-graph-study]')->length === 1, 'Une étude sur la page de production');
$check($xpath->query('//*[@data-graph-study="production"]')->length === 1, 'Marqueur de l’étude production');
foreach (['production-map', 'production-curve', 'production-history-chart'] as $id) {
    $svg = $requiredElement($id, 'svg');
    if ($svg !== null) { $check($hasName($svg, $xpath), 'Nom accessible du SVG '.$id); }
}
$requiredElement('production-controls', 'form');
foreach (['production-preset' => ['balanced', 'threshold', 'oscillating'], 'production-machine' => ['M1', 'M2', 'M3']] as $id => $expected) {
    $select = $requiredElement($id, 'select');
    if ($select === null) { continue; }
    $actual = [];
    foreach ($xpath->query('.//option', $select) as $option) { $actual[] = $option->getAttribute('value'); }
    sort($actual);
    sort($expected);
    $check($actual === $expected, 'Choix du sélecteur '.$id);
    $check($hasName($select, $xpath), 'Nom accessible '.$id);
}
foreach (['a', 'b', 'c', 'd', 'external', 'initial'] as $parameter) {
    $input = $requiredElement('machine-'.$parameter, 'input');
    if ($input === null) { continue; }
    $check($input->getAttribute('type') === 'number' && $input->hasAttribute('required'), 'Paramètre numérique obligatoire machine-'.$parameter);
    $check($hasName($input, $xpath), 'Nom accessible machine-'.$parameter);
}
$cycles = $requiredElement('production-cycles', 'input');
if ($cycles !== null) {
    foreach (['type' => 'number', 'min' => '1', 'max' => '200', 'value' => '40'] as $attribute => $expected) {
        $check($cycles->getAttribute($attribute) === $expected, 'Cycles de production : '.$attribute);
    }
    $check($hasName($cycles, $xpath), 'Nom accessible du nombre de cycles');
}
foreach (['production-results', 'production-flows', 'production-history'] as $id) { $requiredElement($id); }
$alert = $requiredElement('production-error');
if ($alert !== null) { $check($alert->getAttribute('role') === 'alert', 'Annonce accessible des erreurs de production'); }

$inspector = $requiredElement('production-inspector');
if ($inspector !== null) {
    $nodes = $xpath->query('.//*[@data-loop-node]/a', $inspector);
    $check($nodes->length === 3, 'Trois positions du triplet de production');
    $check($xpath->query('.//*[@role="tooltip"]', $inspector)->length === 3, 'Trois info-bulles du triplet');
    $check($xpath->query('.//*[@data-graph-point]', $inspector)->length === 3, 'Trois descriptions du triplet');
    foreach ([1, 2, 3] as $id) {
        $point = $xpath->query('.//*[@data-graph-point="'.$id.'"]', $inspector);
        $check($point->length === 1, 'Position locale de production '.$id.'.0');
        if ($point->length === 1) {
            $check($point->item(0)->getAttribute('id') !== '', 'Identifiant statique de la position '.$id.'.0');
            $check($nodes->item($id - 1)?->getAttribute('href') === '#'.$point->item(0)->getAttribute('id'), 'Lien statique vers la position '.$id.'.0');
        }
    }
}
$check($xpath->query('//head/script[@type="module" and @src="/scripts/production-study.mjs"]')->length === 1, 'Module de production déclaré dans head');
$check($xpath->query('//head/link[@rel="stylesheet" and @href="/styles/production-study.css"]')->length === 1, 'Style de production déclaré dans head');

// Inspect the production page's links; other workshops retain their own detailed verifier.
foreach ($document->getElementsByTagName('a') as $link) {
    $url = parse_url(html_entity_decode($link->getAttribute('href')));
    if ($url === false || isset($url['host']) || isset($url['scheme'])) { continue; }
    $targetPath = $url['path'] ?? $productionPath;
    if (str_starts_with($targetPath, '/graphes')) { $check(in_array($targetPath, $graphPaths, true), 'Destination du volet Graphes '.$targetPath); }
    if (!isset($documents[$targetPath], $url['fragment'])) { continue; }
    $fragment = rawurldecode($url['fragment']);
    if ($targetPath === $productionPath && str_starts_with($fragment, 'machine-M')) {
        $dynamicAnchors++;
        $check(preg_match('/^machine-M[1-3]-1b-[1-3]\.0$/', $fragment) === 1, 'Format de l’ancre créée en JavaScript '.$fragment);
        continue;
    }
    $check($documents[$targetPath]->getElementById($fragment) !== null, 'Ancre statique absente '.$targetPath.'#'.$fragment);
}
foreach ([['HEAD', $productionPath, 200], ['POST', $productionPath, 405], ['GET', $productionPath.'/inconnu', 404]] as [$method, $path, $status]) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path, $method), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === $status, 'Route '.$method.' '.$path);
}

$baseUrl = rtrim(getenv('VERIFY_BASE_URL') ?: 'http://127.0.0.1', '/');
$requests = [
    ['GET', $productionPath, 200], ['HEAD', $productionPath, 200], ['POST', $productionPath, 405], ['GET', $productionPath.'/inconnu', 404],
    ['GET', '/scripts/production-study.mjs', 200], ['GET', '/scripts/production-engine.mjs', 200], ['GET', '/styles/production-study.css', 200],
];
foreach ($requests as [$method, $path, $status]) {
    $curl = curl_init($baseUrl.$path);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30]);
    if ($method === 'HEAD') { curl_setopt($curl, CURLOPT_NOBODY, true); }
    elseif ($method === 'POST') { curl_setopt($curl, CURLOPT_POST, true); }
    $body = curl_exec($curl);
    $httpRequests++;
    $check(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) === $status, 'HTTP '.$method.' '.$path);
    if ($method === 'GET' && $status === 200) {
        $check(is_string($body) && trim($body) !== '', 'Contenu HTTP '.$path);
        if ($path === $productionPath) { $check(is_string($body) && str_contains($body, 'data-graph-study="production"'), 'Étude de production servie en HTTP'); }
        $mime = strtolower(trim(explode(';', curl_getinfo($curl, CURLINFO_CONTENT_TYPE) ?: '')[0]));
        if (str_ends_with($path, '.mjs')) {
            $check(in_array($mime, ['text/javascript', 'application/javascript', 'application/x-javascript', 'text/ecmascript', 'application/ecmascript'], true), 'MIME de module JavaScript '.$path);
        } elseif (str_ends_with($path, '.css')) { $check($mime === 'text/css', 'MIME CSS '.$path); }
    }
    unset($curl);
}

$result = [
    'checks' => $checks, 'rendered_pages' => count($documents), 'production_studies' => 1, 'http_requests' => $httpRequests,
    'dynamic_anchor_formats_checked' => $dynamicAnchors, 'browser_visual_test' => false, 'javascript_executed' => false, 'errors' => $errors,
];
file_put_contents($root.'/var/production-verification.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
$kernel->shutdown();
exit($errors ? 1 : 0);
