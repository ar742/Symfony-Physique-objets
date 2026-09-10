<?php

require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');

$root = dirname(__DIR__);
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$productionPath = '/graphes/production';
$optimizationPath = $productionPath.'/optimisation';
$branchesPath = $productionPath.'/branches';
$graphTabs = ['/graphes/', '/graphes/dependances', $productionPath];
$knownGraphPaths = [...$graphTabs, $optimizationPath, $branchesPath];
$branchIds = ['1-2', '1-5', '2-3', '2-8', '5-3', '5-7', '7-6', '7-4', '3-4', '3-6', '4-8', '6-8'];
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
    $check($kernel->getContainer()->get('router')->generate('graph_production_branches') === $branchesPath, 'Nom de route graph_production_branches');
} catch (Symfony\Component\Routing\Exception\RouteNotFoundException) {
    $check(false, 'Nom de route graph_production_branches absent');
}
foreach ([$productionPath, $optimizationPath, $branchesPath] as $path) {
    $document = $fetch($path);
    $xpath = new DOMXPath($document);
    $check($xpath->query('//header//nav//a[@href="/graphes/" and (@aria-current="page" or @aria-current="true")]')->length === 1, 'Navigation Graphes active '.$path);
    $tabs = '//nav[contains(concat(" ",normalize-space(@class)," ")," graph-tabs ")]';
    foreach ($graphTabs as $target) {
        $check($xpath->query($tabs.'/a[@href="'.$target.'"]')->length === 1, 'Onglet '.$target.' depuis '.$path);
    }
    $check($xpath->query($tabs.'/a[@aria-current="page"]')->length === 1, 'Un seul onglet courant '.$path);
    $check($xpath->query($tabs.'/a[@href="'.$productionPath.'" and @aria-current="page"]')->length === 1, 'Onglet Production actif '.$path);
    if ($path !== $branchesPath) {
        $check($xpath->query('//main//a[@href="'.$branchesPath.'"]')->length > 0, 'Lien HTML vers les branches depuis '.$path);
    }
}
$productionXPath = new DOMXPath($documents[$productionPath]);
$check($productionXPath->query('//select[@id="production-preset"]/option[@value="branches"]')->length === 1, 'Cinquième exemple accessible depuis Production');

