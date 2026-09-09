<?php
require dirname(__DIR__).'/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv(dirname(__DIR__).'/.env');
$kernel = new App\Kernel('dev', true);
$kernel->boot();
$container = $kernel->getContainer();
$db = $container->get('doctrine')->getConnection();
$expected = ['catalog_domain' => 13, 'catalog_topic' => 29, 'catalog_entry' => 154, 'catalog_level' => 42, 'catalog_reference' => 22, 'catalog_symbolization' => 301];
$failures = [];
foreach ($expected as $table => $count) {
    if ((int) $db->fetchOne('SELECT COUNT(*) FROM '.$table) !== $count) { $failures[] = 'Compte incorrect : '.$table; }
}
foreach ([
    ['catalog_topic', 'domain_id', 'catalog_domain'],
    ['catalog_entry', 'topic_id', 'catalog_topic'],
    ['catalog_entry', 'analysis_level_id', 'catalog_level'],
    ['catalog_reference', 'domain_id', 'catalog_domain'],
    ['catalog_symbolization', 'level_id', 'catalog_level'],
] as [$table, $column, $parent]) {
    if ((int) $db->fetchOne("SELECT COUNT(*) FROM $table c LEFT JOIN $parent p ON p.id=c.$column WHERE c.$column IS NOT NULL AND p.id IS NULL") !== 0) { $failures[] = 'Relation invalide : '.$table; }
}
foreach (['user', 'physdb_physadd', 'physdb_physaddtopic', 'physdb_physupdate'] as $privateTable) {
    try {
        $db->fetchOne('SELECT COUNT(*) FROM physdb_archive_20180822.'.$privateTable);
        $failures[] = 'Table privée accessible : '.$privateTable;
    } catch (Doctrine\DBAL\Exception\DriverException $exception) {
        if ($exception->getSQLState() !== '42000') { throw $exception; }
    }
}
$routes = ['/' => [200, 'La boucle générale'], '/topic/' => [200, '29 thèmes'], '/presentation/' => [200, null], '/links/' => [200, null], '/symbolization/' => [200, 'Niveau 6'], '/installation' => [200, null], '/phys/999999' => [404, null], '/hometopics/999999' => [404, null], '/phys/invalide' => [404, null]];
foreach ($db->fetchAllAssociative('SELECT id,title FROM catalog_topic') as $topic) { $routes['/hometopics/'.$topic['id']] = [200, $topic['title']]; }
foreach ($db->fetchAllAssociative('SELECT id,title FROM catalog_entry') as $entry) { $routes['/phys/'.$entry['id']] = [200, $entry['title']]; }
$focused = in_array('--focused', $argv, true);
if ($focused) { $routes = ['/topic/' => [200, null], '/phys/14' => [200, null]]; }
$isolatedReference = $db->fetchOne('SELECT title FROM catalog_reference WHERE id=18');
$nonUrlResource = $db->fetchOne('SELECT web_links FROM catalog_entry WHERE id=14');
$context = stream_context_create(['http' => ['ignore_errors' => true, 'timeout' => 30]]);
$checked = 0;
foreach ($routes as $path => [$expectedStatus, $expectedText]) {
    if ($focused) {
        $body = file_get_contents('http://127.0.0.1'.$path, false, $context);
        $headers = http_get_last_response_headers();
        preg_match('/\s(\d{3})\s/', $headers[0] ?? '', $match);
        $status = (int) ($match[1] ?? 0);
    } else {
        $response = $kernel->handle(Symfony\Component\HttpFoundation\Request::create($path), Symfony\Component\HttpKernel\HttpKernelInterface::SUB_REQUEST);
        $body = $response->getContent();
        $status = $response->getStatusCode();
    }
    if ($status !== $expectedStatus) { $failures[] = 'Statut incorrect : '.$path; }
    if ($expectedText && !str_contains(html_entity_decode($body, ENT_QUOTES | ENT_HTML5, 'UTF-8'), $expectedText)) { $failures[] = 'Texte absent : '.$path; }
    if ($path === '/topic/' && !str_contains(html_entity_decode($body, ENT_QUOTES | ENT_HTML5, 'UTF-8'), $isolatedReference)) { $failures[] = 'Référence du domaine sans thème inaccessible'; }
    if ($path === '/phys/14' && !str_contains(html_entity_decode($body, ENT_QUOTES | ENT_HTML5, 'UTF-8'), $nonUrlResource)) { $failures[] = 'Ressource non URL absente'; }
    $checked++;
    if ($checked % 40 === 0) { echo $checked." routes vérifiées\n"; }
}
$twig = new Twig\Environment(new Twig\Loader\FilesystemLoader(dirname(__DIR__).'/templates'), ['autoescape' => 'html']);
$twig->addExtension(new Symfony\Bridge\Twig\Extension\RoutingExtension($container->get('router')));
$twig->addExtension(new Symfony\Bridge\Twig\Extension\AssetExtension(new Symfony\Component\Asset\Packages(new Symfony\Component\Asset\Package(new Symfony\Component\Asset\VersionStrategy\EmptyVersionStrategy()))));
$twig->addExtension(new App\Twig\LegacyExtension());
$twig->addGlobal('app', ['request' => Symfony\Component\HttpFoundation\Request::create('/phys/0')]);
$level = new App\Entity\AnalysisLevel();
$level->id = 1; $level->base = 2; $level->sub = 1; $level->content = 'Définition témoin';
$entry = new App\Entity\PhysicsEntry();
$entry->id = 0; $entry->title = 'Fiche témoin'; $entry->topic = null; $entry->analysisLevel = $level;
$entry->author = 'Test'; $entry->date = new DateTimeImmutable('2018-08-22'); $entry->updatedAt = null;
$entry->content = "Énergie Σ : x < 3 et y > 2\n<script>alert(1)</script>";
$entry->evaluation = null; $entry->webLinks = 'javascript:alert(1)';
$html = $twig->render('site/entry.html.twig', ['entry' => $entry, 'references' => []]);
if (str_contains($html, '<script>alert(1)</script>') || str_contains($html, 'href="javascript:')) { $failures[] = 'Échappement dangereux'; }
if (!str_contains($html, 'x &lt; 3 et y &gt; 2') || !str_contains($html, 'Énergie Σ')) { $failures[] = 'Symboles scientifiques altérés'; }
$result = ['counts' => $expected, 'routes_checked' => $checked, 'transport' => $focused ? 'http' : 'symfony_kernel', 'failures' => $failures];
file_put_contents(dirname(__DIR__).'/var/catalog-verification'.($focused ? '-focused' : '').'.json', json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n";
exit($failures ? 1 : 0);
