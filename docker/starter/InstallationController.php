<?php

namespace App\Controller;

use Doctrine\DBAL\Connection;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Kernel;
use Symfony\Component\Routing\Attribute\Route;
use Twig\Environment;

final class InstallationController extends AbstractController
{
    #[Route('/', name: 'installation', methods: ['GET'])]
    public function index(Connection $database): Response
    {
        try {
            $mysqlVersion = (string) $database->fetchOne('SELECT VERSION()');
            $connected = true;
        } catch (\Throwable) {
            $mysqlVersion = 'Connexion à vérifier';
            $connected = false;
        }

        return $this->render('installation/index.html.twig', [
            'php_version' => PHP_VERSION,
            'symfony_version' => Kernel::VERSION,
            'twig_version' => Environment::VERSION,
            'mysql_version' => $mysqlVersion,
            'connected' => $connected,
        ], new Response(status: $connected ? 200 : 503));
    }
}
