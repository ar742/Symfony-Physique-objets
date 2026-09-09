#!/bin/sh
set -eu
export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"
mysql -u root --batch --skip-column-names -e 'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME IN ("physique", "physdb_archive_20180822"); SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA="physique";'
existing=$(mysql -u root --batch --skip-column-names -e 'SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME="physdb_archive_20180822"')
if [ "$existing" != 0 ]; then
    echo 'La base archive existe deja : restauration interrompue pour la conserver.' >&2
    exit 1
fi
echo 'f66fb75d87bc8a03050912cdd68e098a56cc79814e6bf21612efe2529ea861ce  /tmp/physdb-2018-08-22.sql' | sha256sum -c -
mysql -u root -e 'CREATE DATABASE physdb_archive_20180822 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
mysql -u root --default-character-set=utf8mb4 physdb_archive_20180822 < /tmp/physdb-2018-08-22.sql
# The application can read only the scientific tables, never the old accounts or submissions.
for table in physdb_domain physdb_topic physdb_phys physdb_level physdb_reference physdb_symbolization; do
    mysql -u root -e "GRANT SELECT ON physdb_archive_20180822.$table TO 'physique'@'%';"
done
echo 'Archive restauree ; acces applicatif limite aux six tables scientifiques.'
