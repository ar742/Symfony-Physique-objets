<?php

namespace App\Command;

use App\Migration\LegacyLevel;
use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:import-legacy', description: 'Importe les six tables scientifiques de la sauvegarde du 22 août 2018.')]
final class ImportLegacyCommand extends Command
{
    private const SOURCE = 'physdb_archive_20180822.';
    private const TABLES = [
        'physdb_domain' => ['catalog_domain', 13],
        'physdb_level' => ['catalog_level', 42],
        'physdb_topic' => ['catalog_topic', 29],
        'physdb_phys' => ['catalog_entry', 154],
        'physdb_reference' => ['catalog_reference', 22],
        'physdb_symbolization' => ['catalog_symbolization', 301],
    ];

    public function __construct(private readonly Connection $db)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('dry-run', null, InputOption::VALUE_NONE, 'Valider et compter sans écrire.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $rows = [];
        $levels = [];
        foreach (self::TABLES as $source => [$target, $expected]) {
            $data = $this->db->fetchAllAssociative('SELECT * FROM '.self::SOURCE.$source.' ORDER BY id');
            if (count($data) !== $expected) {
                throw new \RuntimeException('Nombre inattendu dans '.$source.' : import interrompu.');
            }
            foreach ($data as &$row) {
                if ($source === 'physdb_level') {
                    $levels[$row['base'].'-'.$row['sub']] = $row['id'];
                } elseif ($source === 'physdb_phys') {
                    [$base, $sub] = LegacyLevel::decode($row['level']);
                    $row['analysis_level_id'] = $levels[$base.'-'.$sub] ?? throw new \RuntimeException('Niveau manquant.');
                    unset($row['level']);
                } elseif ($source === 'physdb_reference') {
                    $row['domain_id'] = $row['domainId'];
                    unset($row['domainId']);
                } elseif ($source === 'physdb_symbolization') {
                    $row['level_id'] = $row['levelkey'];
                    unset($row['levelkey']);
                }
            }
            unset($row);
            $rows[$target] = $data;
        }

        $counts = [];
        foreach ($rows as $table => $data) {
            $counts[$table] = (int) $this->db->fetchOne('SELECT COUNT(*) FROM '.$table);
        }
        $empty = array_sum($counts) === 0;
        if (!$empty) {
            $this->verify($rows);
            $io->success('Les 561 enregistrements sont déjà présents et identiques. Aucune écriture.');
            return Command::SUCCESS;
        }
        $io->table(['Table cible', 'Enregistrements'], array_map(
            static fn (string $table, array $data): array => [$table, count($data)], array_keys($rows), $rows,
        ));
        if ($input->getOption('dry-run')) {
            $io->success('Lecture et conversion des 561 enregistrements validées, sans écriture.');
            return Command::SUCCESS;
        }

        $this->db->transactional(function () use ($rows): void {
            foreach ($rows as $table => $data) {
                foreach ($data as $row) {
                    $this->db->insert($table, $row);
                }
            }
            $this->verify($rows);
        });
        $io->success('561 enregistrements importés et vérifiés champ par champ. Comptes et propositions conservés dans l’archive.');

        return Command::SUCCESS;
    }

    private function verify(array $expectedTables): void
    {
        foreach ($expectedTables as $table => $expectedRows) {
            $actualRows = $this->db->fetchAllAssociative('SELECT * FROM '.$table.' ORDER BY id');
            if (count($actualRows) !== count($expectedRows)) {
                throw new \RuntimeException('La table '.$table.' contient des données différentes : aucune donnée existante ne sera remplacée.');
            }
            foreach ($expectedRows as $index => $expected) {
                foreach ($expected as $column => $value) {
                    $actual = $actualRows[$index][$column];
                    if (($actual === null) !== ($value === null) || (string) $actual !== (string) $value) {
                        throw new \RuntimeException(sprintf('Différence dans %s, id %s, champ %s : aucune donnée existante ne sera remplacée.', $table, $expected['id'], $column));
                    }
                }
            }
        }
    }
}
