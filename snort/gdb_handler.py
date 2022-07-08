from asyncio.subprocess import STDOUT
import os
from subprocess import Popen
from sys import stdout

class GdbHandler:

    def __init__(self, logger) -> None:
        self.logger = logger

    def get_snort_file(self, exec_location):
        return os.path.join(exec_location, "snort")

    def get_lib_path(self, exec_location):
        return exec_location #+ ":/lib64:/usr/lib64:" + "/home/chinchak/debug/ngfw/lib64:/home/chinchak/debug/ngfw/usr/lib64:/home/chinchak/debug/ngfw/lib:/home/chinchak/debug/ngfw/usr/lib:/home/chinchak/debug/ngfw/usr/local/lib:/home/chinchak/debug/ngfw/usr/local/sf/lib:/home/chinchak/debug/ngfw/usr/local/sf/lib/daq:/home/chinchak/debug/ngfw/usr/local/sf/lib/sftunnel:/home/chinchak/debug/ngfw/usr/local/sf/lib64:/home/chinchak/debug/ngfw/usr/local/sf/lib64/cloud:/home/chinchak/debug/ngfw/usr/local/sf/lib64/datastore:/home/chinchak/debug/ngfw/usr/local/asa/lib:/home/chinchak/debug/ngfw/usr/local/drt/lib"

    def get_backtrace_file(self, core_file):
        basename = os.path.basename(core_file)
        return os.path.join(os.path.dirname(core_file), basename + ".backtrace.txt")

    def generate_gdbinit_home(self, exec_location):
        gdb_init_home_path = os.path.expanduser("~/.gdbinit")
        if (os.path.isfile(gdb_init_home_path)):
            return
        gdb_init = open(gdb_init_home_path, "w+")
        gdb_init.write("set auto-load safe-path /")
        gdb_init.close()

    def generate_gdbinit(self, exec_location, core_files):
        try:
            gdb_init = open(os.path.join(exec_location, ".gdbinit"), "w+")
            gdb_init.write("file " + self.get_snort_file(exec_location) + "\n")
            gdb_init.write("set sysroot /xyz\n")
            gdb_init.write(
                "set solib-search-path " + self.get_lib_path(exec_location) + "\n")
            gdb_init.write("set pagination off\n")
            gdb_init.write("set logging overwrite on\n")
            gdb_init.write("set height 0\n")
            gdb_init.write("set width 0\n")
            gdb_init.write("set confirm off\n")
            gdb_init.write("set logging redirect off\n")
            gdb_init.write("set trace-commands on\n")

            for core_file in core_files:
                bt_name = self.get_backtrace_file(core_file)
                gdb_init.write("set logging file " + bt_name + "\n")
                gdb_init.write("set logging on\n")
                gdb_init.write("core-file " + str(core_file) + "\n")
                gdb_init.write("echo \n\n")
                gdb_init.write("bt \n")
                gdb_init.write("echo \n\n")
                gdb_init.write("info inferiors \n")
                gdb_init.write("echo \n\n")
                gdb_init.write("info registers\n")
                gdb_init.write("echo \n\n")
                gdb_init.write("thread apply all backtrace full\n")
                gdb_init.write("set logging off\n")
            gdb_init.write("quit\n")
            gdb_init.close()
        except Exception as e:
            self.logger.error("Exception - {}".format(str(e)))

    def run_gdb(self, exec_location):
        with open(os.devnull) as FNULL:
            Popen(["gdb", "-q", "--batch-silent"], cwd=exec_location, stdout=FNULL, stderr=STDOUT)
