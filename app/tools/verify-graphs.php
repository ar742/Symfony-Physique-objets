<?php

require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');

$root = dirname(__DIR__);
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$checks = 0;
$errors = [];
$documents = [];
$httpChecks = 0;
$dynamicAnchors = 0;
$check = function (bool $ok, string $message) use (&$checks, &$errors): void {
    $checks++;
    if (!$ok) { $errors[] = $message; }
};
$fetch = function (string $path) use ($kernel, $check, &$documents): DOMDocument {
    if (isset($documents[$path])) { return $documents[$path]; }
    $request = Symfony\Component\HttpFoundation\Request::create($path);
    $response = $kernel->handle($request, Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === 200, 'Route '.$path);
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
$requiredElement = function (DOMDocument $document, string $id, string $tag, string $path) use ($check): ?DOMElement {
    $element = $document->getElementById($id);
    $check($element !== null && strtolower($element->tagName) === $tag, 'Élément '.$tag.' '.$path.'#'.$id);
    return $element;
};
$hasName = function (DOMElement $element, DOMXPath $xpath): bool {
    if (trim($element->getAttribute('aria-label')) !== '') { return true; }
    $labelledBy = preg_split('/\s+/', trim($element->getAttribute('aria-labelledby')), flags: PREG_SPLIT_NO_EMPTY);
    if ($labelledBy !== []) {
        $text = '';
        foreach ($labelledBy as $id) { $text .= $element->ownerDocument->getElementById($id)?->textContent ?? ''; }
        if (trim($text) !== '') { return true; }
    }
    foreach ($xpath->query('ancestor::label | //label[@for="'.$element->getAttribute('id').'"]', $element) as $label) {
        if (trim($label->textContent) !== '') { return true; }
    }
    foreach ($xpath->query('./*[local-name()="title"]', $element) as $title) {
        if (trim($title->textContent) !== '') { return true; }
    }
    return false;
};
$checkSelect = function (DOMDocument $document, DOMXPath $xpath, string $id, array $expected, string $path) use ($requiredElement, $hasName, $check): void {
    $select = $requiredElement($document, $id, 'select', $path);
    if ($select === null) { return; }
    $actual = [];
    foreach ($xpath->query('.//option', $select) as $option) { $actual[] = $option->getAttribute('value'); }
    sort($actual);
    sort($expected);
    $check($actual === $expected, 'Choix du sélecteur '.$path.'#'.$id);
    $check($hasName($select, $xpath), 'Nom accessible '.$path.'#'.$id);
};

$routes = ['graph_index' => '/graphes/', 'graph_dependencies' => '/graphes/dependances'];
foreach ($routes as $name => $path) {
    try {
        $check($kernel->getContainer()->get('router')->generate($name) === $path, 'Nom de route '.$name);
    } catch (Symfony\Component\Routing\Exception\RouteNotFoundException) {
        $check(false, 'Nom de route absent '.$name);
    }
}
$home = $fetch('/');
$homeXPath = new DOMXPath($home);
$check($homeXPath->query('//main//a[@href="/graphes/"]')->length > 0, 'Accès au volet Graphes depuis le contenu de l’accueil');

$studies = [
    '/graphes/' => ['kind' => 'cities', 'map' => 'city-map', 'panels' => ['branch-inspector', 'route-results', 'algorithm-results']],
    '/graphes/dependances' => ['kind' => 'dependencies', 'map' => 'dependency-map', 'panels' => ['dependency-results', 'dependency-inspector']],
];
foreach ($studies as $path => $study) {
    $document = $fetch($path);
    $xpath = new DOMXPath($document);
    $check($xpath->query('//*[@data-graph-study]')->length === 1, 'Une étude par page '.$path);
    $check($xpath->query('//*[@data-graph-study="'.$study['kind'].'"]')->length === 1, 'Type d’étude '.$path);
    $map = $requiredElement($document, $study['map'], 'svg', $path);
    if ($map !== null) { $check($hasName($map, $xpath), 'Nom accessible du graphe '.$path); }
    foreach ($study['panels'] as $id) { $check($document->getElementById($id) !== null, 'Zone de résultats ou inspection '.$path.'#'.$id); }
    $check($xpath->query('//head/script[@type="module" and @src="/scripts/graph-studies.mjs"]')->length === 1, 'Module déclaré dans la page '.$path);
    $check($xpath->query('//head/link[@rel="stylesheet" and @href="/styles/graph-studies.css"]')->length === 1, 'Style déclaré dans la page '.$path);
    $check($xpath->query('//header//nav//a[@href="/graphes/"]')->length > 0, 'Navigation principale Graphes '.$path);
    $otherPath = $study['kind'] === 'cities' ? '/graphes/dependances' : '/graphes/';
    $check($xpath->query('//main//a[@href="'.$otherPath.'"]')->length > 0, 'Passage entre études '.$path);
}
$check($homeXPath->query('//header//nav//a[@href="/graphes/"]')->length > 0, 'Navigation principale Graphes sur l’accueil');

$cityDocument = $documents['/graphes/'];
$cityXPath = new DOMXPath($cityDocument);
$form = $requiredElement($cityDocument, 'city-controls', 'form', '/graphes/');
foreach (['graph-start', 'graph-end'] as $id) { $checkSelect($cityDocument, $cityXPath, $id, ['A', 'B', 'C', 'D', 'E', 'F'], '/graphes/'); }
$checkSelect($cityDocument, $cityXPath, 'graph-scope', ['pair', 'all'], '/graphes/');
$checkSelect($cityDocument, $cityXPath, 'branch-variant', ['1a', '1b'], '/graphes/');
$limit = $requiredElement($cityDocument, 'graph-limit', 'input', '/graphes/');
if ($limit !== null) {
    $check($limit->getAttribute('type') === 'number' && $limit->getAttribute('value') === '20', 'Limite numérique initiale des parcours');
    $check($hasName($limit, $cityXPath), 'Nom accessible de la limite');
}
if ($form !== null) {
    foreach (['graph-start', 'graph-end', 'graph-limit', 'graph-scope'] as $id) {
        $check($cityXPath->query('.//*[@id="'.$id.'"]', $form)->length === 1, 'Champ de calcul dans le formulaire '.$id);
    }
    $buttons = $cityXPath->query('.//button[@type="submit"]', $form);
    $check($buttons->length === 1, 'Commande de calcul des parcours');
    if ($buttons->length === 1) {
        $check(trim($buttons->item(0)->textContent) !== '' || $hasName($buttons->item(0), $cityXPath), 'Nom accessible de la commande de calcul');
    }
}

$dependencyDocument = $documents['/graphes/dependances'];
$dependencyXPath = new DOMXPath($dependencyDocument);
$load = $requiredElement($dependencyDocument, 'external-load', 'input', '/graphes/dependances');
if ($load !== null) {
    foreach (['type' => 'range', 'min' => '0', 'max' => '100', 'step' => '5', 'value' => '20'] as $attribute => $expected) {
        $check($load->getAttribute($attribute) === $expected, 'Charge extérieure : '.$attribute);
    }
    $check($hasName($load, $dependencyXPath), 'Nom accessible de la charge extérieure');
}

// Only server-rendered destinations are inspected here; SVG nodes and computed results belong to the JavaScript tests.
$knownGraphPages = ['/graphes/', '/graphes/dependances', '/graphes/production', '/graphes/production/optimisation', '/graphes/production/branches'];
foreach ($documents as $path => $document) {
    foreach ($document->getElementsByTagName('a') as $link) {
        $url = parse_url(html_entity_decode($link->getAttribute('href')));
        if ($url === false || isset($url['host']) || isset($url['scheme'])) { continue; }
        $targetPath = $url['path'] ?? $path;
        if (str_starts_with($targetPath, '/graphes')) { $check(in_array($targetPath, $knownGraphPages, true), 'Destination du volet Graphes '.$targetPath); }
        if (isset($documents[$targetPath], $url['fragment'])) {
            $fragment = rawurldecode($url['fragment']);
            if (isset($studies[$targetPath]) && str_starts_with($fragment, 'branche-')) {
                $dynamicAnchors++;
                $valid = preg_match('/^branche-([A-Z]-[A-Z])-(1[ab])(?:-([123])\.0)?$/', $fragment, $match) === 1;
                $check($valid, 'Format de l’ancre créée par JavaScript '.$targetPath.'#'.$fragment);
                if ($valid && $studies[$targetPath]['kind'] === 'dependencies') {
                    $options = (new DOMXPath($documents[$targetPath]))->query('//select[@id="dependency-branch"]/option');
                    $available = [];
                    foreach ($options as $option) { $available[] = $option->getAttribute('value'); }
                    $check(in_array($match[1], $available, true) && $match[2] === '1a', 'Branche et variante accessibles dans les dépendances '.$fragment);
                } elseif ($valid) {
                    $check(preg_match('/^[A-F]-[A-F]$/', $match[1]) === 1 && $match[1][0] !== $match[1][2], 'Villes de l’ancre dynamique '.$fragment);
                }
                continue;
            }
            $check($documents[$targetPath]->getElementById($fragment) !== null, 'Ancre liée absente '.$path.' → '.$targetPath.'#'.$fragment);
        }
    }
}
foreach (['/graphes/inconnu', '/graphes/dependances/inconnu', '/graphes/cities', '/graphes/..%2F.env'] as $path) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === 404, 'Route invalide '.$path);
}
foreach ($routes as $path) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path, 'POST'), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === 405, 'Route GET uniquement '.$path);
}

