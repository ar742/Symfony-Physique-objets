<?php

require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');

$root = dirname(__DIR__);
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$productionPath = '/graphes/production';
$optimizationPath = $productionPath.'/optimisation';
$graphTabs = ['/graphes/', '/graphes/dependances', $productionPath];
$knownGraphPaths = [...$graphTabs, $optimizationPath];
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
    return strtolower($element->tagName) === 'button' && trim($element->textContent) !== '';
};

try {
    $check($kernel->getContainer()->get('router')->generate('graph_production_optimization') === $optimizationPath, 'Nom de route graph_production_optimization');
} catch (Symfony\Component\Routing\Exception\RouteNotFoundException) {
    $check(false, 'Nom de route graph_production_optimization absent');
}
foreach ([$productionPath, $optimizationPath] as $path) {
    $document = $fetch($path);
    $xpath = new DOMXPath($document);
    $check($xpath->query('//header//nav//a[@href="/graphes/" and (@aria-current="page" or @aria-current="true")]')->length === 1, 'Navigation Graphes active '.$path);
    $tabs = '//nav[contains(concat(" ",normalize-space(@class)," ")," graph-tabs ")]';
    foreach ($graphTabs as $target) {
        $check($xpath->query($tabs.'/a[@href="'.$target.'"]')->length === 1, 'Onglet '.$target.' depuis '.$path);
    }
    $check($xpath->query($tabs.'/a[@aria-current="page"]')->length === 1, 'Un seul onglet courant '.$path);
    $check($xpath->query($tabs.'/a[@href="'.$productionPath.'" and @aria-current="page"]')->length === 1, 'Onglet Production actif '.$path);
}
$productionXPath = new DOMXPath($documents[$productionPath]);
$check($productionXPath->query('//select[@id="production-preset"]/option[@value="optimization"]')->length === 1, 'Quatrième exemple accessible depuis Production');
$check($productionXPath->query('//main//a[@href="'.$optimizationPath.'"]')->length > 0, 'Lien HTML depuis Production vers Optimisation');

