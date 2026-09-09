<?php

namespace App\Tests;

use App\Content\{LoopGuide, SourceLibrary};
use PHPUnit\Framework\TestCase;

final class SourceLibraryTest extends TestCase
{
    public function testEveryReferenceIsWithinItsDocumentAndCodesAreUnique(): void
    {
        $sources = new SourceLibrary(dirname(__DIR__));
        self::assertNull($sources->find('../.env'));
        self::assertNull($sources->entry('cpge', 'ABSENT'));
        self::assertCount(56, $sources->find('cpge')['entries']);
        self::assertCount(35, $sources->find('theorique')['entries']);
        foreach ($sources->all() as $document) {
            $codes = [];
            foreach ($document['entries'] as $entry) {
                self::assertGreaterThan(0, $entry['page']);
                self::assertLessThanOrEqual($document['pages'], $entry['page']);
                self::assertNotContains($entry['code'], $codes);
                $codes[] = $entry['code'];
            }
        }
    }

    public function testAllSixLoopStepsResolveTheirSourcePages(): void
    {
        $sources = new SourceLibrary(dirname(__DIR__));
        $steps = (new LoopGuide(dirname(__DIR__), $sources))->steps();
        self::assertSame([1, 2, 3, 4, 5, 6], array_column($steps, 'id'));
        foreach ($steps as $step) {
            self::assertNotEmpty($step['tip']);
            foreach ($step['sources'] as $source) {
                self::assertSame($sources->entry($source['doc'], $source['code'])['page'], $source['page']);
            }
        }
        self::assertSame(450, $sources->entry('cpge', 'P22')['page']);
        self::assertSame(287, $sources->entry('theorique', 'PC3')['page']);
    }
}
