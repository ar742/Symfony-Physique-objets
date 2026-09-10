<?php

require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');

$kernel = new App\Kernel('dev', true);
$kernel->boot();
$root = dirname(__DIR__);
$cards = new App\Content\LearningLibrary($root, new App\Content\SourceLibrary($root));
$library = new App\Content\AnalysisFormatLibrary($root, new App\Content\CardAnalysisLibrary($root), $cards);
$formats = $library->formats();
$checks = 0;
$errors = [];
$documents = [];
$pagesToInspect = [];
$check = function (bool $ok, string $message) use (&$checks, &$errors): void {
    $checks++;
    if (!$ok) { $errors[] = $message; }
};
$fetch = function (string $path) use ($kernel, $check, &$documents): DOMDocument {
    if (isset($documents[$path])) { return $documents[$path]; }
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
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
    foreach ($xpath->query('//*[@aria-controls or @aria-describedby or @aria-labelledby]') as $element) {
        foreach (['aria-controls', 'aria-describedby', 'aria-labelledby'] as $attribute) {
            foreach (preg_split('/\s+/', trim($element->getAttribute($attribute)), flags: PREG_SPLIT_NO_EMPTY) as $id) {
                $check(isset($ids[$id]), 'Repère ARIA absent '.$path.'#'.$id);
            }
        }
    }
    return $documents[$path] = $document;
};
$checkEvaluation = function (DOMXPath $xpath, DOMElement $element, array $expected, string $context) use ($check): void {
    $check($xpath->query('./div/dt', $element)->length === 4 && $xpath->query('./div/dd', $element)->length === 4, 'Quatre champs '.$context);
    foreach (['object', 'conditions', 'criterion', 'finding'] as $field) {
        $check(str_contains($element->textContent, $expected[$field]), 'Texte '.$field.' '.$context);
    }
};

$home = $fetch('/');
$pagesToInspect[] = '/';
$homeXPath = new DOMXPath($home);
$check($homeXPath->query('//*[@data-analysis-format]')->length === 4, 'Quatre entrées de forme sur l’accueil');
$exampleCount = $levelCount = $pointCount = $reviewCount = 0;