$document = $documents[$branchesPath];
$xpath = new DOMXPath($document);
$requiredElement = function (string $id, ?string $tag = null) use ($document, $check): ?DOMElement {
    $element = $document->getElementById($id);
    $valid = $element !== null && ($tag === null || strtolower($element->tagName) === $tag);
    $check($valid, 'Élément du réseau de branches '.$id.($tag === null ? '' : ' ('.$tag.')'));
    return $valid ? $element : null;
};
$check($xpath->query('//*[@data-graph-study]')->length === 1, 'Une étude sur la page des branches');
$check($xpath->query('//*[@data-graph-study="production-branches"]')->length === 1, 'Marqueur de l’étude des branches');
$check($xpath->query('//main//a[@href="'.$productionPath.'"]')->length > 0, 'Retour HTML vers Production');
foreach (['branches-map', 'branches-curve'] as $id) {
    $svg = $requiredElement($id, 'svg');
    if ($svg !== null) { $check($hasName($svg, $xpath), 'Nom accessible du SVG '.$id); }
}
$form = $requiredElement('branches-controls', 'form');
$design = $requiredElement('branches-design', 'form');
foreach (['réglages' => $form, 'conception' => $design] as $label => $element) {
    if ($element !== null) { $check($element->hasAttribute('novalidate'), 'Validation du domaine confiée au script : '.$label); }
}
foreach ([
    'branch-choice' => $branchIds, 'branches-inspect' => $branchIds, 'branches-box-choice' => $branchIds,
    'branches-view' => ['initial', 'grid', 'global', 'bounded', 'free'],
    'branches-divisions' => ['5', '10', '20', '50', '100'], 'branches-grid-budget' => ['200000', '1000000', '5000000'],
] as $id => $expected) {
    $select = $requiredElement($id, 'select');
    if ($select === null) { continue; }
    $actual = [];
    $selected = [];
    foreach ($xpath->query('.//option', $select) as $option) {
        $actual[] = $option->getAttribute('value');
        if ($option->hasAttribute('selected')) { $selected[] = $option->getAttribute('value'); }
    }
    $defaults = ['branches-view' => 'initial', 'branches-divisions' => '10', 'branches-grid-budget' => '200000'];
    if (isset($defaults[$id])) {
        $check(count($selected) <= 1 && ($selected[0] ?? $actual[0] ?? null) === $defaults[$id], 'Valeur sélectionnée initialement '.$id);
    }
    sort($actual);
    sort($expected);
    $check($actual === $expected, 'Choix du sélecteur '.$id);
    $check($hasName($select, $xpath), 'Nom accessible '.$id);
}
foreach (['a' => 0.3, 'b' => 0.8, 'c' => 0.9, 'd' => 0.6, 's1' => 0.5, 's2' => 0.5, 's5' => 0.5, 's3' => 0.5, 's7' => 0.5] as $parameter => $expected) {
    $id = 'branch-'.$parameter;
    $input = $requiredElement($id, 'input');
    if ($input === null) { continue; }
    $check($input->getAttribute('type') === 'number' && $input->hasAttribute('required'), 'Paramètre numérique obligatoire '.$id);
    $check($hasName($input, $xpath), 'Nom accessible '.$id);
    $check(is_numeric($input->getAttribute('value')) && (float) $input->getAttribute('value') === $expected, 'Valeur initiale '.$id);
    if (in_array($parameter, ['a', 'b', 'c', 'd'], true)) {
        $check(is_numeric($input->getAttribute('step')) && (float) $input->getAttribute('step') === 0.1, 'Pas de réglage de 0,1 pour '.$id);
    }
    if ($form !== null) { $check($xpath->query('.//*[@id="'.$id.'"]', $form)->length === 1, 'Paramètre du formulaire '.$id); }
}
foreach (['a' => [0.2, 0.4], 'b' => [0.7, 0.9], 'c' => [0.8, 1.0], 'd' => [0.5, 0.7]] as $parameter => $limits) {
    foreach (['min', 'max'] as $index => $bound) {
        $id = 'box-'.$parameter.'-'.$bound;
        $input = $requiredElement($id, 'input');
        if ($input === null) { continue; }
        $check($input->getAttribute('type') === 'number' && $input->hasAttribute('required'), 'Borne numérique obligatoire '.$id);
        $check($hasName($input, $xpath), 'Nom accessible '.$id);
        $check(is_numeric($input->getAttribute('value')) && (float) $input->getAttribute('value') === $limits[$index], 'Valeur initiale '.$id);
        if ($design !== null) { $check($xpath->query('.//*[@id="'.$id.'"]', $design)->length === 1, 'Borne du formulaire de conception '.$id); }
    }
}
$budget = $requiredElement('branches-node-budget', 'input');
if ($budget !== null) {
    foreach (['type' => 'number', 'min' => '1', 'max' => '50000', 'step' => '1', 'value' => '10000'] as $attribute => $expected) {
        $check($budget->getAttribute($attribute) === $expected, 'Budget global : '.$attribute);
    }
    $check($hasName($budget, $xpath), 'Nom accessible du budget global');
}
$compare = $requiredElement('branches-compare', 'button');
if ($compare !== null) {
    $check($compare->getAttribute('type') === 'submit', 'Commande de comparaison par soumission');
    $check($hasName($compare, $xpath), 'Nom accessible de la comparaison');
    $check($compare->hasAttribute('disabled'), 'Comparaison désactivée avant activation JavaScript');
    if ($form !== null) { $check($xpath->query('.//*[@id="branches-compare"]', $form)->length === 1, 'Comparaison dans le formulaire de réglage'); }
}
$cancel = $requiredElement('branches-cancel', 'button');
if ($cancel !== null) {
    $check($hasName($cancel, $xpath), 'Nom accessible de l’annulation');
    $check($cancel->hasAttribute('hidden'), 'Annulation masquée hors calcul');
}
foreach (['branches-copy-law', 'branches-reset', 'branches-between', 'branches-export', 'branches-copy-box', 'branches-design-run', 'branches-free'] as $id) {
    $button = $requiredElement($id, 'button');
    if ($button === null) { continue; }
    $check($hasName($button, $xpath), 'Nom accessible de la commande '.$id);
    if ($id === 'branches-between') { $check($button->getAttribute('type') === 'button', 'Préparation du cas intermédiaire sans soumission automatique'); }
    if ($id === 'branches-design-run') {
        $check($button->getAttribute('type') === 'submit' && $button->hasAttribute('disabled'), 'Conception par soumission désactivée avant JavaScript');
    }
}
foreach (['branches-results', 'branches-commands', 'branches-balances', 'branches-flows', 'branches-certificates'] as $id) { $requiredElement($id); }
$status = $requiredElement('branches-status');
if ($status !== null) { $check(in_array($status->getAttribute('aria-live'), ['polite', 'assertive'], true), 'Annonce accessible de l’état du calcul'); }
$alert = $requiredElement('branches-error');
if ($alert !== null) { $check($alert->getAttribute('role') === 'alert', 'Annonce accessible des erreurs'); }
$designStatus = $requiredElement('branches-design-status');
if ($designStatus !== null) { $check(in_array($designStatus->getAttribute('aria-live'), ['polite', 'assertive'], true), 'Annonce accessible de l’état de conception'); }
$designAlert = $requiredElement('branches-design-error');
if ($designAlert !== null) { $check($designAlert->getAttribute('role') === 'alert', 'Annonce accessible des erreurs de conception'); }

