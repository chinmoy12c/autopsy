DROP TABLE IF EXISTS cores;
DROP TABLE IF EXISTS failed;
CREATE TABLE cores (
    uuid TEXT NOT NULL,
    coredump TEXT NOT NULL,
    filesize INT NOT NULL,
    originaltimestamp INT NOT NULL,
    timestamp INT NOT NULL,
    workspace TEXT NOT NULL,
    gdb TEXT NOT NULL,
    platform TEXT NOT NULL,
    version TEXT NOT NULL,
    deleted INT NOT NULL
);
CREATE TABLE failed (
    uuid TEXT NOT NULL,
    coredump TEXT NOT NULL,
    timestamp NOT NULL
);
