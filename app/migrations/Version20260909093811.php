<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260909093811 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Catalogue scientifique : domaines, thèmes, fiches, niveaux, références et symbolisations.';
    }

    public function isTransactional(): bool
    {
        return false; // MySQL commits DDL implicitly; the content import has its own transaction.
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE catalog_domain (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, content LONGTEXT NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE catalog_entry (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) NOT NULL, author VARCHAR(255) NOT NULL, date DATETIME NOT NULL, content LONGTEXT NOT NULL, evaluation LONGTEXT DEFAULT NULL, updated_at DATETIME DEFAULT NULL, web_links VARCHAR(255) DEFAULT NULL, topic_id INT DEFAULT NULL, analysis_level_id INT NOT NULL, INDEX IDX_9232FCC91F55203D (topic_id), INDEX IDX_9232FCC9B6A83FF4 (analysis_level_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE catalog_level (id INT AUTO_INCREMENT NOT NULL, base INT NOT NULL, sub INT NOT NULL, content LONGTEXT NOT NULL, UNIQUE INDEX level_coordinates (base, sub), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE catalog_reference (id INT AUTO_INCREMENT NOT NULL, theory TINYINT NOT NULL, title VARCHAR(255) NOT NULL, date DATETIME NOT NULL, content LONGTEXT DEFAULT NULL, web_links VARCHAR(255) DEFAULT NULL, domain_id INT DEFAULT NULL, INDEX IDX_549EA3AE115F0EE5 (domain_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE catalog_symbolization (id INT AUTO_INCREMENT NOT NULL, content LONGTEXT NOT NULL, level_id INT DEFAULT NULL, INDEX IDX_7C790CEC5FB14BA7 (level_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE catalog_topic (id INT AUTO_INCREMENT NOT NULL, mode INT NOT NULL, title VARCHAR(255) NOT NULL, date DATETIME NOT NULL, content LONGTEXT DEFAULT NULL, domain_id INT DEFAULT NULL, INDEX IDX_2453BFA2115F0EE5 (domain_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE messenger_messages (id BIGINT AUTO_INCREMENT NOT NULL, body LONGTEXT NOT NULL, headers LONGTEXT NOT NULL, queue_name VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL, available_at DATETIME NOT NULL, delivered_at DATETIME DEFAULT NULL, INDEX IDX_75EA56E0FB7336F0E3BD61CE16BA31DBBF396750 (queue_name, available_at, delivered_at, id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE catalog_entry ADD CONSTRAINT FK_9232FCC91F55203D FOREIGN KEY (topic_id) REFERENCES catalog_topic (id)');
        $this->addSql('ALTER TABLE catalog_entry ADD CONSTRAINT FK_9232FCC9B6A83FF4 FOREIGN KEY (analysis_level_id) REFERENCES catalog_level (id)');
        $this->addSql('ALTER TABLE catalog_reference ADD CONSTRAINT FK_549EA3AE115F0EE5 FOREIGN KEY (domain_id) REFERENCES catalog_domain (id)');
        $this->addSql('ALTER TABLE catalog_symbolization ADD CONSTRAINT FK_7C790CEC5FB14BA7 FOREIGN KEY (level_id) REFERENCES catalog_level (id)');
        $this->addSql('ALTER TABLE catalog_topic ADD CONSTRAINT FK_2453BFA2115F0EE5 FOREIGN KEY (domain_id) REFERENCES catalog_domain (id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE catalog_entry DROP FOREIGN KEY FK_9232FCC91F55203D');
        $this->addSql('ALTER TABLE catalog_entry DROP FOREIGN KEY FK_9232FCC9B6A83FF4');
        $this->addSql('ALTER TABLE catalog_reference DROP FOREIGN KEY FK_549EA3AE115F0EE5');
        $this->addSql('ALTER TABLE catalog_symbolization DROP FOREIGN KEY FK_7C790CEC5FB14BA7');
        $this->addSql('ALTER TABLE catalog_topic DROP FOREIGN KEY FK_2453BFA2115F0EE5');
        $this->addSql('DROP TABLE catalog_domain');
        $this->addSql('DROP TABLE catalog_entry');
        $this->addSql('DROP TABLE catalog_level');
        $this->addSql('DROP TABLE catalog_reference');
        $this->addSql('DROP TABLE catalog_symbolization');
        $this->addSql('DROP TABLE catalog_topic');
        $this->addSql('DROP TABLE messenger_messages');
    }
}