foreach ($formats as $formatId => $format) {
    $formatPath = '/analyses/'.$formatId;
    $links = $homeXPath->query('//a[@data-analysis-format="'.$formatId.'"]');
    $check($links->length === 1 && $links->item(0)->getAttribute('href') === $formatPath, 'Accès accueil '.$formatId);
    $document = $fetch($formatPath);
    $pagesToInspect[] = $formatPath;
    $xpath = new DOMXPath($document);
    $modelNodes = $format['width'] + ($format['depth'] === 2 ? $format['width'] ** 2 : 0);
    $check($xpath->query('//*[@data-loop-node]')->length === $modelNodes, 'Nœuds du modèle '.$formatId);
    $check($xpath->query('//*[@role="tooltip"]')->length === $modelNodes, 'Info-bulles du modèle '.$formatId);
    foreach ($format['stages'] as $stage) {
        $check($document->getElementById('modele-'.$stage['id'].'.0') !== null, 'Coordonnée globale du modèle '.$formatId.' '.$stage['id']);
        if ($format['depth'] === 2) {
            foreach ($format['stages'] as $child) {
                $check($document->getElementById('modele-'.$stage['id'].'.'.$child['id']) !== null, 'Coordonnée locale du modèle '.$formatId.' '.$stage['id'].'.'.$child['id']);
            }
        }
    }

    if ($formatId === 'cas-4') {
        foreach ($format['examples'] as $example) {
            $target = '/fiches/'.$example['reading_card'].'#analyse';
            $check($xpath->query('//a[@href="'.$target.'"]')->length === 1, 'Fiche mise en avant '.$target);
            $check($xpath->query('//a[starts-with(@href,"/analyses/cas-4/")]')->length === 0, 'Aucun exemple factice du cas 4');
            $cardDocument = $fetch('/fiches/'.$example['reading_card']);
            $cardXPath = new DOMXPath($cardDocument);
            $check($cardXPath->query('//*[@id="analyse"]//*[@data-loop-node]')->length === 6, 'Six systèmes existants '.$target);
            $check($cardXPath->query('//details[contains(@class,"analysis-matrix")]//ol/li')->length === 36, 'Trente-six sous-niveaux existants '.$target);
        }
        $check($xpath->query('//a[@href="/fiches/"]')->length > 0, 'Accès au catalogue complet depuis le cas 4');
        continue;
    }

    foreach ($format['examples'] as $example) {
        $exampleCount++;
        $path = $formatPath.'/'.$example['slug'];
        $check($xpath->query('//a[@href="'.$path.'"]')->length === 1, 'Accès à l’exemple '.$path);
        $exampleDocument = $fetch($path);
        $pagesToInspect[] = $path;
        $exampleXPath = new DOMXPath($exampleDocument);
        $nodes = $exampleXPath->query('//*[@data-loop-node]/a');
        $check($nodes->length === $format['width'], 'Nœuds globaux '.$path);
        $check($exampleXPath->query('//*[@role="tooltip"]')->length === $format['width'], 'Info-bulles globales '.$path);
        $check($exampleXPath->query('//*[@data-format-point]')->length === $format['width'], 'Descriptions globales '.$path);
        foreach ($example['levels'] as $index => $level) {
            $levelCount++;
            $expectedHref = $formatId === 'cas-2' ? $path.'/niveau/'.$level['id'] : '#point-'.$level['coordinate'];
            $check($nodes->item($index)?->getAttribute('href') === $expectedHref, 'Destination globale '.$path.' '.$level['coordinate']);
            $point = $exampleDocument->getElementById('point-'.$level['coordinate']);
            $check($point !== null, 'Ancre globale '.$path.' '.$level['coordinate']);
            if ($point !== null) {
                foreach (['input', 'action', 'output'] as $field) { $check(str_contains($point->textContent, $level[$field]), 'Contenu '.$field.' '.$path.' '.$level['coordinate']); }
                $evaluations = $exampleXPath->query('.//*[@data-analysis-evaluation]', $point);
                $check($evaluations->length === (int) ($formatId === 'cas-3' && $level['id'] >= 4), 'Évaluations globales '.$path.' '.$level['coordinate']);
                if (isset($level['evaluation']) && $evaluations->length === 1) {
                    $checkEvaluation($exampleXPath, $evaluations->item(0), $level['evaluation'], $path.' '.$level['coordinate']);
                    $check($exampleXPath->query('.//a[@href="#point-'.(7 - $level['id']).'.0"]', $point)->length === 1, 'Comparaison de retour '.$path.' '.$level['coordinate']);
                }
            }
            if ($formatId !== 'cas-2') { continue; }

            $localPath = $path.'/niveau/'.$level['id'];
            $localDocument = $fetch($localPath);
            $pagesToInspect[] = $localPath;
            $localXPath = new DOMXPath($localDocument);
            $localNodes = $localXPath->query('//*[@data-loop-node]/a');
            $check($localNodes->length === 3, 'Trois points locaux '.$localPath);
            $check($localXPath->query('//*[@role="tooltip"]')->length === 3, 'Trois info-bulles locales '.$localPath);
            $check($localXPath->query('//*[@data-format-point]')->length === 3, 'Trois descriptions locales '.$localPath);
            $check($localXPath->query('//*[@data-analysis-evaluation]')->length === 0, 'Aucune chaîne de retour ajoutée '.$localPath);
            foreach ($level['steps'] as $offset => $step) {
                $pointCount++;
                $check($localNodes->item($offset)?->getAttribute('href') === '#point-'.$step['coordinate'], 'Destination locale '.$localPath.' '.$step['coordinate']);
                $localPoint = $localDocument->getElementById('point-'.$step['coordinate']);
                $check($localPoint !== null, 'Ancre locale '.$localPath.' '.$step['coordinate']);
                if ($localPoint !== null) {
                    foreach (['input', 'action', 'output'] as $field) { $check(str_contains($localPoint->textContent, $step[$field]), 'Contenu '.$field.' '.$localPath.' '.$step['coordinate']); }
                }
            }
            if ($level['id'] < 3) {
                $next = $level['id'] + 1;
                $check($localXPath->query('//nav[contains(@class,"analysis-footer")]/a[@href="'.$path.'/niveau/'.$next.'#point-'.$next.'.1"]')->length === 1, 'Transmission entre systèmes '.$localPath);
            } else {
                $check($localXPath->query('//nav[contains(@class,"analysis-footer")]/a[@href="'.$path.'#comparaisons"]')->length === 1, 'Fin sans retour automatique '.$localPath);
                $check($localXPath->query('//nav[contains(@class,"analysis-footer")]/a[starts-with(@href,"'.$path.'/niveau/1")]')->length === 0, 'Pas de boucle implicite 3 vers 1 '.$localPath);
            }
        }

        $reviews = $exampleXPath->query('//*[@data-analysis-review]//*[@data-analysis-evaluation]');
        $check($reviews->length === 1, 'Contrôle global de l’exemple '.$path);
        if ($reviews->length === 1) {
            $reviewCount++;
            $checkEvaluation($exampleXPath, $reviews->item(0), $example['review'], 'review '.$path);
        }
        $reading = '/fiches/'.$example['reading_card'];
        $check($exampleXPath->query('//a[@href="'.$reading.'"]')->length > 0, 'Fiche de lecture '.$path);
        if ($formatId === 'cas-2') {
            $check($exampleXPath->query('//*[@id="reperes"]//li/a')->length === 9, 'Neuf coordonnées locales '.$path);
        } else {
            $check($exampleXPath->query('//a[contains(@href,"/niveau/")]')->length === 0, 'Pas de sous-niveau pour '.$path);
        }
    }
}