$baseUrl = rtrim(getenv('VERIFY_BASE_URL') ?: 'http://127.0.0.1', '/');
foreach (['/graphes/', '/graphes/dependances', '/scripts/graph-studies.mjs', '/scripts/graph-engine.mjs', '/styles/graph-studies.css'] as $path) {
    $curl = curl_init($baseUrl.$path);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30]);
    $body = curl_exec($curl);
    $httpChecks++;
    $check(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) === 200, 'HTTP '.$path);
    $check(is_string($body) && trim($body) !== '', 'Contenu HTTP '.$path);
    if (isset($studies[$path])) {
        $check(is_string($body) && str_contains($body, 'data-graph-study="'.$studies[$path]['kind'].'"'), 'Étude servie en HTTP '.$path);
    }
    $mime = strtolower(trim(explode(';', curl_getinfo($curl, CURLINFO_CONTENT_TYPE) ?: '')[0]));
    if (str_ends_with($path, '.mjs')) {
        $check(in_array($mime, ['text/javascript', 'application/javascript', 'application/x-javascript', 'text/ecmascript', 'application/ecmascript'], true), 'Type MIME compatible avec un module JavaScript '.$path);
    } elseif ($path === '/styles/graph-studies.css') {
        $check($mime === 'text/css', 'Type MIME CSS');
    }
    unset($curl);
}

$result = [
    'checks' => $checks, 'rendered_pages' => count($documents), 'graph_studies' => count($studies), 'http_resources' => $httpChecks,
    'dynamic_anchor_formats_checked' => $dynamicAnchors,
    'browser_visual_test' => false, 'javascript_executed' => false, 'errors' => $errors,
];
file_put_contents($root.'/var/graphs-verification.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
$kernel->shutdown();
exit($errors ? 1 : 0);
