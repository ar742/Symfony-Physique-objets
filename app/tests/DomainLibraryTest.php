<?php

namespace App\Tests;

use App\Content\{DomainLibrary, LearningLibrary, SourceLibrary};
use PHPUnit\Framework\TestCase;

final class DomainLibraryTest extends TestCase
{
    public function testEveryCardBelongsToOneDomainAndEveryStepHasADestination(): void
    {
        $root = dirname(__DIR__);
        $sources = new SourceLibrary($root);
        $learning = new LearningLibrary($root, $sources);
        $domains = new DomainLibrary($root, $learning, $sources);
        self::assertNull($domains->find('../.env'));
        self::assertCount(2, $domains->available());
        self::assertSame([], $domains->find('optique')['cards']);
        $assigned = [];
        $codes = [];
        $domainSlugs = [];
        foreach ($domains->all() as $domain) {
            self::assertNotContains($domain['slug'], $domainSlugs);
            $domainSlugs[] = $domain['slug'];
            self::assertMatchesRegularExpression('/^[a-z][a-z0-9-]*$/', $domain['slug']);
            foreach ($domain['sources'] as $source) {
                self::assertNotEmpty($source['title']);
                self::assertGreaterThan(0, $source['page']);
                if ($source['doc'] === 'cpge') { $codes[] = $source['code']; }
            }
            foreach ($domain['cards'] as $card) {
                self::assertNotContains($card['slug'], $assigned);
                $assigned[] = $card['slug'];
                self::assertSame($domain['slug'], $card['domain']);
            }
            $loopAnchors = [];
            foreach ($domain['loops'] as $group) {
                self::assertNotContains($group['anchor'], $loopAnchors);
                $loopAnchors[] = $group['anchor'];
                self::assertMatchesRegularExpression('/^[a-z][a-z0-9-]*$/', $group['anchor']);
                self::assertCount(6, $group['steps']);
                foreach ($group['steps'] as $index => $step) {
                    self::assertSame($index + 1, $step['id']);
                    self::assertContains($step['color'], ['blue', 'orange', 'green']);
                    $card = $learning->find($step['card']);
                    self::assertNotNull($card);
                    self::assertSame($domain['slug'], $card['domain']);
                    self::assertContains($step['section'], ['conditions', 'exemple', 'controle', 'sources', ...array_column($card['sections'], 'id')]);
                    self::assertNotEmpty($step['tip']);
                }
            }
            foreach ($domain['steps'] as $step) {
                self::assertContains($step['loop_anchor'], $loopAnchors);
                self::assertNotEmpty($step['loop_title']);
            }
        }
        self::assertEqualsCanonicalizing(array_column($learning->all(), 'slug'), $assigned);
        foreach (range(1, 26) as $number) { self::assertContains('P'.$number, $codes, 'Couverture du plan CPGE'); }
        self::assertCount(2, $domains->find('mecanique')['loops']);
        self::assertSame('boucle-domaine', $domains->find('mecanique')['loops'][0]['anchor'], 'Ancre M1 conservée');
        self::assertCount(12, $domains->find('mecanique')['steps']);
        self::assertCount(8, $domains->find('mecanique')['cards']);
        self::assertCount(8, $domains->find('thermodynamique-statistique')['cards']);
    }
}
