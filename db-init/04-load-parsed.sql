SET search_path = public;
\copy authors_raw_archive_parsed FROM '/docker-entrypoint-initdb.d/03-parsed.csv' WITH (FORMAT csv)
