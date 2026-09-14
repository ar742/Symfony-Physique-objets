<?php

require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');

$root = dirname(__DIR__);
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$productionPath = '/graphes/production';
$branchesPath = $productionPath.'/branches';
$concordancePath = $productionPath.'/concordances';
$graphTabs = ['/graphes/', '/graphes/dependances', $productionPath];
$knownGraphPaths = [...$graphTabs, $productionPath.'/optimisation', $branchesPath, $concordancePath];
$edges = [[1, 2], [1, 5], [2, 3], [2, 8], [5, 3], [5, 7], [7, 6], [7, 4], [3, 4], [3, 6], [4, 8], [6, 8]];
$shares = ['s1', 's2', 's5', 's3', 's7'];
$checks = 0;
$errors = [];
$documents = [];
$httpRequests = 0;
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
$hasName = static function (DOMElement $element, DOMXPath $xpath): bool {
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
    $check($kernel->getContainer()->get('router')->generate('graph_production_concordances') === $concordancePath, 'Nom de route graph_production_concordances');
} catch (Symfony\Component\Routing\Exception\RouteNotFoundException) {
    $check(false, 'Nom de route graph_production_concordances absent');
}
foreach ([$productionPath, $branchesPath, $concordancePath] as $path) {
    $document = $fetch($path);
    $xpath = new DOMXPath($document);
    $check($xpath->query('//header//nav//a[@href="/graphes/" and (@aria-current="page" or @aria-current="true")]')->length === 1, 'Navigation Graphes active '.$path);
    $tabs = '//nav[contains(concat(" ",normalize-space(@class)," ")," graph-tabs ")]';
    foreach ($graphTabs as $target) {
        $check($xpath->query($tabs.'/a[@href="'.$target.'"]')->length === 1, 'Onglet '.$target.' depuis '.$path);
    }
    $check($xpath->query($tabs.'/a[@aria-current="page"]')->length === 1, 'Un seul onglet courant '.$path);
    $check($xpath->query($tabs.'/a[@href="'.$productionPath.'" and @aria-current="page"]')->length === 1, 'Onglet Production actif '.$path);
    if ($path !== $concordancePath) {
        $check($xpath->query('//main//a[@href="'.$concordancePath.'"]')->length > 0, 'Lien HTML vers les concordances depuis '.$path);
    }
}
$document = $documents[$concordancePath];
$xpath = new DOMXPath($document);
$requiredElement = function (string $id, ?string $tag = null) use ($document, $check): ?DOMElement {
    $element = $document->getElementById($id);
    $valid = $element !== null && ($tag === null || strtolower($element->tagName) === $tag);
    $check($valid, 'Élément de l’étude des concordances '.$id.($tag === null ? '' : ' ('.$tag.')'));
    return $valid ? $element : null;
};
$check($xpath->query('//*[@data-graph-study]')->length === 1, 'Une seule étude sur la page');
$check($xpath->query('//*[@data-graph-study="concordances"]')->length === 1, 'Marqueur de l’étude nodale');
$check($xpath->query('//main//a[@href="'.$productionPath.'"]')->length > 0, 'Retour HTML vers Production');
$form = $requiredElement('concordance-form', 'form');
if ($form !== null) {
    $check($form->hasAttribute('novalidate'), 'Validation des valeurs confiée au script');
    $check($xpath->query('.//input', $form)->length === 25, 'Dix-neuf paramètres, cinq parts et une graine dans le formulaire');
}
$expectedInputs = [];
foreach (range(2, 8) as $node) { $expectedInputs['concordance-env-'.$node] = [0.0, 1.0, 1.0]; }
foreach ($edges as [$from, $to]) { $expectedInputs['concordance-epsilon-'.$from.'-'.$to] = [-1.0, 1.0, $from === 1 ? -1.0 : 0.0]; }
foreach ($shares as $share) { $expectedInputs['concordance-'.$share] = [0.0, 1.0, 0.5]; }
foreach ($expectedInputs as $id => [$min, $max, $value]) {
    $input = $requiredElement($id, 'input');
    if ($input === null) { continue; }
    $check($input->getAttribute('type') === 'number' && $input->hasAttribute('required'), 'Champ numérique obligatoire '.$id);
    $check($hasName($input, $xpath), 'Nom accessible '.$id);
    foreach (['min' => $min, 'max' => $max, 'step' => 0.1, 'value' => $value] as $attribute => $expected) {
        $actual = $input->getAttribute($attribute);
        $check(is_numeric($actual) && (float) $actual === $expected, 'Valeur de '.$attribute.' pour '.$id);
    }
    if ($form !== null) { $check($xpath->query('.//*[@id="'.$id.'"]', $form)->length === 1, 'Paramètre dans le formulaire '.$id); }
}
foreach ($edges as [$from, $to]) {
    $labels = $xpath->query('//label[@for="concordance-epsilon-'.$from.'-'.$to.'"]');
    $label = preg_replace('/\s+/u', '', $labels->item(0)?->textContent ?? '');
    $check(str_contains($label, $from.'→'.$to) && str_contains($label, 'ε'.$to.$from), 'Concordance indexée destinataire puis fournisseur '.$from.'→'.$to);
}
$check($document->getElementById('concordance-objective') === null, 'Objectif unique après TH8');
foreach ([
    'concordance-domain' => [['rectified', 'signed'], 'rectified'],
    'concordance-grid-divisions' => [['5', '10', '20'], '10'],
    'concordance-view' => [['initial', 'grid', 'local', 'global'], 'initial'],
    'concordance-node' => [array_map('strval', range(1, 8)), null],
    'concordance-axis-x' => [$shares, 's1'],
    'concordance-axis-y' => [$shares, 's2'],
] as $id => [$expected, $default]) {
    $select = $requiredElement($id, 'select');
    if ($select === null) { continue; }
    $actual = [];
    $selected = [];
    foreach ($xpath->query('.//option', $select) as $option) {
        $actual[] = $option->getAttribute('value');
        if ($option->hasAttribute('selected')) { $selected[] = $option->getAttribute('value'); }
        if ($id === 'concordance-view' && $option->getAttribute('value') !== 'initial') {
            $check($option->hasAttribute('disabled'), 'Résultat non calculé indisponible '.$option->getAttribute('value'));
        }
    }
    $check(count($selected) <= 1, 'Une seule option initiale '.$id);
    if ($default !== null) { $check(($selected[0] ?? $actual[0] ?? null) === $default, 'Valeur initiale du sélecteur '.$id); }
    sort($actual);
    sort($expected);
    $check($actual === $expected, 'Choix du sélecteur '.$id);
    $check($hasName($select, $xpath), 'Nom accessible '.$id);
}
foreach ([
    'concordance-seed' => ['min' => 0.0, 'max' => 4294967295.0, 'step' => 1.0, 'value' => 1.0],
    'concordance-budget' => ['min' => 1.0, 'max' => 30000.0, 'step' => 1.0, 'value' => 4000.0],
    'concordance-radius' => ['max' => 1.0, 'value' => 0.15],
] as $id => $attributes) {
    $input = $requiredElement($id, 'input');
    if ($input === null) { continue; }
    $check($input->getAttribute('type') === 'number' && $hasName($input, $xpath), 'Réglage numérique nommé '.$id);
    foreach ($attributes as $attribute => $expected) {
        $actual = $input->getAttribute($attribute);
        $check(is_numeric($actual) && (float) $actual === $expected, 'Réglage '.$id.' : '.$attribute);
    }
}
foreach (['concordance-apply', 'concordance-reset', 'concordance-compare', 'concordance-cancel', 'concordance-center', 'concordance-export', 'concordance-negative', 'concordance-randomize'] as $id) {
    $button = $requiredElement($id, 'button');
    if ($button === null) { continue; }
    $check($hasName($button, $xpath), 'Nom accessible de la commande '.$id);
    $check($button->getAttribute('type') === ($id === 'concordance-apply' ? 'submit' : 'button'), 'Type de la commande '.$id);
    if ($id === 'concordance-apply' && $form !== null) { $check($xpath->query('.//*[@id="'.$id.'"]', $form)->length === 1, 'Application par soumission du formulaire'); }
    if ($id === 'concordance-cancel') { $check($button->hasAttribute('hidden'), 'Annulation masquée hors calcul'); }
}
foreach (['concordance-results', 'concordance-state', 'concordance-flows', 'concordance-lagrangian', 'concordance-derivatives', 'concordance-surface-caption', 'concordance-samples'] as $id) { $requiredElement($id); }
$status = $requiredElement('concordance-status');
if ($status !== null) { $check($status->getAttribute('role') === 'status' && $status->getAttribute('aria-live') === 'polite', 'Annonce accessible du calcul'); }
$alert = $requiredElement('concordance-error');
if ($alert !== null) { $check($alert->getAttribute('role') === 'alert', 'Annonce accessible des erreurs'); }
foreach (['concordance-map' => ['0 0 760 980', 'group'], 'concordance-surface' => ['0 0 900 560', 'img']] as $id => [$viewBox, $role]) {
    $svg = $requiredElement($id, 'svg');
    if ($svg === null) { continue; }
    $check($svg->getAttribute('viewbox') === $viewBox || $svg->getAttribute('viewBox') === $viewBox, 'Repère SVG '.$id);
    $check($svg->getAttribute('role') === $role && $hasName($svg, $xpath), 'Rôle et nom accessibles '.$id);
    foreach (['title', 'desc'] as $tag) {
        $nodes = $xpath->query('./*[local-name()="'.$tag.'"]', $svg);
        $check($nodes->length === 1 && trim($nodes->item(0)?->textContent ?? '') !== '', 'Texte SVG '.$id.' : '.$tag);
    }
}
$inspector = $requiredElement('concordance-inspector');
if ($inspector !== null) {
    $links = $xpath->query('.//*[@data-loop-node]/a', $inspector);
    $check($links->length === 3, 'Trois positions de l’analyse nodale');
    $check($xpath->query('.//*[@role="tooltip"]', $inspector)->length === 3, 'Trois info-bulles analytiques');
    foreach ([1, 2, 3] as $point) {
        $nodes = $xpath->query('.//*[@data-graph-point="'.$point.'"]', $inspector);
        $check($nodes->length === 1, 'Description de la position '.$point.'.0');
        if ($nodes->length === 1) { $check($links->item($point - 1)?->getAttribute('href') === '#'.$nodes->item(0)->getAttribute('id'), 'Lien statique du triplet '.$point.'.0'); }
    }
}

