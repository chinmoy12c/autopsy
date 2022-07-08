import logging
import os
import re
import shutil
import ssl
import subprocess
import sys
from urllib.request import urlopen

VALID_VER = ['5.4', '6.0', '6.1', '6.2', '6.3', '6.4', '6.5', '6.6', '6.7',
            '6.8', '7.0', '7.1', '7.2', '7.3', '7.4']
SERVER_URL = 'http://10.83.68.22'
GDB_URL = 'http://10.77.134.59/gdb/'
STRINGS_URL = 'http://10.77.134.59/Tools/strings'
DEV_FILE = ".devel"
BGL_SRVR = '173.39.58.37'
FUL_SRVR = '10.83.69.107'

class DownloadHandler:

    def __init__(self, logger) -> None:
        self.ctx = ssl.create_default_context()
        self.ctx.check_hostname = False
        self.ctx.verify_mode = ssl.CERT_NONE
        self.logger = logger

    def find_nearest_srvr (self):
        rtt_bgl = 0
        rtt_ful = 0
        self.logger.info ("Checking for Nearest Build server to download")
        # Temporary ti make it faster
        # return 'BGL'
        cmd = 'ping ' + BGL_SRVR + ' -c 5'
        bgl_ping_outp = os.popen(cmd).read()
        _var = re.search('rtt min/avg/max/mdev = (\S+)/(\S+)/(\S+)/(\S+)\s+ms', bgl_ping_outp)
        if _var:
            rtt_bgl = _var.group(2)
        cmd = 'ping ' + FUL_SRVR + ' -c 5'
        ful_ping_outp = os.popen(cmd).read()
        _var = re.search('rtt min/avg/max/mdev = (\S+)/(\S+)/(\S+)/(\S+)\s+ms', ful_ping_outp)
        if _var:
            rtt_ful = _var.group(2)
        if rtt_bgl < rtt_ful:
            self.logger.info ("Using BGL server for downloading libs")
            return 'BGL'
        self.logger.info ("Using FUL server for downloading libs")
        return 'FUL'

    def file_exists(self, location):
        from urllib.request import urlopen, Request
        from urllib.error import HTTPError
        try:
            request = Request(location)
            request.get_method = lambda: 'HEAD'
        except Exception as e:
            self.logger.error ("file_exists: Exception - {}".format(str(e)))
        try:
            response = urlopen(request,context=self.ctx)
            self.logger.debug ("file_exists: Response output - {}".format(response))
            return True
        except HTTPError:
            return False

    def download_gdb(self, directory, model):
        self.logger.info ("\n\n Downloading GDB and Other libs .............\n\n")
        wget_url = "wget -q -P " + directory + " " + GDB_URL + str(model) + "/gdb"
        if not self.dnld_file(wget_url, "GDB"):
            return False
        os.chmod(os.path.join(directory, "gdb"), 111)
        return True

    def dnld_file(self, url, fName):

        # use subprocess command to check errors , some devices contains custom
        # version of WGET clien which doesnt accespt the cert-check command
        self.logger.debug("Downloading URL - {}".format(url))
        try:
            output = err = None
            cmd = subprocess.Popen(url, stdin=subprocess.PIPE,
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, shell=True)
            output, err = cmd.communicate()

            if err.decode().strip() == None:
                self.logger.info ("Downloading file - \"{}\"- complete".format(
                    fName))
            elif re.search('unrecognized option', err.decode()):
                self.logger.debug("WGET command doesnt support cert-check option, "
                        "will remove from the URL")
                url = re.sub('--no-check-certificate', '', url)
                self.logger.debug("URL After strips down - {}".format(url))
                cmd2 = subprocess.Popen(url, stdin=subprocess.PIPE,
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE, shell=True)
                output2 = err2 = None
                output2, err2 = cmd2.communicate()
                if not len(err2.decode().strip()):
                    self.logger.info("Downloading file - \"{}\"- complete".format(
                        fName))
                else:
                    self.logger.error("Failed to download file - {}, "
                                    "\nError output - "
                                    "{}".format(fName, err2.decode()))
                    return False
        except Exception as e:
            self.logger.debug(str(e))
            return False
        return True

    def get_daq_ver(self, sw_ver):
        daq_matrix = {'5.4': "daq4", '6.0': "daq5", '6.1': "daq6", '6.2': "daq7",
                    '6.3': "daq8", '6.4': "daq9", '6.5': "daq10", '6.6': "daq11",
            '6.7': "daq12", '6.8': "daq13", '7.0': "daq13", '7.1': "daq14",
                    '7.2': "daq15",'7.3': "daq16", '7.4': "daq17" }
        print (" \
            DAQ Version = %s" % (daq_matrix[sw_ver[:3]]))
        return daq_matrix[sw_ver[:3]]

    def get_build_path(self, fmc_version, fmc_build):
        "Parse and get path to copy the  "
        paths_list = ["Development", "Testing", "Release"]
        branch = None

        for path in paths_list:
            self.logger.debug("Checking {}-{} under {} folder".format(fmc_version,
                                                            fmc_build,path))
            temp_app_id_url = SERVER_URL + '/netboot/ims/' + path + "/" + \
                            fmc_version + "-" \
                            + str(
                fmc_build) \
                            + "/" + "/dynamic-preprocessors/rna"
            self.logger.debug("The URL to check - {}".format(temp_app_id_url))
            if (self.file_exists(temp_app_id_url)):
                self.logger.debug("Found the build under - {} - path".format(path))
                return path
        self.logger.info ("Couldnt find the build artifacts in Development/Testing/Release folder, please check if the build artifacts exist")
        sys.exit(1)

    def get_abs_model(self, model):
        if re.match(r"6\d", model):
            abs_model = 63
        elif re.match(r"7\d", model):
            abs_model = 75
        ## Added to support 3100 platform, may need to tweak based on the model
        # numbers
        elif re.match(r"8\d", model):
            abs_model = 75
        return str(abs_model)

    def get_linux_model(self, abs_model, ftd_ver):
        linux_model = ""
        if abs_model == '63':
            linux_model = "sf-linux-os-64bit"
        else:
            linux_model = "wrlinux-os-64bit"
        print ("\
            Linux Model = %s" % linux_model)
        return linux_model

    def get_devel_file(self):
        return os.path.join(os.path.expanduser('~'), DEV_FILE)

    def store_devel_dir(self, directory):
        fp = open(self.get_devel_file(), 'w+');
        fp.write(directory)
        fp.close()

    def get_system_libs(self, debug_directory):
        libs_directories = (
            "ngfw/lib",
            "ngfw/lib64",
            "ngfw/usr/lib",
            "ngfw/usr/lib64",
            "ngfw/usr/local/sf/lib",
            "ngfw/usr/local/sf/lib64",
            "ngfw/usr/local/asa/lib",
            "usr/lib64",
            "lib64"
        )
        print("Moving Files....")
        for lib_directory in libs_directories:
            print("Looking into: " + os.path.join(os.path.expanduser("~/debug"), lib_directory))
            for file in os.listdir(os.path.join(os.path.expanduser("~/debug"), lib_directory)):
                abspath = os.path.join(os.path.join(os.path.expanduser("~/debug"), lib_directory), file)
                print(abspath)
                if (os.path.isfile(abspath) and not os.path.exists(os.path.join(debug_directory, file))):
                    print("Copying file: " + abspath)
                    shutil.copy(abspath, debug_directory)

    def dnld_strings_file(self, directory):
        wget_url = "wget -q -P " + directory + " " + STRINGS_URL
        try:
            if not os.path.isfile(os.path.join(directory, "strings")):
                if not self.dnld_file(wget_url, "strings"):
                    return False
            else:
                self.logger.info("Strings file exists, will re-use")
            os.chmod(os.path.join(directory, "strings"), 111)
        except Exception as e:
            self.logger.error("Exception - {}".format(str(e)))
        return True

    def get_snort_ver(self, directory, core_location):
        # Snort3 cores are too big to run strings directly, hence piking the
        # initial 2G to fetch the snort version.
        self.dnld_strings_file(directory)
        self.logger.info("Checking Snort version from core dump")
        core_location = str(core_location)
        tr_file_name = core_location + '_trunc'
        tr_cmd = 'head -c 2000000000 ' + core_location + ' >' + tr_file_name
        trunc_core_file = os.popen(tr_cmd).read()
        cmd = directory + "/strings " + tr_file_name + "| egrep \'(Snort|DC) Version\' "
        sVersion = os.popen(cmd).read()
        os.remove(tr_file_name)
        # There are instances where the version was not part of Initial 2G but
        # was able to find from end of the 2G
        self.logger.debug("Checking Snort version on bottom 2Gb of core")
        tr_cmd = 'tail -c 2000000000 ' + core_location + ' >' + tr_file_name
        trunc_core_file = os.popen(tr_cmd).read()
        cmd = directory + "/strings " + tr_file_name + "| egrep \'(Snort|DC) Version\' "
        sVersion += os.popen(cmd).read()
        os.remove(tr_file_name)

        if re.search(r"Snort\s+Version\s+(\S+)\s+Build\s+(\S+)", sVersion):
            version = re.search(r"Snort\s+Version\s+(\S+)\s+Build\s+(\S+)",
                                sVersion)
        else:
            self.logger.info ("ERROR: Couldn't find the Snort version from core file, please specify the snort version as part of -s argument")
            sys.exit(1)
        self.logger.info("\
            Snort Version From Core Dump = %s" % (version.group(1) + "-" + version \
            .group(2)))
        return version.group(1) + "-" + version.group(2)

    def create_wget_link(self, ftd_ver, ftd_build, model, snort_ver, fmc_version , fmc_build , directory,
                        core_location,
                        no_cleanup):
        "Create wget links to download DAQ and snort libraries"
        global FTD_VERSION, FMC_VERSION, DEVICE_MODEL
        # Copy the strings file before checking Snort version
        self.dnld_strings_file(directory)
        if self.find_nearest_srvr() == 'BGL':
            SERVER_URL = 'https://' + BGL_SRVR + '/netboot/ims/'
        else:
            SERVER_URL = 'https://' + FUL_SRVR + '/netboot/ims/'

        snort_lib_file_list = (
            "snort",
            "libsf_appid_preproc.so",
            "libsf_dce2_preproc.so",
            "libsf_dnp3_preproc.so",
            "libsf_dns_preproc.so",
            "libsf_ftptelnet_preproc.so",
            "libsf_gtp_preproc.so",
            "libsf_imap_preproc.so",
            "libsf_modbus_preproc.so",
            "libsf_pop_preproc.so",
            "libsf_reputation_preproc.so",
            "libsf_sdf_preproc.so",
            "libsf_sip_preproc.so",
            "libsf_smtp_preproc.so",
            "libsf_ssh_preproc.so",
            "libsf_ssl_preproc.so",
            "libsf_engine.so")
        sf_lib_file_list = (
            "sf_rna_preproc.so",
            "sf_ssl_preproc.so")
        sf_appid_file_list = ("thirdparty_appid_impl_navl.so")
        daq_lib_files_7x = (
            "daq_afpacket.so",
            "daq_dump.so",
            "daq_oct_sftls.so",
            "daq_oct_ssl.so",
            "daq_pcap.so",
            "daq_pdts.so",
            "daq_sfpacket.so",
            "daq_pdts_sftls.so")
        daq_lib_files_6x = (
            "daq_afpacket.so",
            "daq_dump.so",
            "daq_pcap.so",
            "daq_sfpacket.so",
            "daq_sfpacket_asa.so")
        daq_plib_files_6x = (
            "daq_nfe.so",
            "daq_nse.so")

        snort3_unstripped = ("snort")
        snort3_plugin_libs = (
            "appid_navl.so",
            "captive_portal.so",
            "cd_pdts.so",
            "crashhandler.so",
            "dns_si.so",
            "efd.so",
            "firewall.so",
            "iab.so",
            "identity.so",
            "insight.so",
            "izm.so",
            "mercury.so",
            "qos.so",
            "rna_util.so",
            "url_si.so",
            "xtls.so",
            )
        snort3_daq_lib = (
            "daq_pdts.so",
            "daq_oct.so")
        snort3_lib64_so = (
            "librabbitmq.so",
            "libsfutilx.so",
            "libtmatchcompile.so",
            "libtmatchlookup.so",
            "struct.so")

        if (int(ftd_ver[2:3]) <= 3):
            nse_lib_files = (
                "libnsenfm.so",
                "libnse.so",
                "libnse.so.1",
                "libnslib_nse_native.so",
                "libnslib_nse.so",
                "libnsnet_compat.so",
                "libnsnet.so",
            )
        else:
            # Post 6.4 release where hardware acceleration is enabled
            nse_lib_files = (
                "libsftls-engine.so",
            )

        nse_common_files = (
            "libdext_conn.so",
        )
        plib_files = [
            "libsfssl.so",
        ]

        liblog_files = (
            "liblogc.so",
            "liblogdb.so",
        )

        ssp_lib64_files = [
            "libsfssl.so",
        ]

        nse_lib_path = "unstripped-lib"

        # Check if the WGET client does support cert option, some clients in
        # devices like WM doesnt support this option.

        wget_master = "wget -q --no-check-certificate -P " + directory + " " + SERVER_URL

        self.logger.debug("Avoid Checking FMC version from the device is provided "
                        "throuh command line option")
        if fmc_version is None:
            # Find the FMC version from sftunnel_status output
            self.logger.debug("Checking FMC version from device throuh sf_tunnel "
                            "Command output")
            sf_tunn_cmd_outp = os.popen('sftunnel_status.pl').read()
            #self.logger.debug("Command Output = {}".format(sf_tunn_cmd_outp))
            if re.search('sw_version\s+(\S+)', sf_tunn_cmd_outp):
                fmc_version = re.search('sw_version\s+(\S+)', sf_tunn_cmd_outp).group(1)
            if re.search('sw_build\s+(\S+)', sf_tunn_cmd_outp):
                fmc_build = re.search('sw_build\s+(\S+)', sf_tunn_cmd_outp).group(1)
            #
        # Check if the FMC version is provided, if not, will assume FMC version same as
        # FTD version
        if fmc_version is None:
            fmc_version = ftd_ver
            fmc_build = ftd_build
        FTD_VERSION = ftd_ver
        FMC_VERSION = fmc_version

        #Get DAQ version
        daq = self.get_daq_ver(ftd_ver)

        # Check for path if it is RELEASE or DEVELOPMENT
        #
        if (snort_ver == ""):
            snort_ver = self.get_snort_ver(directory, core_location)
        self.logger.debug("CHecking for build path for FMC version - {}-{}".format(fmc_version, fmc_build))
        path = self.get_build_path(fmc_version, fmc_build)
        self.logger.debug(
            "CHecking for build path for FTD version - {}-{}".format(ftd_ver,ftd_build))
        ftd_path = self.get_build_path(ftd_ver, ftd_build)
        print ("         Snort Version = {}".format(snort_ver))
        print ("\
                FMC Version = %s" % fmc_version + "-" + fmc_build)

        print ("         FMC Build path = %s" % path)
        print ("         FTD Build path = %s" % ftd_path)
        abs_model = self.get_abs_model(model)
        linux_model = self.get_linux_model(abs_model, ftd_ver)
        ## Feature branch end
        if path == 'Release':
            nse_lib_path = "lib"
        # DAQ mode is daq7 (without wr8 keyword)
        app_id_url = wget_master + "/" + path + "/" + fmc_version + "-" + fmc_build + "/" + \
                    "/dynamic-preprocessors/rna/" + fmc_version + "-" + str(
            fmc_build) + \
                    ".unstripped-" + linux_model + "-" + daq + "/appid/thirdparty_appid/" + \
                    "thirdparty_appid_impl_navl.so"
        # Download GDB from the above location
        if not self.download_gdb(directory, abs_model):
            return False
        self.get_system_libs(directory)
        # Fetch URL
        self.dnld_file(app_id_url, "thirdparty_appid_impl_navl.so")

        if snort_ver[:1] == '2':
            # Fetch the snort path here from the components list
            snort_build_path = None
            snort_ver_comp = None
            snort_bld_comp = None
            try:
                cp_url = SERVER_URL + "/" + path + "/" + fmc_version + "-" + \
                        fmc_build + '/components.txt'
                f = urlopen(cp_url,context=self.ctx)
                myfile = f.read().decode("utf-8")
                rexp = re.compile("SNORT_PACKAGE_SUBDIR=(\S+)/r2")
                rexp1 = re.compile("SNORT_VERSION=(\S+)")
                rexp2 = re.compile("SNORT_BUILD=(\S+)")
                for line in myfile.split("\n"):
                    regex_result = re.match(rexp, line)
                    if regex_result:
                        snort_build_path = regex_result.group(1)
                        break
                for line in myfile.split("\n"):
                    regex_result = re.match(rexp1, line)
                    if regex_result:
                        snort_ver_comp = regex_result.group(1)
                        break
                for line in myfile.split("\n"):
                    regex_result = re.match(rexp2, line)
                    if regex_result:
                        snort_bld_comp = regex_result.group(1)
                        break
            except Exception as e:
                self.logger.info ('Could not fetch the URL for snort binary')
                self.logger.info ("Execption - {}".format(str(e)))


            # copy lib files to the directory for debugging
            (snort_maj, snort_bld) = snort_ver.split('-')
            for fName in snort_lib_file_list:
                url = wget_master + "/netboot/" + snort_build_path + "/" + \
                snort_ver_comp + "-" + snort_bld_comp +\
                ".unstripped" + "/x86_64/" + abs_model + "/" + daq + "/" + fName
                if not self.dnld_file(url, fName):
                    if fName == "snort":
                        self.logger.info ("oops,I couldn't download Snort Binary, will exit here")
                        self.logger.info (("please check URL: %s if it is a valid link", url))
                        sys.exit(1)
                    else:
                        self.logger.info (("WARNING:downloading of file:%s failed ", url))

            # Fetch all DAQ files
            if abs_model == '63':
                for fName in daq_lib_files_6x:
                    url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                        ftd_build) + \
                        "/unstripped-binaries/x86_64/lib/daq/" + fName
                    self.logger.info (url)
                    self.dnld_file(url, fName)
                for fName in daq_plib_files_6x:
                    url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                        ftd_build) + \
                        "/unstripped-binaries/x86_64/plib/daq/" + fName
                    self.logger.info (url)
                    self.dnld_file(url, fName)
                for fName in plib_files:
                    url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                        ftd_build) + \
                        "/unstripped-binaries/x86_64/plib64/" + fName
                    self.logger.info (url)
                    self.dnld_file(url, fName)

            elif (int(abs_model) >= 75):

                for fName in liblog_files:
                    url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                        ftd_build) + \
                        "/unstripped-binaries/x86_64/lib64/" + fName
                    self.dnld_file(url, fName)

                for fName in ssp_lib64_files:
                    url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                        ftd_build) + \
                        "/unstripped-binaries/SSP/x86_64/lib64/" + fName
                    self.dnld_file(url, fName)

                for fName in daq_lib_files_7x:
                    url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                        ftd_build) + \
                        "/unstripped-binaries/SSP/x86_64/lib/daq/" + fName
                    self.dnld_file(url, fName)
                for fName in nse_lib_files:
                    if (int(ftd_ver[2:3]) <= 3):
                        url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                            ftd_build) + \
                            "/unstripped-binaries/SSP/x86_64/pegasus/" + nse_lib_path + "/" + fName
                        self.dnld_file(url, fName)
                    else:
                        url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                            ftd_build) + \
                            "/unstripped-binaries/SSP/x86_64/sftls/lib/" + \
                            "/" + fName
                        self.dnld_file(url, fName)

                for fName in nse_common_files:
                    if (int(ftd_ver[2:3]) <= 3):
                        url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                            ftd_build) + \
                            "/unstripped-binaries/SSP/x86_64/pegasus/" + nse_lib_path + "/common/" + fName
                        self.dnld_file(url, fName)
                    else:
                        url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                            ftd_build) + \
                            "/unstripped-binaries/SSP/x86_64/sftls/lib/" + \
                            "/ngfw/" + fName
                        self.dnld_file(url, fName)
            else:
                self.logger.info ("%s  Platform Model cureently not supported" % abs_model)
                return False
            # Fetch RNA and SSL files
            for fName in sf_lib_file_list:
                url = wget_master + "/" + path + "/" + fmc_version + "-" + fmc_build + "/" + \
                    "/dynamic-preprocessors/rna/" + fmc_version + "-" + str(
                    fmc_build) + \
                    ".unstripped-" + linux_model + "-" + daq + "/" + fName
                #print url
                self.dnld_file(url, fName)
            if no_cleanup:
                self.store_devel_dir(directory)
            return True

        elif snort_ver[:1] == '3':
            snort_build_path = None
            snort_ver_comp = None
            snort_bld_comp = None
            try:
                cp_url = SERVER_URL + "/" + path + "/" + fmc_version + "-" + \
                        fmc_build + '/components.txt'
                f = urlopen(cp_url,context=self.ctx)
                myfile = f.read().decode("utf-8")
                rexp = re.compile("SNORT3_PACKAGE_SUBDIR=(\S+)")
                rexp1 = re.compile("SNORT3_VERSION=(\S+)")
                rexp2 = re.compile("SNORT3_BUILD=(\S+)")
                for line in myfile.split("\n"):
                    regex_result = re.match(rexp, line)
                    if regex_result:
                        snort_build_path = regex_result.group(1)
                        break
                for line in myfile.split("\n"):
                    regex_result = re.match(rexp1, line)
                    if regex_result:
                        snort_ver_comp = regex_result.group(1)
                        break
                for line in myfile.split("\n"):
                    regex_result = re.match(rexp2, line)
                    if regex_result:
                        snort_bld_comp = regex_result.group(1)
                        break
            except Exception as e:
                self.logger.info ('Could not fetch the URL for snort binary')
                self.logger.info ("Execption - {}".format(str(e)))
                self.logger.debug("URL is = {}".format(cp_url))

            # copy lib files to the directory for debugging
            (snort_maj, snort_bld) = snort_ver.split('-')
            for fName in [snort3_unstripped]:
                url = wget_master + "/netboot/" + snort_build_path + "/" +\
                    "snort_install" + "/x86_64/" + abs_model + "/" + daq + "/" + "snort_install_unstripped/" +\
                    "bin/" + fName
                if not self.dnld_file(url, fName):
                    if fName == "snort":
                        self.logger.info ("oops,I couldn't download Snort Binary, will exit here")
                        self.logger.info (("please check URL: %s if it is a valid link", url))
                        sys.exit(1)
                    else:
                        self.logger.info (("WARNING:downloading of file:%s failed ", url))

            if (int(abs_model) >= 75):
                for fName in liblog_files:
                    url = wget_master + "/" + ftd_path + "/" + ftd_ver + "-" + str(
                        ftd_build) + \
                        "/unstripped-binaries/x86_64/lib64/" + fName
                    self.dnld_file(url, fName)

                for fName in snort3_daq_lib:
                    url = wget_master + "/" + path + "/" + fmc_version + "-" + str(
                        fmc_build) + \
                        "/unstripped-binaries/SSP/x86_64/lib/daq3/" + fName
                    self.dnld_file(url, fName)
            else:
                self.logger.info ("%s  Platform Model currently not supported" % abs_model)
                return False

            ## There is a change in folder strucure from 7.10 for dynamic-pluggins
            #
            #https://64.103.219.33/netboot/ims/Development/7.0.0-1510/dynamic
            # -plugins/7.0.0-1510.unstripped/rna/7.0.0-1510.unstripped-wrlinux-os-64bit-daq13/lib64/snort/

            #https://64.103.219.33/netboot/ims/Development/7.1.0-1536/dynamic
            # -plugins/7.1.0-1536.unstripped/rna/release/7.1.0-1536-wrlinux-os-64bit-daq14/lib64/snort/
            #
            rna_path = ".unstripped/rna/" if float(fmc_version[:3]) < \
                                            7.1 else ".unstripped/rna/release/"
            self.logger.debug("RNA path for this FMC version is - {}".format(rna_path))
            # Fetch Snort3 plugin libs
            for fName in snort3_plugin_libs:
                url = wget_master + "/" + path + "/" + fmc_version + "-" + fmc_build + "/" + \
                    "/dynamic-plugins/" + fmc_version + "-" + str(
                    fmc_build) + \
                    rna_path + fmc_version + "-" + fmc_build +\
                    ".unstripped-" + linux_model + "-" + daq + "/lib64/snort/" + fName
                self.dnld_file(url, fName)
            # Include lib64, platfrom related So's also

            for fName in snort3_lib64_so:
                url = wget_master + "/" + path + "/" + fmc_version + "-" + fmc_build + "/" + \
                    "/dynamic-plugins/" + fmc_version + "-" + str(
                    fmc_build) + \
                    rna_path + fmc_version + "-" + fmc_build + \
                    ".unstripped-" + linux_model + "-" + daq + "/lib64/" + fName
                # print url
                self.dnld_file(url, fName)

        if no_cleanup:
            self.store_devel_dir(directory)
        return True