$document = $documents[$optimizationPath];
$xpath = new DOMXPath($document);
$requiredElement = function (string $id, ?string $tag = null) use ($document, $check): ?DOMElement {
    $element = $document->getElementById($id);
    $valid = $element !== null && ($tag === null || strtolower($element->tagName) === $tag);
    $check($valid, 'Élément d’optimisation '.$id.($tag === null ? '' : ' ('.$tag.')'));
    return $valid ? $element : null;
};
$check($xpath->query('//*[@data-graph-study]')->length === 1, 'Une étude sur la page d’optimisation');
$check($xpath->query('//*[@data-graph-study="production-optimization"]')->length === 1, 'Marqueur de l’étude optimisation');
$check($xpath->query('//main//a[@href="'.$productionPath.'"]')->length > 0, 'Retour HTML vers Production');
foreach (['optimization-map', 'optimization-curve', 'optimization-progress-chart'] as $id) {
    $svg = $requiredElement($id, 'svg');
    if ($svg !== null) { $check($hasName($svg, $xpath), 'Nom accessible du SVG '.$id); }
}
$form = $requiredElement('optimization-controls', 'form');
if ($form !== null) { $check($form->hasAttribute('novalidate'), 'Validation du domaine confiée au script d’optimisation'); }
$parameters = [
    'a' => ['value' => 0.1, 'step' => 0.1], 'b' => ['value' => 0.5, 'step' => 0.1],
    'c' => ['value' => 0.8, 'step' => 0.1], 'd' => ['value' => 0.4, 'step' => 0.1],
    'budget' => ['value' => 0.2, 'step' => 0.1], 'u' => ['value' => 0.196, 'step' => 'any'],
    's1' => ['value' => 1, 'step' => 'any'], 's3' => ['value' => 1, 'step' => 'any'], 's5' => ['value' => 1, 'step' => 'any'],
    'source-step' => ['value' => 0.02], 'split-step' => ['value' => 0.1], 'min-step' => ['value' => 0.00001],
];
foreach ($parameters as $parameter => $expected) {
    $id = 'opt-'.$parameter;
    $input = $requiredElement($id, 'input');
    if ($input === null) { continue; }
    $check($input->getAttribute('type') === 'number' && $input->hasAttribute('required'), 'Paramètre numérique obligatoire '.$id);
    $check($hasName($input, $xpath), 'Nom accessible '.$id);
    $check(is_numeric($input->getAttribute('value')) && (float) $input->getAttribute('value') === (float) $expected['value'], 'Valeur initiale '.$id);
    if (isset($expected['step'])) {
        $actualStep = $input->getAttribute('step');
        $check($expected['step'] === 'any' ? $actualStep === 'any' : is_numeric($actualStep) && (float) $actualStep === $expected['step'], 'Pas de réglage '.$id);
    }
    if ($form !== null) { $check($xpath->query('.//*[@id="'.$id.'"]', $form)->length === 1, 'Paramètre du formulaire '.$id); }
}
foreach (['optimization-compare', 'optimization-cancel', 'optimization-start-active', 'optimization-start-zero', 'optimization-start-abundant'] as $id) {
    $button = $requiredElement($id, 'button');
    if ($button === null) { continue; }
    $check($hasName($button, $xpath), 'Nom accessible de la commande '.$id);
    if ($id === 'optimization-compare') { $check($button->hasAttribute('disabled'), 'Calcul désactivé avant activation JavaScript'); }
    if ($id === 'optimization-cancel') { $check($button->hasAttribute('hidden'), 'Annulation masquée hors calcul'); }
}
foreach (['optimization-view' => ['initial', 'local', 'global'], 'optimization-machine' => ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8']] as $id => $expected) {
    $select = $requiredElement($id, 'select');
    if ($select === null) { continue; }
    $actual = [];
    $selected = [];
    foreach ($xpath->query('.//option', $select) as $option) {
        $actual[] = $option->getAttribute('value');
        if ($option->hasAttribute('selected')) { $selected[] = $option->getAttribute('value'); }
    }
    if ($id === 'optimization-view') {
        $check(count($selected) <= 1 && ($selected[0] ?? $actual[0] ?? null) === 'initial', 'Vue initiale sélectionnée');
    }
    sort($actual);
    sort($expected);
    $check($actual === $expected, 'Choix du sélecteur '.$id);
    $check($hasName($select, $xpath), 'Nom accessible '.$id);
}
foreach (['optimization-results', 'optimization-state', 'optimization-flows', 'optimization-local-history', 'optimization-certificate'] as $id) { $requiredElement($id); }
$status = $requiredElement('optimization-status');
if ($status !== null) { $check(in_array($status->getAttribute('aria-live'), ['polite', 'assertive'], true), 'Annonce accessible de l’état du calcul'); }
$alert = $requiredElement('optimization-error');
if ($alert !== null) { $check($alert->getAttribute('role') === 'alert', 'Annonce accessible des erreurs d’optimisation'); }

$inspector = $requiredElement('optimization-inspector');
if ($inspector !== null) {
    $nodes = $xpath->query('.//*[@data-loop-node]/a', $inspector);
    $check($nodes->length === 3, 'Trois positions du triplet de la machine');
    $check($xpath->query('.//*[@role="tooltip"]', $inspector)->length === 3, 'Trois info-bulles du triplet');
    $check($xpath->query('.//*[@data-graph-point]', $inspector)->length === 3, 'Trois descriptions du triplet');
    foreach ([1, 2, 3] as $id) {
        $point = $xpath->query('.//*[@data-graph-point="'.$id.'"]', $inspector);
        $check($point->length === 1, 'Position locale de la machine '.$id.'.0');
        if ($point->length === 1) {
            $check($point->item(0)->getAttribute('id') !== '', 'Identifiant statique de la position '.$id.'.0');
            $check($nodes->item($id - 1)?->getAttribute('href') === '#'.$point->item(0)->getAttribute('id'), 'Lien statique vers la position '.$id.'.0');
        }
    }
}
$check($xpath->query('//head/script[@type="module" and @src="/scripts/production-optimization.mjs"]')->length === 1, 'Module d’optimisation déclaré dans head');
$check($xpath->query('//head/link[@rel="stylesheet" and @href="/styles/production-optimization.css"]')->length === 1, 'Style d’optimisation déclaré dans head');

// The triplets created after selection are checked by anchor grammar, not mistaken for server-rendered content.
foreach ($document->getElementsByTagName('a') as $link) {
    $url = parse_url(html_entity_decode($link->getAttribute('href')));
    if ($url === false || isset($url['host']) || isset($url['scheme'])) { continue; }
    $targetPath = $url['path'] ?? $optimizationPath;
    if (str_starts_with($targetPath, '/graphes')) { $check(in_array($targetPath, $knownGraphPaths, true), 'Destination du volet Graphes '.$targetPath); }
    if (!isset($documents[$targetPath], $url['fragment'])) { continue; }
    $fragment = rawurldecode($url['fragment']);
    if ($targetPath === $optimizationPath && str_starts_with($fragment, 'atelier-M')) {
        $dynamicAnchors++;
        $check(preg_match('/^atelier-M[1-8]-1b(?:-[1-3]\.0)?$/', $fragment) === 1, 'Format de l’ancre créée en JavaScript '.$fragment);
        continue;
    }
    $check($documents[$targetPath]->getElementById($fragment) !== null, 'Ancre statique absente '.$targetPath.'#'.$fragment);
}
foreach ([['HEAD', $optimizationPath, 200], ['POST', $optimizationPath, 405], ['GET', $optimizationPath.'/inconnu', 404]] as [$method, $path, $status]) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path, $method), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === $status, 'Route '.$method.' '.$path);
}

$baseUrl = rtrim(getenv('VERIFY_BASE_URL') ?: 'http://127.0.0.1', '/');
$requests = [
    ['GET', $optimizationPath, 200], ['HEAD', $optimizationPath, 200], ['POST', $optimizationPath, 405], ['GET', $optimizationPath.'/inconnu', 404],
    ['GET', '/scripts/production-optimization.mjs', 200], ['GET', '/scripts/production-optimization-worker.mjs', 200],
    ['GET', '/scripts/optimisation-engine.mjs', 200], ['GET', '/styles/production-optimization.css', 200],
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
        if ($path === $optimizationPath) { $check(is_string($body) && str_contains($body, 'data-graph-study="production-optimization"'), 'Étude d’optimisation servie en HTTP'); }
        $mime = strtolower(trim(explode(';', curl_getinfo($curl, CURLINFO_CONTENT_TYPE) ?: '')[0]));
        if (str_ends_with($path, '.mjs')) {
            $check(in_array($mime, ['text/javascript', 'application/javascript', 'application/x-javascript', 'text/ecmascript', 'application/ecmascript'], true), 'MIME de module JavaScript '.$path);
        } elseif (str_ends_with($path, '.css')) { $check($mime === 'text/css', 'MIME CSS '.$path); }
    }
    unset($curl);
}

$result = [
    'checks' => $checks, 'rendered_pages' => count($documents), 'optimization_studies' => 1, 'http_requests' => $httpRequests,
    'dynamic_anchor_formats_checked' => $dynamicAnchors, 'browser_visual_test' => false, 'javascript_executed' => false, 'errors' => $errors,
];
file_put_contents($root.'/var/production-optimization-verification.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
$kernel->shutdown();
exit($errors ? 1 : 0);