// Scientific scope is server-rendered; numerical derivatives and bounds have
// separate JavaScript tests. These checks do not execute the browser interface.
$text = preg_replace('/\s+/u', '', $xpath->query('//main')->item(0)?->textContent ?? '');
foreach ([
    'Yᵢ=max(0,XᵢCᵢ)' => 'Mise à zéro des productions négatives',
    'L=Y₈' => 'Objectif après la transformation finale',
    'λᵢ(Xᵢ−Σⱼqⱼᵢ)' => 'Contraintes d’apports du lagrangien',
    'μᵢ(Yᵢ−max(0,XᵢCᵢ))' => 'Contraintes de production du lagrangien',
    'ηᵢ(Σⱼqᵢⱼ−Yᵢ)' => 'Contraintes de répartition du lagrangien',
    'η₁(q₁₂+q₁₅−1)' => 'Contrainte de la source fixée',
    '0,5−2(s₁−0,5)²' => 'Preuve du maximum du seul réglage initial',
    'r=Y₈=−1pourtouslespartages' => 'Exemple construit de maximum strictement négatif',
    'Modesigné:Yᵢ=XᵢCᵢ' => 'Mode signé explicite',
] as $formula => $label) { $check(str_contains($text, $formula), $label); }
$lagrangian = $xpath->query('//*[contains(concat(" ",normalize-space(@class)," ")," concordance-lagrangian-formula ")]')->item(0);
$lagrangianText = preg_replace('/\s+/u', '', $lagrangian?->textContent ?? '');
$check(substr_count($lagrangianText, 'i=2…8') === 2 && substr_count($lagrangianText, 'i=1…7') === 1, 'Trois familles de sept égalités, sans sortie fictive du nœud 8');
$check(str_contains($text, 'aucunplafondpositif') && str_contains($text, 'r≤1n’estpasautomatique'), 'Amplification admise et absence de plafond inventé');
$check(str_contains($text, 'laligneidésigneledestinataireetlacolonnejlefournisseur'), 'Orientation explicite des concordances');
$check(str_contains($text, 'iln’existeaucunarcsortant'), 'Destination finale distincte des nœuds répartiteurs');
$check(str_contains($text, 'rupturededérivée') && str_contains($text, 'gradientnul'), 'Limites des dérivées et des conditions stationnaires');
$check($xpath->query('//noscript')->length > 0, 'Explication du fonctionnement sans JavaScript');
$check($xpath->query('//head/script[@type="module" and @src="/scripts/concordance-study.mjs"]')->length === 1, 'Module de l’atelier déclaré');
$check($xpath->query('//head/link[@rel="stylesheet" and @href="/styles/concordance-study.css"]')->length === 1, 'Style de l’atelier déclaré');

