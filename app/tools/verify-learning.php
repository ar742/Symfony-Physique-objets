<?php
require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$library = new App\Content\LearningLibrary(dirname(__DIR__), new App\Content\SourceLibrary(dirname(__DIR__)));
$analyses = new App\Content\CardAnalysisLibrary(dirname(__DIR__));
$refined = array_filter($analyses->all(), static fn (array $analysis): bool => isset($analysis['refinement']));
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
foreach ($library->all() as $card) {
    $paths[] = '/fiches/'.$card['slug'];
    foreach (range(1, 6) as $base) { $paths[] = '/fiches/'.$card['slug'].'/analyse/'.$base; }
}
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
        $expectedBadges = count(array_filter($domain['cards'], static fn (array $card): bool => isset($refined[$card['slug']])));
        $check($xpath->query('//*[@class="analysis-refinement-badge"]')->length === $expectedBadges, 'Analyses précisées du domaine '.$path);
        foreach ($domain['loops'] as $group) {
            $panels = $xpath->query('//section[@aria-labelledby="'.$group['anchor'].'"]');
            $check($panels->length === 1, 'Boucle unique '.$group['anchor']);
            if ($panels->length !== 1) { continue; }
            $panel = $panels->item(0);
            $check($xpath->query('.//*[@data-loop-node]', $panel)->length === 6, 'Six nœuds '.$group['anchor']);
            $check($xpath->query('.//*[@role="tooltip"]', $panel)->length === 6, 'Six infos '.$group['anchor']);
        }
    }
    if ($path === '/fiches/') {
        $check((new DOMXPath($document))->query('//*[@class="analysis-refinement-badge"]')->length === count($refined), 'Analyses précisées dans le catalogue');
    }
    if (preg_match('~^/fiches/([a-z][a-z0-9-]*)$~', $path, $match) && $path !== '/fiches/corrections') {
        $card = $library->find($match[1]);
        $xpath = new DOMXPath($document);
        $isRefined = isset($refined[$card['slug']]);
        $check($xpath->query('//*[@data-analysis-subject]')->length === ($isRefined ? 1 : 0), 'Nature et périmètre du sujet '.$path);
        $check($xpath->query('//*[@data-analysis-evaluation]')->length === ($isRefined ? 3 : 0), 'Trois évaluations globales détaillées '.$path);
        $nodes = $xpath->query('//section[@id="analyse"]//*[@data-loop-node]/a');
        $check($nodes->length === 6, 'Six systèmes globaux '.$path);
        foreach ($nodes as $index => $node) {
            $check($node->getAttribute('href') === $path.'/analyse/'.($index + 1), 'Entrée dans le bon système '.$path);
        }
        $check($xpath->query('//details[contains(@class,"analysis-matrix")]//ol/li')->length === 36, 'Vue complète des 36 sous-niveaux '.$path);
        $domainCards = $domains->find($card['domain'])['cards'];
        $index = array_search($card['slug'], array_column($domainCards, 'slug'), true);
        $expected = [];
        if (isset($domainCards[$index - 1])) { $expected[] = '/fiches/'.$domainCards[$index - 1]['slug']; }
        $expected[] = isset($domainCards[$index + 1]) ? '/fiches/'.$domainCards[$index + 1]['slug'] : '/fiches/';
        $actual = [];
        foreach ((new DOMXPath($document))->query('//nav[@aria-label="Parcours de lecture"]/a') as $link) { $actual[] = $link->getAttribute('href'); }
        $check($expected === $actual, 'Pagination du domaine '.$card['slug']);
    }
    if (preg_match('~^/fiches/([a-z][a-z0-9-]*)/analyse/([1-6])$~', $path, $match)) {
        $base = (int) $match[2];
        $xpath = new DOMXPath($document);
        $isRefined = isset($refined[$match[1]]);
        $check($xpath->query('//*[@data-analysis-subject]')->length === ($isRefined ? 1 : 0), 'Nature du sujet au second étage '.$path);
        $check($xpath->query('//*[@data-analysis-input]')->length === ($isRefined ? 6 : 0), 'Entrées spécifiques des six sous-niveaux '.$path);
        $check($xpath->query('//*[@data-analysis-relation]')->length === ($isRefined ? 7 : 0), 'Liens entrants qualifiés '.$path);
        $check($xpath->query('//*[@data-analysis-evaluation]')->length === ($isRefined ? (3 + (int) ($base > 3)) : 0), 'Évaluations locales et globale détaillées '.$path);
        foreach ($xpath->query('//*[@data-analysis-evaluation]') as $evaluation) {
            $check($xpath->query('./div/dt', $evaluation)->length === 4 && $xpath->query('./div/dd', $evaluation)->length === 4, 'Quatre champs par évaluation '.$path);
        }
        $nodes = $xpath->query('//*[@data-loop-node]/a');
        $check($nodes->length === 6, 'Six sous-niveaux graphiques '.$path);
        $check($xpath->query('//*[@role="tooltip"]')->length === 6, 'Six explications '.$path);
        $check($xpath->query('//section[@data-analysis-point]')->length === 6, 'Six descriptions rédigées '.$path);
        foreach ($nodes as $index => $node) {
            $check($node->getAttribute('href') === '#point-'.$base.'.'.($index + 1), 'Clic vers le sous-niveau '.$path);
        }
        foreach ([4, 5, 6] as $point) {
            $actual = [];
            foreach ($xpath->query('//section[@id="point-'.$base.'.'.$point.'"]//div[@class="comparison-targets"]/a') as $link) { $actual[] = $link->getAttribute('href'); }
            $check($actual === ['#point-'.$base.'.'.(7-$point), '#point-'.$base.'.'.($point-3)], 'Comparaisons de valeurs et de méthodes '.$path.'#'.$point);
        }
        $next = $base === 6 ? 1 : $base + 1;
        $handoff = $xpath->query('//p[@class="analysis-handoff"]/a');
        $check($handoff->length === 1 && $handoff->item(0)->getAttribute('href') === '/fiches/'.$match[1].'/analyse/'.$next.'#point-'.$next.'.1', 'Transmission entre systèmes '.$path);
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
foreach (['/boucle/0', '/boucle/7', '/fiches/inconnue', '/fiches/..%2F.env', '/domaines/inconnu', '/domaines/optique', '/domaines/..%2F.env', '/fiches/gaz-parfait/analyse/0', '/fiches/gaz-parfait/analyse/7', '/fiches/inconnue/analyse/1', '/fiches/..%2F.env/analyse/1'] as $path) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === 404, 'Route invalide '.$path);
}
foreach (['/boucle/2', '/fiches/boltzmann', '/domaines/mecanique', '/fiches/lagrange-hamilton', '/domaines/fluides-ondes', '/fiches/onde-acoustique', '/fiches/oscillateur-harmonique/analyse/5', '/fiches/gaz-parfait/analyse/1', '/fiches/onde-acoustique/analyse/6', '/fiches/continuite-bernoulli/analyse/4', '/fiches/lagrange-hamilton/analyse/5', '/fiches/travail-energie-mecanique/analyse/5', '/fiches/viscosite-poiseuille/analyse/6', '/fiches/onde-corde/analyse/4', '/fiches/rotation-axe-fixe/analyse/5', '/fiches/roulement-sans-glissement/analyse/6', '/fiches/referentiel-tournant/analyse/4', '/fiches/newton-referentiel/analyse/5', '/fiches/force-centrale-orbite/analyse/6', '/fiches/hydrostatique-archimede/analyse/4', '/fiches/elasticite-lineaire/analyse/5', '/fiches/onde-acoustique/analyse/4', '/fiches/systeme-et-grandeurs/analyse/5', '/fiches/gaz-parfait/analyse/5', '/fiches/premier-principe/analyse/6', '/fiches/capacites-thermiques/analyse/5', '/fiches/detente-isotherme/analyse/6', '/fiches/entropie/analyse/5', '/fiches/microcanonique/analyse/5', '/fiches/boltzmann/analyse/6', '/styles/science.css', '/scripts/theme.js'] as $path) {
    $curl = curl_init('http://127.0.0.1'.$path);
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 30]);
    $html = curl_exec($curl);
    $check(curl_getinfo($curl, CURLINFO_RESPONSE_CODE) === 200, 'HTTP '.$path);
    $check(is_string($html) && strlen($html) > 100, 'Contenu HTTP '.$path);
    unset($curl);
}
$result = ['checks' => $checks, 'pages' => count($documents), 'substeps' => 36, 'analysis_levels' => count($library->all()) * 6, 'analysis_sublevels' => count($library->all()) * 36, 'refined_analyses' => count($refined), 'detailed_evaluations' => count($refined) * 21, 'domain_steps' => array_sum(array_map(static fn (array $domain): int => count($domain['steps']), $domains->all())), 'cards' => count($library->all()), 'corrections' => array_sum(array_map(static fn (array $card): int => count($card['corrections']), $library->all())), 'browser_visual_test' => false, 'errors' => $errors];
file_put_contents(dirname(__DIR__).'/var/learning-verification.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n";
exit($errors ? 1 : 0);
