<?php

require '/var/www/html/vendor/autoload.php';

printf("PHP : %s\nSymfony : %s\nTwig : %s\n", PHP_VERSION, Symfony\Component\HttpKernel\Kernel::VERSION, Twig\Environment::VERSION);

if (PHP_MAJOR_VERSION !== 8 || PHP_MINOR_VERSION !== 5 || !str_starts_with(Symfony\Component\HttpKernel\Kernel::VERSION, '7.4.')) {
    fwrite(STDERR, "La version PHP ou Symfony ne correspond pas à la cible.\n");
    exit(1);
}

try {
    $url = parse_url((string) getenv('DATABASE_URL'));
    $database = new PDO(
        'mysql:host='.$url['host'].';port='.($url['port'] ?? 3306).';dbname='.ltrim($url['path'], '/').';charset=utf8mb4',
        rawurldecode($url['user']),
        rawurldecode($url['pass']),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );
    $version = (string) $database->query('SELECT VERSION()')->fetchColumn();
    printf("MySQL : %s\n", $version);
    if (!str_starts_with($version, '8.4.')) {
        fwrite(STDERR, "La version MySQL ne correspond pas à la cible.\n");
        exit(1);
    }
} catch (Throwable) {
    fwrite(STDERR, "Connexion MySQL impossible. Consultez docker compose ps.\n");
    exit(1);
}

echo "Verification reussie.\n";
