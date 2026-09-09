<?php

namespace App\Tests;

use App\Migration\LegacyLevel;
use App\Twig\LegacyExtension;
use PHPUnit\Framework\TestCase;

final class LegacyImportTest extends TestCase
{
    public function testHistoricalCoordinatesAreConvertedWithoutExecutingPhp(): void
    {
        self::assertSame([2, 1], LegacyLevel::decode('a:2:{i:0;s:1:"2";i:1;s:1:"1";}'));
        self::assertSame([6, 0], LegacyLevel::decode('a:2:{i:0;s:1:"6";i:1;s:1:"0";}'));
        self::assertSame([1, 6], LegacyLevel::decode('a:2:{i:0;s:1:"1";i:1;s:1:"6";}'));
    }

    public function testSerializedObjectsAreRejected(): void
    {
        $this->expectException(\UnexpectedValueException::class);
        LegacyLevel::decode('O:8:"stdClass":0:{}');
    }

    public function testCoordinatesOutsideTheModelAreRejected(): void
    {
        $this->expectException(\UnexpectedValueException::class);
        LegacyLevel::decode('a:2:{i:0;s:1:"7";i:1;s:1:"1";}');
    }

    public function testHistoricalLinksOnlyAcceptWebAddresses(): void
    {
        $filter = new LegacyExtension();
        foreach ([null, '', 'javascript:alert(1)', 'data:text/html,test', '//example.com', '/login/', 'https://'] as $url) {
            self::assertNull($filter->webUrl($url));
        }
        self::assertSame('https://example.com/?q=thermo&n=2', $filter->webUrl(' https://example.com/?q=thermo&n=2 '));
        self::assertSame('http://example.com/file.pdf', $filter->webUrl('http://example.com/file.pdf'));
    }
}
