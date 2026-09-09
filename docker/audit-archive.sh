#!/bin/sh
set -eu
export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
mysql -u root --batch --skip-column-names physdb_archive_20180822 -e '
SELECT "physdb_domain", COUNT(*) FROM physdb_domain UNION ALL
SELECT "physdb_topic", COUNT(*) FROM physdb_topic UNION ALL
SELECT "physdb_phys", COUNT(*) FROM physdb_phys UNION ALL
SELECT "physdb_level", COUNT(*) FROM physdb_level UNION ALL
SELECT "physdb_reference", COUNT(*) FROM physdb_reference UNION ALL
SELECT "physdb_symbolization", COUNT(*) FROM physdb_symbolization UNION ALL
SELECT "physdb_physadd", COUNT(*) FROM physdb_physadd UNION ALL
SELECT "physdb_physaddtopic", COUNT(*) FROM physdb_physaddtopic UNION ALL
SELECT "physdb_physupdate", COUNT(*) FROM physdb_physupdate UNION ALL
SELECT "user", COUNT(*) FROM user;'
