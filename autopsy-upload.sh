#!/bin/bash
#
# Upload a core file to autopsy and provide the key
#
# Usage:
# autopsy-upload.sh [-u uuid] <core-file>
#
#
#
set -e

#
# Various autopsy URLs used for uploading core files
#
readonly autopsy_url='https://autopsy.cisco.com:8443'
#readonly autopsy_url='http://localhost:5000'
readonly checksession_url="${autopsy_url}/checksession"
readonly testfile_url="${autopsy_url}/testfilename"
readonly upload_url="${autopsy_url}/upload"
readonly unzip_url="${autopsy_url}/unzip"
readonly build_url="${autopsy_url}/build"
readonly dump_url="${autopsy_url}/dump"
readonly loadkey_url="${autopsy_url}/loadkey"

#
# The key used by autopsy to identify a session.  This can be passed
# in, if one already exists.  If not, a new one will be generated.
#
loaded_uuid=
uuid=

function exit_fn ()
{
    rm -f "${COOKIE_FILE}" "${OFILE}"

    printf "\n"
    printf '=%.0s' {1..60}
    printf "\nUploaded:\n"
    for core in ${ALL_CORES}; do
        printf "\t%s\n" ${core}
    done
    printf '=%.0s' {1..60}
    printf "\nTo %s\n" ${autopsy_url}
    printf "Core[s] can be viewed by loading the following key:\n\n%s\n\n" ${uuid}
}

trap exit_fn EXIT

function cleanup_fn ()
{
    rm -f "${COOKIE_FILE}" "${OFILE}"
    printf "\nError...\n"
}
trap cleanup_fn SIGSEGV SIGINT SIGTERM

#
# 
#
COOKIE_FILE=$(mktemp autopsy_cookies.XXXXX || exit 1)
OFILE=$(mktemp autopsy_upload_res.XXXXX || exit 1)

readonly BOILER_ARGS="-k --cookie-jar ${COOKIE_FILE} --cookie ${COOKIE_FILE} -o ${OFILE} -f"

function getsession ()
{
    curl ${BOILER_ARGS} ${autopsy_url} -s

    #<span id="uuid">d816789c-a08f-4e98-b3c9-47834fec5778</span>
    uuid=$(sed -n 's|.*<span id="uuid">\(.*\)</span>|\1|p' "${OFILE}")
    printf "Session is [%s]\n" "${uuid}"
}

function loadkey ()
{
    curl ${BOILER_ARGS} ${loadkey_url} -d "loadkey=${loaded_uuid}" -X POST
    uuid=${loaded_uuid}
}

function checksession ()
{
    echo > "${OFILE}"
    curl ${BOILER_ARGS} -d "uuid=${uuid}" -X POST ${checksession_url} -s
    if grep -q 'missing session' "${OFILE}"; then
        printf "Can't find session[%s]\n" ${uuid}
        getsession
    else
        printf "Found existing session[%s]\n" ${uuid}
    fi
}

function upload_to_autopsy ()
{
    # testfilename
    echo > "${OFILE}"
    curl ${BOILER_ARGS} -d "filename=${CORE_FILENAME}" -X POST ${testfile_url} -s

    # upload
    printf "Uploading core file...\n"
    echo > "${OFILE}"
    curl ${BOILER_ARGS} -F "file=@${CORE_FILE};filename=${CORE_FILENAME}" -X POST ${upload_url}

    # unzipfile
    printf "Unzipping file....\n"
    echo > "${OFILE}"
    curl ${BOILER_ARGS} -X POST ${unzip_url}

    # buildfile
    printf "Building artifacts...\n"
    echo > "${OFILE}"
    curl ${BOILER_ARGS} -F "duplicate=true" -F "platform=lina" -F "exec=" -F "buildtype=release" -F "version=" -X POST ${build_url}

    if grep -q 'filesize' "${OFILE}"; then
        printf "Core file [%s] uploaded to: %s\n" ${CORE_FILE} ${autopsy_url}
        #printf "You can view it by loading the following key: %s\n" ${uuid}
    else
        printf "Build for core file[%s] failed.  Reason:\n" ${CORE_FILE}
        cat "${OFILE}"
        exit 1
    fi
}

function main ()
{

    if [[ $# -lt 1 ]]; then
        printf "Usage: %s [-u uuid] <core-file> [<core-file2> <core-file3> ...]\n" "${0}"
        exit 1
    fi

    while getopts "u:" opt; do
        case "${opt}" in
            u)
                loaded_uuid="${OPTARG}"
                ;;
            \?)
                echo "Invalid option to -u" >&2
                exit 1
                ;;
        esac
    done
    shift $((OPTIND-1))

    ALL_CORES=${*}
    for core in ${ALL_CORES}; do
        if [[ ! -e ${core} ]]; then
            printf "Can't find core file %s\n" "${core}"
            exit 1
        fi
    done


    getsession
    if [[ ! -z "${loaded_uuid}" ]]; then
        loadkey
    fi

    checksession
    
    for core in ${ALL_CORES}; do
        CORE_FILE=${core}
        CORE_FILENAME=$(basename "${core}")
        printf "Uploading core file[%s] to %s\n" "${core}" ${autopsy_url}
        upload_to_autopsy
    done
}

main "$@"
