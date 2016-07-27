DROP TABLE IF EXISTS cores;
CREATE TABLE cores (
    uuid TEXT NOT NULL,
    coredump TEXT NOT NULL,
    filesize TEXT NOT NULL,
    report TEXT NOT NULL
);