$inspector = $requiredElement('branches-inspector');
if ($inspector !== null) {
    $nodes = $xpath->query('.//*[@data-loop-node]/a', $inspector);
    $check($nodes->length === 3, 'Trois positions du triplet de branche');
    $check($xpath->query('.//*[@role="tooltip"]', $inspector)->length === 3, 'Trois info-bulles du triplet');
    $check($xpath->query('.//*[@data-graph-point]', $inspector)->length === 3, 'Trois descriptions du triplet');
    foreach ([1, 2, 3] as $id) {
        $point = $xpath->query('.//*[@data-graph-point="'.$id.'"]', $inspector);
        $check($point->length === 1, 'Position locale de la branche '.$id.'.0');
        if ($point->length === 1) {
            $check($point->item(0)->getAttribute('id') !== '', 'Identifiant statique de la position '.$id.'.0');
            $check($nodes->item($id - 1)?->getAttribute('href') === '#'.$point->item(0)->getAttribute('id'), 'Lien statique vers la position '.$id.'.0');
        }
    }
}
$check($xpath->query('//head/script[@type="module" and @src="/scripts/branch-study.mjs"]')->length === 1, 'Module des branches déclaré dans head');
$check($xpath->query('//head/link[@rel="stylesheet" and @href="/styles/branch-study.css"]')->length === 1, 'Style des branches déclaré dans head');

// Computed triplets do not exist in server HTML; check the arc and coordinate of their links.
foreach ($document->getElementsByTagName('a') as $link) {
    $url = parse_url(html_entity_decode($link->getAttribute('href')));
    if ($url === false || isset($url['host']) || isset($url['scheme'])) { continue; }
    $targetPath = $url['path'] ?? $branchesPath;
    if (str_starts_with($targetPath, '/graphes')) { $check(in_array($targetPath, $knownGraphPaths, true), 'Destination du volet Graphes '.$targetPath); }
    if (!isset($documents[$targetPath], $url['fragment'])) { continue; }
    $fragment = rawurldecode($url['fragment']);
    if ($targetPath === $branchesPath && str_starts_with($fragment, 'reseau-')) {
        $dynamicAnchors++;
        $valid = preg_match('/^reseau-([1-8]-[1-8])-1b(?:-([1-3])\.0)?$/', $fragment, $match) === 1;
        $check($valid, 'Format de l’ancre créée en JavaScript '.$fragment);
        if ($valid) { $check(in_array($match[1], $branchIds, true), 'Arc existant de l’ancre dynamique '.$fragment); }
        continue;
    }
    $check($documents[$targetPath]->getElementById($fragment) !== null, 'Ancre statique absente '.$targetPath.'#'.$fragment);
}
foreach ([['HEAD', $branchesPath, 200], ['POST', $branchesPath, 405], ['GET', $branchesPath.'/inconnu', 404]] as [$method, $path, $status]) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path, $method), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === $status, 'Route '.$method.' '.$path);
}

$baseUrl = rtrim(getenv('VERIFY_BASE_URL') ?: 'http://127.0.0.1', '/');
$requests = [
    ['GET', $branchesPath, 200], ['HEAD', $branchesPath, 200], ['POST', $branchesPath, 405], ['GET', $branchesPath.'/inconnu', 404],
    ['GET', '/scripts/branch-study.mjs', 200], ['GET', '/scripts/branch-study-worker.mjs', 200], ['GET', '/scripts/branches-engine.mjs', 200],
    ['GET', '/scripts/branches-parameter-envelope.mjs', 200], ['GET', '/scripts/bounded-linear-program.mjs', 200],
    ['GET', '/scripts/production-engine.mjs', 200], ['GET', '/styles/branch-study.css', 200],
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
        if ($path === $branchesPath) { $check(is_string($body) && str_contains($body, 'data-graph-study="production-branches"'), 'Étude des branches servie en HTTP'); }
        $mime = strtolower(trim(explode(';', curl_getinfo($curl, CURLINFO_CONTENT_TYPE) ?: '')[0]));
        if (str_ends_with($path, '.mjs')) {
            $check(in_array($mime, ['text/javascript', 'application/javascript', 'application/x-javascript', 'text/ecmascript', 'application/ecmascript'], true), 'MIME de module JavaScript '.$path);
        } elseif (str_ends_with($path, '.css')) { $check($mime === 'text/css', 'MIME CSS '.$path); }
    }
    unset($curl);
}

$result = [
    'checks' => $checks, 'rendered_pages' => count($documents), 'branch_studies' => 1, 'branches' => count($branchIds), 'http_requests' => $httpRequests,
    'dynamic_anchor_formats_checked' => $dynamicAnchors, 'browser_visual_test' => false, 'javascript_executed' => false, 'errors' => $errors,
];
file_put_contents($root.'/var/branches-verification.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
$kernel->shutdown();
exit($errors ? 1 : 0);