// Follow links originating on the new pages, without crawling the existing site again.
foreach ($pagesToInspect as $path) {
    foreach ($documents[$path]->getElementsByTagName('a') as $link) {
        $url = parse_url(html_entity_decode($link->getAttribute('href')));
        if ($url === false || isset($url['host']) || isset($url['scheme'])) { continue; }
        $targetPath = $url['path'] ?? $path;
        if (!isset($documents[$targetPath]) && !str_starts_with($targetPath, '/analyses/') && !str_starts_with($targetPath, '/fiches/')) { continue; }
        $target = $fetch($targetPath);
        if (isset($url['fragment'])) {
            $id = rawurldecode($url['fragment']);
            $check($target->getElementById($id) !== null, 'Ancre liée absente '.$path.' → '.$targetPath.'#'.$id);
        }
    }
}

$invalidPaths = ['/analyses/cas-0', '/analyses/cas-5', '/analyses/cas-01', '/analyses/CAS-1', '/analyses/cas-1/inconnu', '/analyses/cas-2/inconnu/niveau/1', '/analyses/cas-1/..%2F.env'];
foreach (['cas-1', 'cas-2', 'cas-3'] as $formatId) {
    foreach ($formats[$formatId]['examples'] as $example) {
        foreach (array_diff(['cas-1', 'cas-2', 'cas-3', 'cas-4'], [$formatId]) as $other) { $invalidPaths[] = '/analyses/'.$other.'/'.$example['slug']; }
        if ($formatId !== 'cas-2') { $invalidPaths[] = '/analyses/cas-2/'.$example['slug'].'/niveau/1'; }
        else {
            foreach (['0', '4', '01', 'invalide'] as $base) { $invalidPaths[] = '/analyses/cas-2/'.$example['slug'].'/niveau/'.$base; }
        }
    }
}
foreach ($formats['cas-4']['examples'] as $example) { $invalidPaths[] = '/analyses/cas-4/'.$example['slug']; }
foreach (array_unique($invalidPaths) as $path) {
    $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
    $check($response->getStatusCode() === 404, 'Route invalide '.$path);
}
$response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create('/analyses/cas-1', 'POST'), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
$check($response->getStatusCode() === 405, 'Routes de lecture limitées à GET');
$check($exampleCount === 8 && $levelCount === 30 && $pointCount === 18 && $reviewCount === 8, 'Couverture des huit exemples');
$result = [
    'checks' => $checks, 'pages' => count($documents), 'formats' => count($formats), 'examples' => $exampleCount,
    'global_positions' => $levelCount, 'local_positions' => $pointCount, 'reviews' => $reviewCount,
    'featured_cards' => count($formats['cas-4']['examples']), 'existing_cards' => count($cards->all()),
    'browser_visual_test' => false, 'errors' => $errors,
];
file_put_contents($root.'/var/analysis-formats-verification.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)."\n";
$kernel->shutdown();
exit($errors ? 1 : 0);