foreach ($document->getElementsByTagName('a') as $link) {
    $url = parse_url(html_entity_decode($link->getAttribute('href')));
    if ($url === false || isset($url['host']) || isset($url['scheme'])) { continue; }
    $targetPath = $url['path'] ?? $concordancePath;
    if (str_starts_with($targetPath, '/graphes')) { $check(in_array($targetPath, $knownGraphPaths, true), 'Destination du volet Graphes '.$targetPath); }
    if (!isset($documents[$targetPath], $url['fragment'])) { continue; }
    $fragment = rawurldecode($url['fragment']);
    $check($documents[$targetPath]->getElementById($fragment) !== null, 'Ancre statique '.$targetPath.'#'.$fragment);
}
foreach ([['HEAD', $concordancePath, 200], ['POST', $concordancePath, 405], ['GET', $concordancePath.'/inconnu', 404]] as [$method, $path, $expected]) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path, $method), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === $expected, 'Route '.$method.' '.$path);
}
$assets = ['scripts/concordance-study.mjs', 'scripts/concordance-worker.mjs', 'scripts/concordance-engine.mjs', 'scripts/concordance-surfaces.mjs', 'scripts/concordance-scenarios.mjs', 'scripts/concordance-sample-results.mjs', 'styles/concordance-study.css'];
foreach ($assets as $asset) { $check(is_file($root.'/public/'.$asset), 'Ressource locale '.$asset); }
$baseUrl = rtrim(getenv('VERIFY_BASE_URL') ?: 'http://127.0.0.1', '/');
$requests = [['GET', $concordancePath, 200], ['HEAD', $concordancePath, 200], ['POST', $concordancePath, 405], ['GET', $concordancePath.'/inconnu', 404]];
foreach ($assets as $asset) { $requests[] = ['GET', '/'.$asset, 200]; }
foreach ($requests as [$method, $path, $expected]) {
    $curl = curl_init($baseUrl.$path);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30]);
    if ($method === 'HEAD') { curl_setopt($curl, CURLOPT_NOBODY, true); }
    elseif ($method === 'POST') { curl_setopt($curl, CURLOPT_POST, true); }
    $body = curl_exec($curl);
    $httpRequests++;
    $check(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) === $expected, 'HTTP '.$method.' '.$path);
    if ($method === 'GET' && $expected === 200) {
        $check(is_string($body) && trim($body) !== '', 'Contenu HTTP '.$path);
        if ($path === $concordancePath) { $check(is_string($body) && str_contains($body, 'data-graph-study="concordances"'), 'Atelier nodal servi en HTTP'); }
        $mime = strtolower(trim(explode(';', curl_getinfo($curl, CURLINFO_CONTENT_TYPE) ?: '')[0]));
        if (str_ends_with($path, '.mjs')) {
            $check(in_array($mime, ['text/javascript', 'application/javascript', 'application/x-javascript', 'text/ecmascript', 'application/ecmascript'], true), 'MIME du module '.$path);
        } elseif (str_ends_with($path, '.css')) { $check($mime === 'text/css', 'MIME CSS '.$path); }
    }
    unset($curl);
}
$result = [
    'checks' => $checks, 'rendered_pages' => count($documents), 'concordance_studies' => 1,
    'nodes' => 8, 'arcs' => count($edges), 'model_parameters' => 19, 'shares' => count($shares), 'equality_constraints' => 21,
    'http_requests' => $httpRequests, 'browser_visual_test' => false, 'javascript_executed' => false, 'errors' => $errors,
];
file_put_contents($root.'/var/concordances-verification.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
$kernel->shutdown();
exit($errors ? 1 : 0);
