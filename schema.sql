DROP TABLE IF EXISTS cores;
CREATE TABLE cores (
    uuid TEXT NOT NULL,
    coredump TEXT NOT NULL,
    filesize INT NOT NULL,
    timestamp INT NOT NULL,
    workspace TEXT NOT NULL,
    gdb TEXT NOT NULL,
    corehash TEXT NOT NULL
);
