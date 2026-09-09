<?php

namespace App\Tests;

use App\Content\{CardAnalysisLibrary, LearningLibrary, SourceLibrary};
use PHPUnit\Framework\TestCase;

final class CardAnalysisLibraryTest extends TestCase
{
    public function testEveryCardHasSixSystemsWithSixSpecificSublevels(): void
    {
        $root = dirname(__DIR__);
        $cards = new LearningLibrary($root, new SourceLibrary($root));
        $library = new CardAnalysisLibrary($root);
        $analyses = $library->all();
        self::assertNull($library->find('../.env'));
        self::assertNull($library->find('inconnue'));
        self::assertEqualsCanonicalizing(array_column($cards->all(), 'slug'), array_keys($analyses));
        $totalLevels = $totalPoints = 0;
        foreach ($cards->all() as $card) {
            $analysis = $library->find($card['slug']);
            self::assertNotEmpty($analysis['question']);
            self::assertNotEmpty($analysis['basis']);
            self::assertCount(6, $analysis['levels'], $card['slug']);
            $coordinates = $actions = $systems = [];
            $sections = ['conditions', 'exemple', 'controle', ...array_column($card['sections'], 'id')];
            foreach ($analysis['levels'] as $offset => $level) {
                $totalLevels++;
                self::assertSame($offset + 1, $level['id']);
                self::assertSame($level['id'].'.0', $level['coordinate']);
                self::assertSame($library->stages()[$level['id']]['label'], $level['label']);
                self::assertContains($level['section'], $sections, $card['slug']);
                foreach (['title', 'system', 'input', 'output'] as $key) { self::assertNotEmpty(trim($level[$key]), $card['slug'].' '.$key); }
                self::assertNotContains($level['system'], $systems, 'Six systèmes distincts : '.$card['slug']);
                $systems[] = $level['system'];
                if ($level['id'] > 3) { self::assertNotEmpty($level['comparison']); }
                self::assertCount(6, $level['steps']);
                foreach ($level['steps'] as $index => $step) {
                    $totalPoints++;
                    self::assertSame($index + 1, $step['id']);
                    self::assertSame($level['id'].'.'.$step['id'], $step['coordinate']);
                    self::assertSame($library->stages()[$step['id']]['label'], $step['label']);
                    self::assertNotContains($step['coordinate'], $coordinates);
                    $coordinates[] = $step['coordinate'];
                    foreach (['title', 'action', 'output'] as $key) { self::assertNotEmpty(trim($step[$key]), $card['slug'].' '.$step['coordinate'].' '.$key); }
                    self::assertNotContains($step['action'], $actions, 'Actions locales distinctes : '.$card['slug']);
                    $actions[] = $step['action'];
                    if ($step['id'] > 3) { self::assertNotEmpty(trim($step['comparison'])); }
                }
            }
            self::assertCount(36, $coordinates);
        }
        self::assertSame(132, $totalLevels);
        self::assertSame(792, $totalPoints);
    }
}
