"use strict";
var uuid = document.getElementById("uuid");
var uuids = document.getElementById("uuids");
var previous_button = document.getElementById("previous-button");
var load_key = document.getElementById("load-key");
var load_button = document.getElementById("load-button");
var generate_button = document.getElementById("generate-button");
var link_url = document.getElementById("link-url");
var link_username = document.getElementById("link-username");
var link_password = document.getElementById("link-password");
var link_button = document.getElementById("link-button");
var shared_core = document.getElementById("shared-core");
var shared_button = document.getElementById("shared-button");
var file_server = document.getElementById("file-server");
var file_path = document.getElementById("file-path");
var file_username = document.getElementById("file-username");
var file_password = document.getElementById("file-password");
var file_button = document.getElementById("file-button");
var browse = document.getElementById("browse");
var input = document.getElementById("file-input");
var version = document.getElementById("version-input");
var snort_version = document.getElementById("snort-version-input");
var fmc_version = document.getElementById("fmc-version-input");
var ftd_version = document.getElementById("ftd-version-input");
var ftd_model = document.getElementById("ftd-model-input");
var platform = document.getElementById("platform");
var exec = document.getElementById("exec");
var buildtype_mio = document.getElementById("buildtype-mio");
var buildtype_fxp = document.getElementById("buildtype-fxp");
var file_picker = document.getElementById("file-picker");
var file_name = document.getElementById("file-name");
var upload_button = document.getElementById("upload-button");
var downloaded = document.getElementById("downloaded");
var progress = document.getElementById("progress");
var cores = document.getElementById("cores");
var divider = document.getElementById("divider");
var gen_report = document.getElementById("gen-report");
var backtrace = document.getElementById("backtrace");
var siginfo = document.getElementById("siginfo");
var decode = document.getElementById("decode");
var clear_output = document.getElementById("clear-output");
var abort_gdb = document.getElementById("abort-gdb");
var export_file = document.getElementById("export-file");
var command_input = document.getElementById("command-input");
var autocomplete = document.getElementById("autocomplete");
var output_text = document.getElementById("output-text");
var command_search = document.getElementById("command-search");
var editor_reset = document.getElementById("editor-reset");
var editor_diff = document.getElementById("editor-diff");
var timeout = document.getElementById("timeout");
var command_list = document.getElementById("command-list");
var editor_program = document.getElementById("editor-program");
var console_tab = document.getElementById('console');
var crash_info = document.getElementById('crash-info-tab');
var crash_info_text = document.getElementById('crash-info-text');
var exists_new_core = document.getElementById('exists-new-core');
var exists_old_core = document.getElementById('exists-old-core');
var exists_uuid = document.getElementById('exists-uuid');
var load_old = document.getElementById('load-old');
var upload_new = document.getElementById('upload-new');
var malloc_table;
var malloc_unavailable_alert = document.getElementById('malloc-unavailable-alert');
var malloc_loading_alert = document.getElementById('malloc-loading-alert');

var uuid_value = uuid.innerHTML;
var checked_uuid = null;
var link_bad_url = false;
var link_bad_credentials = false;
var file_bad_server = false;
var file_bad_path = false;
var file_bad_credentials = false;
var filename;
var coredump_list;
var checked = null;
var send_update = false;
var cursor_loc = null;
var scroll_loc = null;
// When adding a new command, add the new command to this list
var commands = ["asacommands", "checkibuf", "checkoccamframe", "dispak47anonymouspools", "dispak47vols", "dispallactiveawarectx", "dispallactiveuctectx", "dispallactiveucteoutway", "dispallak47instance", "dispallattachedthreads", "dispallawarectx", "dispallpoolsinak47instance", "dispallthreads", "dispalluctectx", "dispallucteoutway", "dispasastate", "dispasathread", "dispawareurls", "dispbacktraces", "dispblockinfo", "dispcacheinfo", "dispclhash", "dispcrashthread", "dispdpthreads", "dispfiberinfo", "dispfiberstacks", "dispfiberstacksbybp", "dispfiberstats", "dispfreedlocalblocksnext", "dispgdbthreadinfo", "displuastack", "displuastackbyl", "displuastackbylreverse", "dispmeminfo", "dispmemregion", "dispoccamframe", "dispramfsdirtree", "dispsiginfo", "dispstackforthread", "dispstackfromrbp", "dispthreads", "dispthreadstacks", "disptypes", "dispunmangleurl", "dispurls", "findString", "findmallochdr", "findmallocleak", "findoccamframes", "generatereport", "searchMem", "searchMemAll", "search_mem", "showak47info", "showak47instances", "showaspdrop", "showblockclasses", "showblocks", "showblocksold", "showcounters", "showconsolemessage", "showsnortstatistics", "test_btree_iter", "unescapestring", "verifyoccaminak47instance", "verifystacks", "walkIntervals", "walkblockchain", "webvpn_print_block_failures"];
// If new command has required argument, add the key-value pair here
var options = {"checkibuf": "&lt;address&gt;", "checkoccamframe": "&lt;frame&gt;", "dispallthreads": "[&lt;verbosity&gt;]", "dispasathread": "&lt;thread name&gt; [&lt;verbosity&gt;]", "dispcrashthread": "[&lt;verbosity&gt;] [&lt;linux thread id&gt;]", "dispdpthreads": "[&lt;verbosity&gt;]", "dispgdbthreadinfo": "[&lt;verbosity&gt;]", "displuastack": "&lt;stack&gt; &lt;depth&gt;", "displuastackbyl": "&lt;L&gt; &lt;depth&gt;", "displuastackbylreverse": "&lt;L&gt; &lt;depth&gt;", "dispmemregion": "&lt;address&gt; &lt;length&gt;", "dispoccamframe": "&lt;address&gt;", "dispramfsdirtree": "&lt;ramfs node address&gt;", "dispstackforthread": "[&lt;threadname&gt;|&lt;thread address&gt;]", "dispstackfromrbp": "&lt;rbp&gt;", "dispthreads": "[&lt;verbosity&gt;]", "disptypes": "&lt;type&gt; &lt;address&gt;", "dispunmangleurl": "&lt;mangled URL&gt;", "findString": "&lt;string&gt;", "searchMem": "&lt;address&gt; &lt;length&gt; &lt;pattern&gt;", "searchMemAll": "&lt;pattern&gt;", "search_mem": "&lt;address&gt; &lt;length&gt; &lt;pattern&gt;", "unescapestring": "&lt;string&gt;", "verifyoccaminak47instance": "&lt;ak47 instance name&gt;"};
var loading = false;

var element_loading = false;

var enter_just_pressed = false;
var current_commands = [];
var autocomplete_text;
var currently_selected = null;

var protocols = ["http://", "tftp://", "ftp://"];
var current_protocols = [];

// xterm vars
const term = new Terminal({
    scrollback: 100000,
    cursorStyle: 'block',
    cursorBlink: false,
    disableStdin: true,
});
const fitAddon = new FitAddon.FitAddon();
var console_input = "";
term.loadAddon(fitAddon);
term.open(document.getElementById('console-container'));
fitAddon.fit();
term.write('\x1b[1;32mgdb $ ');
fitAddon.fit();

// Command history
var command_history = new Array();
var history_pos = -1; // -1 is the default, when Up arrow key is pressed, increment, Down arrow key, decrement
var exportFile = ""; //variable to store contents of console to provide export feature
var cursor = 0;

// Initialize the malloc table display
$(document).ready(function () {
    malloc_table = $('#malloc-table').DataTable({
        "ordering": true, // enable sorting
        "scrollResize": true,
        "scrollY": 100,
        "scrollCollapse": true,
        "paging": false,
        "sScrollX" : "100%"
    }).columns.adjust().draw();
    $('#malloc-table').parents('div.dataTables_wrapper').first().hide();
});

var code_mirror = CodeMirror(editor_program, {extraKeys: {"Cmd-F": "findPersistent", "Ctrl-F": "findPersistent"}, mode: {name: "python", version: 2}, indentUnit: 4, lineWrapping: true, lineNumbers: true, matchBrackets: true, scrollbarStyle: "simple", styleActiveLine: true});

code_mirror.addKeyMap({"Tab": function(code_mirror) {
        if (code_mirror.somethingSelected()) {
            code_mirror.indentSelection("add");
            return;
        }
        code_mirror.execCommand("insertSoftTab");
    },
    "Shift-Tab": function(code_mirror) {
        code_mirror.indentSelection("subtract");
    }
});

window.addEventListener("resize", function() {
    code_mirror.setSize(null, editor_program.clientHeight);
    malloc_table.columns.adjust().draw();
});

function updateLocalStorage(uuid, coredumps) {
    var core_history_string = localStorage.getItem("history");
    var core_order_string = localStorage.getItem("order");
    if (core_history_string === null) {
        core_history_string = "{}";
    }
    if (core_order_string === null) {
        core_order_string = "[]";
    }
    var core_history = JSON.parse(core_history_string);
    var core_order = JSON.parse(core_order_string);
    core_history[uuid] = coredumps;
    var prev_index = core_order.indexOf(uuid);
    if (prev_index !== -1) {
        core_order.splice(prev_index, 1);
    }
    core_order.unshift(uuid);
    var removed = core_order.splice(16);
    for (var i = 0; i < removed.length; i++) {
        delete core_history[removed[i]];
    }
    localStorage.setItem("history", JSON.stringify(core_history));
    localStorage.setItem("order", JSON.stringify(core_order));
}

input.onchange = function() {
    filename = this.value;
    if (filename === "") {
        file_name.innerHTML = "Choose file…";
        upload_button.className = "btn btn-primary";
        upload_button.disabled = true;
        upload_button.innerHTML = "Upload";
    }
    else {
        var index = filename.indexOf("\\", 3);
        if (index >= 0) {
            filename = filename.substring(index + 1);
        }
        file_name.innerHTML = filename;
        upload_button.className = "btn btn-primary";
        upload_button.disabled = false;
        upload_button.innerHTML = "Upload";
    }
};

function humanFileSize(size) {
    if (size === 0) {
        return "0 bytes";
    }
    var i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + " " + ["bytes", "KB", "MB", "GB", "TB"][i];
}

function date(timestamp) {
    var d = new Date(timestamp);
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    return months[d.getMonth()] + " " + d.getDate() + ", " + hours + ":" + minutes + " " + ampm;
}

function loadCoredumps(coredumps) {
    for (var i = 0; i < coredumps.length; i++) {
        var s = "<div class=\"coredump-box not-clicked\" id=\"" + coredumps[i][1] + "\"><div class=\"coredump-inner\"><p class=\"corerow corename\">" + coredumps[i][1] + "</p><p class=\"corerow\"><span class=\"coresize\">" + humanFileSize(coredumps[i][2]) + "</span><span class=\"coredate\">" + date(coredumps[i][3]) + "</span></p></div><div class=\"delete-box\"><p class=\"delete-icon\">×</p></div></div>";
        var corediv = document.createElement("div");
        corediv.classList.add("coredump-noanim");
        corediv.innerHTML = s;
        cores.insertBefore(corediv, cores.firstChild);
    }
    addCoredumpListeners();
    coredump_list = coredumps.map(function(coredump) {
        return coredump[1];
    }).reverse();
    updateLocalStorage(uuid_value, coredump_list);
}

function addCoredumpListeners() {
    for (var i = 0; i < cores.childElementCount; i++) {
        (function() {
            var coredump_box = cores.children[i].firstChild;
            var delete_icon = coredump_box.lastChild.firstChild;
            delete_icon.addEventListener("click", function(evt) {
                deleteCoredump(coredump_box.id);
                evt.stopImmediatePropagation();
            });
            coredump_box.addEventListener("click", function() {
                check(coredump_box.id);
            });
        })();
    }
}

function disableCommandButtons(setting) {
    gen_report.disabled = setting;
    backtrace.disabled = setting;
    siginfo.disabled = setting;
    decode.disabled = setting;
    command_input.disabled = setting;
    term.setOption("disableStdin", setting);
    term.setOption("cursorBlink", !setting);
}

function deleteCoredump(id) {
    var id_box = document.getElementById(id).parentElement;
    id_box.addEventListener("animationend", function() {
        id_box.remove();
        if (checked === id) {
            checked = null;
            disableCommandButtons(true);
        }
    });
    id_box.className = "coredump-leave";
    var delete_index = coredump_list.indexOf(id);
    if (delete_index !== -1) {
        coredump_list.splice(delete_index, 1);
    }
    updateLocalStorage(uuid_value, coredump_list);
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("coredump", id);
    xhr.open("POST", "/delete", true);
    xhr.send(fd);
}

function check(id) {
    var id_box = document.getElementById(id);
    if (checked !== id) {
        id_box.classList.remove("not-clicked");
        id_box.classList.add("clicked");
        if (checked !== null) {
            var checked_box = document.getElementById(checked);
            checked_box.classList.remove("clicked");
            checked_box.classList.add("not-clicked");
        }
        command_input.value = "";
        output_text.innerHTML = "";
        console_input = "";
        term.clear();
        term.write('\x1b[2K\r');
        term.write('\x1b[1;32mgdb $ ');
        command_history = new Array();
        history_pos = -1;
        checked = id;
        //below code of the function hides lina specific UI for non-lina core files.
        siginfo.style.visibility = 'visible';
        decode.style.visibility = 'visible';
        crash_info.style.visibility = 'visible';
        document.getElementById("editor-container").style.visibility = 'visible';
        document.getElementById("editor-commands").style.visibility = 'visible';
        document.getElementById("no-python").innerHTML = ""
        var xhr = new XMLHttpRequest();
        var fd = new FormData();
        fd.append("required", "platform");
        fd.append("uuid", uuid_value);
        fd.append("core", id);
        xhr.open("POST", "/getinfo", true);
        xhr.responseType = "text";
        xhr.addEventListener("readystatechange", function() {
            if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                switch (xhr.responseText) {
                    case "lina":
                        if (document.getElementById("crash-info-general-tab").classList.contains("active")) {
                            getCrashInfo();
                        }
                        malloc_table.clear().draw();
                        malloc_unavailable_alert.style.setProperty("display", "none");
                        $('#malloc-table').parents('div.dataTables_wrapper').first().hide();
                        if (document.getElementById("crash-info-malloc-tab").classList.contains("active")) {
                            getMallocDump();
                        }
                        break;
                    case "Python not supported.":
                        document.getElementById("editor-container").style.visibility = 'hidden';
                        document.getElementById("editor-commands").style.visibility = 'hidden';
                        document.getElementById("no-python").innerHTML = "This feature is not available in GDB version used for this corefile.";
                    default:
                        siginfo.style.visibility = 'hidden';
                        decode.style.visibility = 'hidden';
                        crash_info.style.visibility = 'hidden';
                        break;
                }
            }
        });
        xhr.send(fd);
        disableCommandButtons(false);
    }
    else {
        id_box.classList.remove("clicked");
        id_box.classList.add("not-clicked");
        checked = null;
        crash_info_text.innerHTML = "";
        malloc_table.clear().draw();
        malloc_unavailable_alert.style.setProperty("display", "none");
        $('#malloc-table').parents('div.dataTables_wrapper').first().hide();
        disableCommandButtons(true);
    }
}

function addUUIDListeners() {
    for (var i = 0; i < uuids.childElementCount; i++) {
        (function() {
            var uuid_box = uuids.children[i];
            var delete_icon = uuid_box.lastChild.firstChild;
            delete_icon.addEventListener("click", function(evt) {
                deleteUUID(uuid_box.id);
                evt.stopImmediatePropagation();
            });
            uuid_box.addEventListener("click", function() {
                checkUUID(uuid_box.id);
            });
        })();
    }
}

function deleteUUID(id) {
    $("[data-toggle='popover']").popover("dispose");
    document.getElementById(id).remove();
    if (checked_uuid === id) {
        checked_uuid = null;
        previous_button.disabled = true;
    }
    $("[data-toggle='popover']").popover();
    var core_history = JSON.parse(localStorage.getItem("history"));
    var core_order = JSON.parse(localStorage.getItem("order"));
    delete core_history[id];
    var delete_index = core_order.indexOf(id);
    if (delete_index !== -1) {
        core_order.splice(delete_index, 1);
    }
    if (core_order.length <= 1) {
        uuids.innerHTML = "<p class=\"uuid-none\">No previous keys.</p>";
    }
    localStorage.setItem("history", JSON.stringify(core_history));
    localStorage.setItem("order", JSON.stringify(core_order));
}

function checkUUID(id) {
    var id_box = document.getElementById(id);
    if (checked_uuid !== id) {
        id_box.classList.remove("not-clicked");
        id_box.classList.add("clicked");
        if (checked_uuid !== null) {
            var checked_box = document.getElementById(checked_uuid);
            checked_box.classList.remove("clicked");
            checked_box.classList.add("not-clicked");
        }
        checked_uuid = id;
        previous_button.disabled = false;
    }
    else {
        id_box.classList.remove("clicked");
        id_box.classList.add("not-clicked");
        checked_uuid = null;
        previous_button.disabled = true;
    }
}

$("#previous-modal").on("show.bs.modal", function() {
    previous_button.disabled = true;
    var core_history_string = localStorage.getItem("history");
    var core_order_string = localStorage.getItem("order");
    var core_history = JSON.parse(core_history_string);
    var core_order = JSON.parse(core_order_string);
    if (core_history_string === null || core_order.length <= 1) {
        uuids.innerHTML = "<p class=\"uuid-none\">No previous keys.</p>";
    }
    else {
        var uuid_list = "";
        for (var i = 1; i < core_order.length; i++) {
            var uuid_string = core_order[i];
            var content_string = "";
            if (core_history[uuid_string].length === 0) {
                content_string = "<p class='cores-none'>No core dumps</p>";
            }
            else {
                for (var j = 0; j < core_history[uuid_string].length; j++) {
                    content_string += "<p>" + core_history[uuid_string][j] + "</p>";
                }
            }
            uuid_list += "<div class=\"uuid-box not-clicked\" id=\"" + uuid_string + "\" data-toggle=\"popover\" data-animation=\"false\" data-content=\"" + content_string + "\" data-html=\"true\" data-trigger=\"hover\"><div class=\"uuid-inner\"><i class=\"fa fa-key\" aria-hidden=\"true\"></i><span class=\"uuid-item\">" + uuid_string + "</span></div><div class=\"delete-box delete-uuid\"><p class=\"delete-icon\">×</p></div></div>";
        }
        uuids.innerHTML = uuid_list;
        addUUIDListeners();
    }
});

$("#previous-modal").on("shown.bs.modal", function() {
    $("[data-toggle='popover']").popover();
});

$("#previous-modal").on("hidden.bs.modal", function() {
    $("[data-toggle='popover']").popover("dispose");
    previous_button.innerHTML = "Load";
});

previous_button.addEventListener("click", function() {
    previous_button.disabled = true;
    previous_button.innerHTML = "<i class=\"fa fa-circle-o-notch fa-spin\"></i> Loading…";
    updateSource(false);
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("loadkey", checked_uuid);
    xhr.open("POST", "/loadkey", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            $("#previous-modal").modal("hide");
            uuid.innerHTML = xhr.response.uuid;
            uuid_value = xhr.response.uuid;
            reset();
            loadCoredumps(xhr.response.coredumps);
            loadPython();
            timeout.value = xhr.response.timeout;
        }
    });
    xhr.send(fd);
});

$("#load-modal").on("shown.bs.modal", function() {
    $("#load-key").focus();
});

$("#load-modal").on("hidden.bs.modal", function() {
    load_button.innerHTML = "Load";
});

$("#generate-modal").on("hidden.bs.modal", function() {
    generate_button.innerHTML = "Generate";
});

$("#shared-modal").on("shown.bs.modal", function() {
    $("shared-core").focus();
});

$("#shared-modal").on("hidden.bs.modal", function() {
    if (shared_button.classList.contains("btn-primary")) {
        shared_button.innerHTML = "Submit";
        if (shared_core.value !== "") {
            shared_button.disabled = false;
        }
    }
});

$("#link-modal").on("shown.bs.modal", function() {
    $("#link-url").focus();
});

$("#link-modal").on("hidden.bs.modal", function() {
    if (link_button.classList.contains("btn-primary")) {
        link_button.innerHTML = "Submit";
        if (link_url.value !== "") {
            link_button.disabled = false;
        }
    }
});

$("#file-modal").on("shown.bs.modal", function() {
    $("#file-server").focus();
});

$("#file-modal").on("hidden.bs.modal", function() {
    if (file_button.classList.contains("btn-primary")) {
        file_button.innerHTML = "Submit";
    }
});

load_key.addEventListener("input", function() {
    if (load_key.value === "") {
        load_key.className = "form-control";
        load_button.disabled = true;
    }
    else {
        var re = /[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i;
        if (re.test(load_key.value)) {
            var xhr = new XMLHttpRequest();
            var fd = new FormData();
            fd.append("testkey", load_key.value.toLowerCase());
            xhr.open("POST", "/testkey", true);
            xhr.responseType = "text";
            xhr.addEventListener("readystatechange", function() {
                if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                    if (xhr.responseText === "yes") {
                        load_key.className = "form-control is-valid";
                        load_button.disabled = false;
                    }
                    else {
                        load_key.className = "form-control is-invalid";
                        load_button.disabled = true;
                    }
                }
            });
            xhr.send(fd);
        }
        else {
            load_key.className = "form-control is-invalid";
            load_button.disabled = true;
        }
    }
});

function resetFileUpload(error, message) {
    browse.innerHTML = "Browse";
    browse.className = "btn btn-primary nav-link browse-clickable";
    input.disabled = false;
    upload_button.innerHTML = message;
    if (error) {
        upload_button.className = "btn btn-danger";
    }
    else {
        upload_button.className = "btn btn-primary";
    }
    progress.style.transition = "opacity 1s, width 0.5s";
    progress.style.opacity = 0;
    //downloaded.innerHTML = "…or <a href=\"\" data-toggle=\"modal\" data-target=\"#link-modal\">submit link</a> or <a href=\"\" data-toggle=\"modal\" data-target=\"#file-modal\">SCP file</a>";
    downloaded.innerHTML = "";
}

function reset() {
    cores.innerHTML = "";
    load_key.value = "";
    load_key.className = "form-control";
    load_button.disabled = true;
    generate_button.disabled = false;
    link_url.value = "";
    link_url.className = "form-control";
    link_username.value = "";
    link_username.className = "form-control";
    link_password.value = "";
    link_password.className = "form-control";
    link_button.disabled = true;
    link_button.className = "btn btn-primary";
    link_button.innerHTML = "Submit";
    link_bad_url = false;
    link_bad_credentials = false;
    shared_button.disabled = true;
    shared_button.className = "btn btn-primary";
    shared_button.innerHTML = "Submit";
    shared_core.value = "";
    file_server.value = "";
    file_server.className = "form-control";
    file_path.value = "";
    file_path.className = "form-control";
    file_username.value = "";
    file_username.className = "form-control";
    file_password.value = "";
    file_password.className= "form-control";
    file_button.disabled = true;
    file_button.className = "btn btn-primary";
    file_button.innerHTML = "Submit";
    file_bad_server = false;
    file_bad_path = false;
    file_bad_credentials = false;
    output_text.innerHTML = "";
    resetFileUpload(false, "Upload");
    input.value = "";
    file_name.innerHTML = "Choose file…";
    upload_button.disabled = true;
    checked_uuid = null;
    checked = null;
    command_input.value = "";
    loading = false;
    disableCommandButtons(true);
    abort_gdb.disabled = true;
    command_search.value = "";
    command_list.innerHTML = "";
    code_mirror.clearHistory();
    cursor_loc = null;
    scroll_loc = null;
    console_input = "";
    term.clear();
    term.write('\x1b[2K\r');
    term.write('\x1b[1;32mgdb $ ');
    command_history = new Array();
    history_pos = -1;
    crash_info_text.innerHTML = "";
    malloc_table.clear().draw();
    malloc_unavailable_alert.style.setProperty("display", "none");
    $('#malloc-table').parents('div.dataTables_wrapper').first().hide();
}

load_button.addEventListener("click", function() {
    load_button.disabled = true;
    load_button.innerHTML = "<i class=\"fa fa-circle-o-notch fa-spin\"></i> Loading…";
    updateSource(false);
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("loadkey", load_key.value.toLowerCase());
    xhr.open("POST", "/loadkey", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            $("#load-modal").modal("hide");
            uuid.innerHTML = xhr.response.uuid;
            uuid_value = xhr.response.uuid;
            reset();
            loadCoredumps(xhr.response.coredumps);
            loadPython();
            timeout.value = xhr.response.timeout;
        }
    });
    xhr.send(fd);
});

generate_button.addEventListener("click", function() {
    generate_button.disabled = true;
    generate_button.innerHTML = "<i class=\"fa fa-circle-o-notch fa-spin\"></i> Generating…";
    updateSource(false);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/generatekey", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            $("#generate-modal").modal("hide");
            uuid.innerHTML = xhr.responseText;
            uuid_value = xhr.responseText;
            reset();
            coredump_list = [];
            updateLocalStorage(uuid_value, coredump_list);
            loadPython();
            timeout.value = 1;
        }
    });
    xhr.send();
});

link_url.addEventListener("input", function(event) {
    if (!event.inputType.startsWith("delete") && link_url.value !== "") {
        // Autocomplete
        current_protocols = [];
        for (var i = 0; i < protocols.length; i++) {
            if (protocols[i].startsWith(link_url.value)) {
                current_protocols.push(protocols[i]);
            }
        }
        if (current_protocols.length == 1) {
            link_url.value = current_protocols[0];
            link_button.disabled = false;
        }
    }

    if (link_url.value === "") {
        link_button.disabled = true;
    }
    else if (link_url.value.startsWith("tftp")) {
        link_username.value = "";
        link_password.value = "";
        link_username.disabled = true;
        link_password.disabled = true;
    }
    else {
        link_username.disabled = false;
        link_password.disabled = false;
    }

    if (link_bad_credentials) {
        link_bad_credentials = false;
        link_button.className = "btn btn-primary";
        link_button.innerHTML = "Submit";
        link_username.className = "form-control";
        link_password.className = "form-control";
    }
    else {
        link_button.disabled = false;
    }

    if (link_url.validity.patternMismatch) {
        link_button.disabled = true;
        link_url.className = "form-control is-invalid";
    }
    else {
        link_button.disabled = false;
        link_url.className = "form-control";
    }

    if (link_bad_url) {
        link_button.className = "btn btn-primary";
        link_button.innerHTML = "Submit";
        link_url.className = "form-control";
        link_bad_url = false;
    }
});

link_password.addEventListener("input", function() {
    if (link_bad_credentials) {
        if (link_url.value === "") {
            link_button.disabled = true;
        }
        else if (!link_bad_url) {
            link_button.disabled = false;
        }
        link_button.className = "btn btn-primary";
        link_button.innerHTML = "Submit";
        link_username.className = "form-control";
        link_password.className = "form-control";
        link_bad_credentials = false;
    }
});

shared_core.addEventListener("input", function() {
    if (shared_core.value !== "") {
        shared_button.disabled = false;
    }
    else {
        shared_button.disabled = true;
    }
    shared_button.className = "btn btn-primary";
    shared_button.innerHTML = "Submit";
});

file_server.addEventListener("input", function() {
    if (file_server.value === "" || file_path.value === "") {
        file_button.disabled = true;
    }
    else if (!file_bad_path && !file_bad_credentials) {
        file_button.disabled = false;
    }
    if (file_bad_server) {
        file_button.className = "btn btn-primary";
        file_button.innerHTML = "Submit";
        file_server.className = "form-control";
        file_bad_server = false;
    }
});

file_path.addEventListener("input", function() {
    if (file_server.value === "" || file_path.value === "") {
        file_button.disabled = true;
    }
    else if (!file_bad_server && !file_bad_credentials) {
        file_button.disabled = false;
    }
    if (file_bad_path) {
        file_button.className = "btn btn-primary";
        file_button.innerHTML = "Submit";
        file_path.className = "form-control";
        file_bad_path = false;
    }
});

file_username.addEventListener("input", function() {
    if (file_server.value === "" || file_path.value === "") {
        file_button.disabled = true;
    }
    else if (!file_bad_server && !file_bad_path) {
        file_button.disabled = false;
    }
    if (file_bad_credentials) {
        file_button.className = "btn btn-primary";
        file_button.innerHTML = "Submit";
        file_username.className = "form-control";
        file_password.className = "form-control";
        file_bad_credentials = false;
    }
});

file_password.addEventListener("input", function() {
    if (file_server.value === "" || file_path.value === "") {
        file_button.disabled = true;
    }
    else if (!file_bad_server && !file_bad_path) {
        file_button.disabled = false;
    }
    if (file_bad_credentials) {
        file_button.className = "btn btn-primary";
        file_button.innerHTML = "Submit";
        file_username.className = "form-control";
        file_password.className = "form-control";
        file_bad_credentials = false;
    }
});

function linkUpload(url, username, password, filename) {
    if (filename === "") {
        file_name.innerHTML = url;
    }
    else {
        file_name.innerHTML = filename;
    }
    input.disabled = true;
    browse.className = "btn btn-primary nav-link browse-unclickable";
    upload_button.className = "btn btn-primary";
    upload_button.disabled = true;
    downloaded.innerHTML = "";
    upload_button.innerHTML = "Uploading…";
    progress.style.transition = "opacity 0s, width 0s";
    progress.style.width = "100%";
    progress.style.opacity = 1;
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("url", url);
    fd.append("username", username);
    fd.append("password", password);
    xhr.open("POST", "/linkupload", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            switch (xhr.responseText) {
                case "invalid":
                    resetFileUpload(true, "Invalid File");
                    upload_button.disabled = true;
                    break;
                case "gz ok":
                    upload_button.innerHTML = "Unzipping…";
                    unzip();
                    break;
                case "core ok":
                    upload_button.innerHTML = "Building…";
                    build(false);
            }
        }
    });
    xhr.send(fd);
}

function loadOldSession(old_uuid) {
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("loadkey", old_uuid);
    xhr.open("POST", "/loadkey", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            $(".modal").modal("hide");
            uuid.innerHTML = xhr.response.uuid;
            uuid_value = xhr.response.uuid;
            reset();
            loadCoredumps(xhr.response.coredumps);
            loadPython();
            timeout.value = xhr.response.timeout;
        }
    });
    xhr.send(fd);
}

link_button.addEventListener("click", function() {
    link_button.disabled = true;
    link_button.innerHTML = "<i class=\"fa fa-circle-o-notch fa-spin\"></i> Submitting…";
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    var url = link_url.value;
    var username = link_username.value;
    var password = link_password.value;
    fd.append("url", url);
    fd.append("username", username);
    fd.append("password", password);
    xhr.open("POST", "/linktest", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            switch (xhr.response.message) {
                case "url":
                    link_button.className = "btn btn-danger";
                    link_button.innerHTML = "Invalid URL";
                    link_url.className = "form-control is-invalid";
                    link_bad_url = true;
                    break;
                case "duplicate":
                    link_button.className = "btn btn-danger";
                    link_button.innerHTML = "Duplicate File";
                    link_url.className = "form-control is-invalid";
                    link_bad_url = true;
                    break;
                case "exists diff session": {
                    let xhr = new XMLHttpRequest();
                    let fd = new FormData();
                    fd.append("coredump", url);
                    xhr.open("POST", "/getcoresession", true);
                    xhr.responseType = "json";
                    xhr.addEventListener("readystatechange", function() {
                        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                            $('.modal').modal('hide');
                            exists_core.innerHTML = xhr.response.filename;
                            exists_uuid.innerHTML = xhr.response.uuid;
                            $('#exists-modal').modal('show');

                            load_old.addEventListener("click", function() {
                                loadOldSession(xhr.response.uuid);
                            });
                            upload_new.addEventListener("click", function() {
                                $('#exists-modal').modal('hide');
                                linkUpload(url, username, password, xhr.response.filename);
                            });
                        }
                    });
                    xhr.send(fd);
                    break;
                }
                case "invalid":
                    link_button.className = "btn btn-danger";
                    link_button.innerHTML = "Invalid File";
                    link_url.className = "form-control is-invalid";
                    link_bad_url = true;
                    break;
                case "credentials":
                    link_button.className = "btn btn-danger";
                    link_button.innerHTML = "Invalid Credentials";
                    link_username.className = "form-control is-invalid";
                    link_password.className = "form-control is-invalid";
                    link_bad_credentials = true;
                    break;
                case "ok":
                    $("#link-modal").modal("hide");
                    linkUpload(url, username, password, xhr.response.filename);
            }
        }
    });
    xhr.send(fd);
});

function sharedUpload(coredump) {
    file_name.innerHTML = coredump;
    input.disabled = true;
    browse.className = "btn btn-primary nav-link browse-unclickable";
    upload_button.className = "btn btn-primary";
    upload_button.disabled = true;
    downloaded.innerHTML = "";
    upload_button.innerHTML = "Uploading…";
    progress.style.transition = "opacity 0s, width 0s";
    progress.style.width = "100%";
    progress.style.opacity = 1;
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("coredump", coredump);
    xhr.open("POST", "/sharedupload", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            switch (xhr.responseText) {
                case "timeout":
                    resetFileUpload(true, "Server Timeout");
                    upload_button.disabled = true;
                    break;
                case "invalid":
                    resetFileUpload(true, "Invalid File");
                    upload_button.disabled = true;
                    break;
                case "gz ok":
                    upload_button.innerHTML = "Unzipping…";
                    unzip();
                    break;
                case "core ok":
                    upload_button.innerHTML = "Building…";
                    build(false);
            }
        }
    });
    xhr.send(fd);
}

shared_button.addEventListener("click", function() {
    shared_button.disabled = true;
    shared_button.innerHTML = "<i class=\"fa fa-circle-o-notch fa-spin\"></i> Submitting…";
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    var coredump = shared_core.value;
    fd.append("coredump", coredump);
    xhr.open("POST", "/sharedtest", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            switch (xhr.responseText) {
                case "notfound":
                    shared_button.className = "btn btn-danger";
                    shared_button.innerHTML = "File Not Found";
                    break;
                case "duplicate":
                    shared_button.className = "btn btn-danger";
                    shared_button.innerHTML = "Duplicate";
                    break;
                case "exists diff session": {
                    let xhr = new XMLHttpRequest();
                    let fd = new FormData();
                    fd.append("coredump", coredump);
                    xhr.open("POST", "/getcoresession", true);
                    xhr.responseType = "json";
                    xhr.addEventListener("readystatechange", function() {
                        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                            $('.modal').modal('hide');
                            exists_core.innerHTML = xhr.response.filename;
                            exists_uuid.innerHTML = xhr.response.uuid;
                            $('#exists-modal').modal('show');

                            load_old.addEventListener("click", function() {
                                loadOldSession(xhr.response.uuid);
                            });
                            upload_new.addEventListener("click", function() {
                                $('#exists-modal').modal('hide');
                                sharedUpload(coredump);
                            });
                        }
                    });
                    xhr.send(fd);
                    break;
                }
                case "invalid":
                    shared_button.className = "btn btn-danger";
                    shared_button.innerHTML = "Invalid";
                    break;
                case "ok":
                    $("#shared-modal").modal("hide");
                    sharedUpload(coredump);
                    break;
            }
        }
    });
    xhr.send(fd);
});

function fileUpload(server, path, username, password, filename) {
    if (filename === "") {
        file_name.innerHTML = url;
    }
    else {
        file_name.innerHTML = filename;
    }
    input.disabled = true;
    browse.className = "btn btn-primary nav-link browse-unclickable";
    upload_button.className = "btn btn-primary";
    upload_button.disabled = true;
    downloaded.innerHTML = "";
    upload_button.innerHTML = "Uploading…";
    progress.style.transition = "opacity 0s, width 0s";
    progress.style.width = "100%";
    progress.style.opacity = 1;
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("server", server);
    fd.append("path", path);
    fd.append("username", username);
    fd.append("password", password);
    xhr.open("POST", "/fileupload", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            switch (xhr.responseText) {
                case "timeout":
                    resetFileUpload(true, "Server Timeout");
                    upload_button.disabled = true;
                    break;
                case "invalid":
                    resetFileUpload(true, "Invalid File");
                    upload_button.disabled = true;
                    break;
                case "gz ok":
                    upload_button.innerHTML = "Unzipping…";
                    unzip();
                    break;
                case "core ok":
                    upload_button.innerHTML = "Building…";
                    build(false);
            }
        }
    });
    xhr.send(fd);
}

file_button.addEventListener("click", function() {
    file_button.disabled = "true";
    file_button.innerHTML = "<i class=\"fa fa-circle-o-notch fa-spin\"></i> Submitting…";
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    var server = file_server.value;
    var path = file_path.value;
    var username = file_username.value;
    var password = file_password.value;
    fd.append("server", server);
    fd.append("path", path);
    fd.append("username", username);
    fd.append("password", password);
    xhr.open("POST", "/filetest", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            switch (xhr.response.message) {
                case "server":
                    file_button.className = "btn btn-danger";
                    file_button.innerHTML = "Invalid Server";
                    file_server.className = "form-control is-invalid";
                    file_bad_server = true;
                    break;
                case "timeout":
                    file_button.className = "btn btn-danger";
                    file_button.innerHTML = "Server Timeout";
                    file_server.className = "form-control is-invalid";
                    file_bad_server = true;
                    break;
                case "invalid":
                    file_button.className = "btn btn-danger";
                    file_button.innerHTML = "Invalid Path";
                    file_path.className = "form-control is-invalid";
                    file_bad_path = true;
                    break;
                case "duplicate":
                    file_button.className = "btn btn-danger";
                    file_button.innerHTML = "Duplicate File";
                    file_path.classname = "form-control is-invalid";
                    file_bad_path = true;
                    break;
                case "exists diff session": {
                    let xhr = new XMLHttpRequest();
                    let fd = new FormData();
                    fd.append("coredump", path);
                    xhr.open("POST", "/getcoresession", true);
                    xhr.responseType = "json";
                    xhr.addEventListener("readystatechange", function() {
                        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                            $('.modal').modal('hide');
                            exists_core.innerHTML = xhr.response.filename;
                            exists_uuid.innerHTML = xhr.response.uuid;
                            $('#exists-modal').modal('show');

                            load_old.addEventListener("click", function() {
                                loadOldSession(xhr.response.uuid);
                            });
                            upload_new.addEventListener("click", function() {
                                $("#exists-modal").modal("hide");
                                fileUpload(server, path, username, password, xhr.response.filename);
                            });
                        }
                    });
                    xhr.send(fd);
                    break;
                }
                case "credentials":
                    file_button.className = "btn btn-danger";
                    file_button.innerHTML = "Invalid Credentials";
                    file_username.className = "form-control is-invalid";
                    file_password.className = "form-control is-invalid";
                    file_bad_credentials = true;
                    break;
                case "ok":
                    $("#file-modal").modal("hide");
                    fileUpload(server, path, username, password, xhr.response.filename);
            }
        }
    });
    xhr.send(fd);
});

upload_button.addEventListener("click", function() {
    if (platform.value == 'snort') {
        if (snort_version.value.trim() === "") {
            alert("Snort version is required");
            return;
        }
        if (ftd_version.value.trim() === "") {
            alert("FTD version is required");
            return;
        }
        if (fmc_version.value.trim() === "") {
            alert("FMC version is required");
            return;
        }
        if (ftd_model.value.trim() === "") {
            alert("FTD model is required");
            return;
        }
    }
    input.disabled = true;
    upload_button.disabled = true;
    upload_button.innerHTML = "Uploading…";
    progress.style.transition = "opacity 0s, width 0s";
    progress.style.width = "0%";
    progress.style.opacity = 1;
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("filename", filename);
    xhr.open("POST", "/testfilename", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            switch (xhr.responseText) {
                case "duplicate":
                    resetFileUpload(true, "Duplicate File");
                    upload_button.disabled = true;
                    break;
                case "exists diff session": {
                    let xhr = new XMLHttpRequest();
                    let fd = new FormData();
                    fd.append("coredump", filename);
                    xhr.open("POST", "/getcoresession", true);
                    xhr.responseType = "json";
                    xhr.addEventListener("readystatechange", function() {
                        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                            $('.modal').modal('hide');
                            exists_core.innerHTML = xhr.response.filename;
                            exists_uuid.innerHTML = xhr.response.uuid;
                            $('#exists-modal').modal('show');

                            load_old.addEventListener("click", function() {
                                loadOldSession(xhr.response.uuid);
                            });
                            upload_new.addEventListener("click", function() {
                                $('#exists-modal').modal('hide');
                                browse.innerHTML = "Cancel";
                                progress.style.transition = "opacity 1s, width 0.5s";
                                upload();
                            });
                        }
                    });
                    xhr.send(fd);
                    break;
                }
                case "invalid":
                    resetFileUpload(true, "Invalid File");
                    upload_button.disabled = true;
                    break;
                case "ok":
                    browse.innerHTML = "Cancel";
                    progress.style.transition = "opacity 1s, width 0.5s";
                    upload();
            }
        }
    });
    xhr.send(fd);
});

function upload() {
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("file", input.files[0]);
    xhr.open("POST", "/upload", true);
    xhr.responseType = "text";
    xhr.upload.addEventListener("progress", function(evt) {
        if (evt.lengthComputable) {
            var percent = Math.round(evt.loaded / evt.total * 100 * 10) / 10;
            progress.style.width = percent + "%";
            downloaded.innerHTML = humanFileSize(evt.loaded) + " of " + humanFileSize(evt.total);
        }
    });
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            removeListeners();
            switch (xhr.responseText) {
                case "invalid":
                    resetFileUpload(true, "Invalid File");
                    upload_button.disabled = true;
                    break;
                case "gz ok":
                    browse.innerHTML = "Browse";
                    browse.className = "btn btn-primary nav-link browse-unclickable";
                    upload_button.innerHTML = "Unzipping…";
                    unzip();
                    break;
                case "core ok":
                    browse.innerHTML = "Browse";
                    browse.className = "btn btn-primary nav-link browse-unclickable";
                    upload_button.innerHTML = "Building…";
                    build(false);
            }
        }
    });
    function abort() {
        removeListeners();
        xhr.abort();
    }
    function cancel(evt) {
        removeListeners();
        xhr.abort();
        evt.preventDefault();
        resetFileUpload(false, "Upload");
        upload_button.disabled = false;
    }
    function removeListeners() {
        previous_button.removeEventListener("click", abort);
        load_button.removeEventListener("click", abort);
        generate_button.removeEventListener("click", abort);
        browse.removeEventListener("click", cancel);
    }
    previous_button.addEventListener("click", abort);
    load_button.addEventListener("click", abort);
    generate_button.addEventListener("click", abort);
    browse.addEventListener("click", cancel);
    xhr.send(fd);
}

function unzip() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/unzip", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            removeListeners();
            switch (xhr.responseText) {
                case "unzip failed":
                    resetFileUpload(true, "Unzip Failed");
                    upload_button.disabled = true;
                    break;
                case "ok":
                    upload_button.innerHTML = "Building…";
                    build(false);
            }
        }
    });
    function abort() {
        removeListeners();
        xhr.abort();
    }
    function removeListeners() {
        previous_button.removeEventListener("click", abort);
        load_button.removeEventListener("click", abort);
        generate_button.removeEventListener("click", abort);
    }
    previous_button.addEventListener("click", abort);
    load_button.addEventListener("click", abort);
    generate_button.addEventListener("click", abort);
    xhr.send();
}

function handle_duplicate_core(response) {
    $('.modal').modal('hide');
    exists_old_core.innerHTML = response.oldfilename;
    exists_new_core.innerHTML = response.newfilename;
    exists_uuid.innerHTML = response.uuid;
    $('#exists-modal').modal('show');

    load_old.addEventListener("click", function() {
        loadOldSession(response.uuid);
    });
    upload_new.addEventListener("click", function() {
        $('#exists-modal').modal('hide');
        build(true);
    });

}

// This is called after the upload function
// 	If duplicate = "true", skip the duplicate core check
// 	Else If duplicate = "false", check for duplicate core using hash
// (Used to circumvent checking when the user chooses to upload duplicate core in new session)
function build(duplicate) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/build", true);
    var fd = new FormData();
    fd.append("duplicate", String(duplicate));
    fd.append("version", version.value);
    fd.append("platform", platform.value);
    fd.append("exec", exec.value);
    if(platform.value === "mio")
    {
        fd.append("buildtype", buildtype_mio.value);
    }
    else{
        fd.append("buildtype", buildtype_fxp.value);
    }
    if (platform.value == "snort") {
        fd.append("fmc-version", fmc_version.value);
        fd.append("ftd-version", ftd_version.value);
        fd.append("ftd-model", ftd_model.value);
        fd.append("snort-version", snort_version.value);
    }
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            removeListeners();
            if (xhr.response.hasOwnProperty("report")) {
                resetFileUpload(true, "Build Failed");
                upload_button.disabled = true;
                if (xhr.response.report !== "build failed") {
                    output_text.innerHTML = xhr.response.report;
                }
            }
            else {
                if (xhr.response.output === 'hash duplicate') {
                    handle_duplicate_core(xhr.response);
                }
                else {
                    resetFileUpload(false, "Upload");
                    input.value = "";
                    file_name.innerHTML = "Choose file…";
                    upload_button.disabled = true;
                    var new_filename = xhr.response.filename;
                    var s = "<div class=\"coredump-box not-clicked\" id=\"" + new_filename + "\"><div class=\"coredump-inner\"><p class=\"corerow corename\">" + new_filename + "</p><p class=\"corerow\"><span class=\"coresize\">" + humanFileSize(xhr.response.filesize) + "</span><span class=\"coredate\">" + date(xhr.response.timestamp) + "</span></p></div><div class=\"delete-box\"><p class=\"delete-icon\">×</p></div></div>";
                    var corediv = document.createElement("div");
                    corediv.classList.add("coredump");
                    corediv.innerHTML = s;
                    cores.insertBefore(corediv, cores.firstChild);
                    var coredump_box = document.getElementById(new_filename);
                    var delete_icon = coredump_box.lastChild.firstChild;
                    delete_icon.addEventListener("click", function(evt) {
                        deleteCoredump(coredump_box.id);
                        evt.stopImmediatePropagation();
                    });
                    coredump_box.addEventListener("click", function() {
                        check(coredump_box.id);
                    });
                    coredump_list.unshift(new_filename);
                    updateLocalStorage(uuid_value, coredump_list);
                }
            }
        }
    });
    function abort() {
        removeListeners();
        xhr.abort();
    }
    function removeListeners() {
        previous_button.removeEventListener("click", abort);
        load_button.removeEventListener("click", abort);
        generate_button.removeEventListener("click", abort);
    }
    previous_button.addEventListener("click", abort);
    load_button.addEventListener("click", abort);
    generate_button.addEventListener("click", abort);
    xhr.send(fd);
}

function showLoading() {
    output_text.parentElement.style.display = "block";
    output_text.parentElement.style.overflow = "auto";
    output_text.classList.remove("html-text");
    output_text.classList.add("mono-text");
    output_text.innerHTML = "Loading.<span id=\"dots\"><span>.</span><span>.</span></span>";
    loading = true;
}

function showOutput(output, coredump, timestamp) {
    var coredump_box = document.getElementById(coredump);
    if (coredump_box !== null) {
        var coredate = coredump_box.firstChild.lastChild.lastChild;
        coredate.innerHTML = date(timestamp);
    }
    output_text.innerHTML = output;
    loading = false;
}

gen_report.addEventListener("click", function() {
    showLoading();
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    var coredump = checked;
    fd.append("coredump", checked);
    xhr.open("POST", "/getreport", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            showOutput(xhr.response.output, coredump, xhr.response.timestamp);
        }
    });
    xhr.send(fd);
});

backtrace.addEventListener("click", function() {
    showLoading();
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    var coredump = checked;
    fd.append("coredump", checked);
    xhr.open("POST", "/backtrace", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            showOutput(xhr.response.output, coredump, xhr.response.timestamp);
        }
    });
    xhr.send(fd);
});

siginfo.addEventListener("click", function() {
    showLoading();
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    var coredump = checked;
    fd.append("coredump", checked);
    xhr.open("POST", "/siginfo", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            showOutput(xhr.response.output, coredump, xhr.response.timestamp);
        }
    });
    xhr.send(fd);
});

decode.addEventListener("click", function() {
    showLoading();
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    var coredump = checked;
    fd.append("coredump", checked);
    xhr.open("POST", "/decode", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            var coredump_box = document.getElementById(coredump);
            if (coredump_box !== null) {
                var coredate = coredump_box.firstChild.lastChild.lastChild;
                coredate.innerHTML = date(xhr.response.timestamp);
            }
            var iframe = document.createElement("iframe");
            output_text.parentElement.style.display = "flex";
            output_text.parentElement.style.overflow = "visible";
            output_text.classList.remove("mono-text");
            output_text.classList.add("html-text");
            output_text.innerHTML = "";
            output_text.appendChild(iframe);
            iframe.width = "100%";
            iframe.height = "100%";
            iframe.contentDocument.write(xhr.response.output);
            loading = false;
        }
    });
    xhr.send(fd);
});

clear_output.addEventListener("click", function() {
    if (!loading) {
        output_text.innerHTML = "";
    }
});

abort_gdb.addEventListener("click", function() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/abort", true);
    xhr.send();
});

export_file.addEventListener("click", function() {
    
    if(!exportFile || exportFile === "")
    {
        alert("Console is Empty!");
    }
    else {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(exportFile));
    element.setAttribute('download', "console.txt");

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
    }
});

function updateAutocomplete() {
    autocomplete_text = command_input.value;
    var command = autocomplete_text.toLowerCase();
    current_commands = [];
    currently_selected = null;
    if (enter_just_pressed) {
        autocomplete.style.display = "none";
        enter_just_pressed = false;
    }
    else {
        autocomplete.style.display = "block";
        var autocomplete_items = "";
        for (var i = 0; i < commands.length; i++) {
            var command_split = command.split(" ");
            if (commands[i].toLowerCase().startsWith(command_split[0]) && (command_split.length === 1 || commands[i].toLowerCase() === command_split[0])) {
                current_commands.push(commands[i]);
                var command_string = commands[i].substring(0, command_split[0].length) + "<span class=\"bold\">" + commands[i].substring(command_split[0].length) + "</span>";
                if (commands[i] in options) {
                    command_string += " <span class=\"autocomplete-option\">" + options[commands[i]] + "</span>";
                }
                autocomplete_items += "<div class=\"autocomplete-item\" id=\"" + commands[i] + "\">" + command_string + "</div>";
            }
        }
        if (autocomplete_items === "") {
            autocomplete.innerHTML = "<div class=\"autocomplete-none\"><span class=\"autocomplete-option\">No matching commands</span></div>";
        }
        else {
            autocomplete.innerHTML = autocomplete_items;
        }
        addAutocompleteListeners();
    }
}

command_input.addEventListener("input", updateAutocomplete);

function commonPrefix(array) {
    var first = array[0];
    var last = array[array.length - 1];
    var i = 0;
    while (i < first.length && first.charAt(i) === last.charAt(i)) {
        i++;
    }
    return first.substring(0, i);
}

command_input.addEventListener("keydown", function(evt) {
    var selected_index;
    switch (evt.keyCode) {
        case 9://"Tab":
            if (current_commands.length > 0) {
                var command_split = command_input.value.split(" ");
                command_split[0] = commonPrefix(current_commands);
                command_input.value = command_split.join(" ");
                updateAutocomplete();
                if (current_commands.length === 1 && command_input.value in options) {
                    command_input.value += " ";
                }
            }
            break;
        case 13://"Enter":
            if ((currently_selected === null && command_input.value !== "") || (currently_selected !== null && !(currently_selected in options))) {
                showLoading();
                console_input = command_input.value;
                term.write(console_input);
                abort_gdb.disabled = false;
                enter_just_pressed = true;
                var xhr = new XMLHttpRequest();
                var fd = new FormData();
                var coredump = checked;
                fd.append("coredump", checked);
                fd.append("command", command_input.value);
                xhr.open("POST", "/commandinput", true);
                xhr.responseType = "json";
                xhr.addEventListener("readystatechange", function() {
                    if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                        showOutput(xhr.response.output, coredump, xhr.response.timestamp);

                        // Show the output in console also
                        var output = decodeHtml(xhr.response.output);
                        output = output.replace(/\n/g, "\r\n");
                        term.write('\r\n\x1b[37m');
                        term.write(output);
                        term.write('\x1b[32m\r\ngdb $ ');
                        term.scrollToBottom();

                        abort_gdb.disabled = true;
                    }
                });
                xhr.send(fd);
                addCommandToHistory(console_input); // Add the current executed command to the beginning of the array
                command_input.value = "";
                console_input = "";
                updateAutocomplete();
            }
            else if (currently_selected !== null) {
                updateAutocomplete();
                if (current_commands.length === 1) {
                    command_input.value += " ";
                }
            }
            break;
        case 40://"ArrowDown":
            if (currently_selected === null) {
                if (current_commands.length !== 0) {
                    autocomplete.children[0].classList.add("autocomplete-item-selected");
                    currently_selected = autocomplete.children[0].id;
                    command_input.value = currently_selected;
                    autocomplete.scrollTop = 0;
                }
            }
            else if (currently_selected !== current_commands[current_commands.length - 1]) {
                selected_index = current_commands.indexOf(currently_selected);
                autocomplete.children[selected_index].classList.remove("autocomplete-item-selected");
                var next_option = autocomplete.children[selected_index + 1];
                next_option.classList.add("autocomplete-item-selected");
                currently_selected = next_option.id;
                command_input.value = currently_selected;
                if (next_option.offsetTop + 24 + 2 > autocomplete.scrollTop + 160 || next_option.offsetTop < autocomplete.scrollTop) {
                    if (selected_index + 1 === current_commands.length - 1) {
                        autocomplete.scrollTop = autocomplete.scrollHeight + 2 - 160;
                    }
                    else {
                        autocomplete.scrollTop = next_option.offsetTop + 24 + 2 - 160;
                    }
                }
            }
            else {
                selected_index = current_commands[current_commands.length - 1];
                autocomplete.children[selected_index].classList.remove("autocomplete-item-selected");
                currently_selected = null;
                command_input.value = autocomplete_text;
            }
            break;
        case 38://"ArrowUp":
            if (currently_selected === null) {
                if (current_commands.length !== 0) {
                    autocomplete.children[current_commands.length - 1].classList.add("autocomplete-item-selected");
                    currently_selected = autocomplete.children[current_commands.length - 1].id;
                    command_input.value = currently_selected;
                    autocomplete.scrollTop = autocomplete.scrollHeight + 2 - 160;
                }
            }
            else if (currently_selected !== current_commands[0]) {
                selected_index = current_commands.indexOf(currently_selected);
                autocomplete.children[selected_index].classList.remove("autocomplete-item-selected");
                var prev_option = autocomplete.children[selected_index - 1];
                prev_option.classList.add("autocomplete-item-selected");
                currently_selected = prev_option.id;
                command_input.value = currently_selected;
                if (prev_option.offsetTop < autocomplete.scrollTop || prev_option.offsetTop + 24 + 2 > autocomplete.scrollTop + 160) {
                    if (selected_index - 1 === 0) {
                        autocomplete.scrollTop = 0;
                    }
                    else {
                        autocomplete.scrollTop = prev_option.offsetTop;
                    }
                }
            }
            else {
                selected_index = current_commands[0];
                autocomplete.children[selected_index].classList.remove("autocomplete-item-selected");
                currently_selected = null;
                command_input.value = autocomplete_text;
            }
            break;
        default:
            return;
    }
    evt.preventDefault();
});

command_input.addEventListener("blur", function() {
    autocomplete.style.display = "none";
});

command_input.addEventListener("focus", function() {
    updateAutocomplete();
});

function addAutocompleteListeners() {
    for (var i = 0; i < autocomplete.childElementCount; i++) {
        (function () {
            var autocomplete_item = autocomplete.children[i];
            autocomplete_item.addEventListener("mousedown", function(evt) {
                evt.preventDefault();
            });
            autocomplete_item.addEventListener("click", function() {
                command_input.value = autocomplete_item.id;
                updateAutocomplete();
                if (current_commands.length === 1 && command_input.value in options) {
                    command_input.value += " ";
                }
            });
        })();
    }
}

function loadPython() {
    for (var i = 0; i < commands.length; i++) {
        var editor_command = document.createElement("div");
        editor_command.classList.add("editor-command");
        editor_command.classList.add("not-clicked");
        editor_command.innerHTML = commands[i];
        command_list.insertBefore(editor_command, null);
    }
    addCommandListeners();
    getSource();
}

function addCommandListeners() {
    for (var i = 0; i < command_list.childElementCount; i++) {
        (function() {
            var editor_command = command_list.children[i];
            editor_command.addEventListener("click", function() {
                scrollToCommand(editor_command.innerText);
            });
        })();
    }
}

function updateCommands() {
    command_list.innerHTML = "";
    var command = command_search.value.toLowerCase();
    for (var i = 0; i < commands.length; i++) {
        var index = commands[i].toLowerCase().indexOf(command);
        if (index >= 0) {
            var editor_command = document.createElement("div");
            editor_command.classList.add("editor-command");
            editor_command.classList.add("not-clicked");
            editor_command.innerHTML = commands[i].substring(0, index) + "<span class=\"bold\">" + commands[i].substring(index, index + command.length) + "</span>" + commands[i].substring(index + command.length);
            command_list.insertBefore(editor_command, null);
        }
    }
    if (command_list.childElementCount > 0) {
        addCommandListeners();
    }
    else {
        var editor_command = document.createElement("div");
        editor_command.classList.add("editor-command-none");
        editor_command.innerHTML = "No commands";
        command_list.insertBefore(editor_command, null);
    }
}

command_search.addEventListener("input", updateCommands);

function scrollToCommand(command) {
    if (send_update) {
        var re = new RegExp("^def *" + command + " *\\(", "m");
        var index = code_mirror.getValue().search(re);
        if (index >= 0) {
            var pos = code_mirror.posFromIndex(index);
            code_mirror.scrollTo(null, code_mirror.charCoords(pos, "local").top - editor_program.clientHeight / 5);
            code_mirror.setCursor(pos);
        }
        code_mirror.focus();
    }
}

function getSource() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/getsource", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            editor_diff.innerText = "show diff";
            code_mirror.setOption("mode", {name: "python", version: 2});
            code_mirror.setOption("lineNumbers", true);
            code_mirror.setOption("matchBrackets", true);
            code_mirror.setOption("styleActiveLine", true);
            code_mirror.setValue(xhr.responseText);
            send_update = true;
            editor_reset.disabled = false;
            code_mirror.setOption("readOnly", false);
            if (scroll_loc != null && cursor_loc != null) {
                code_mirror.setCursor(cursor_loc);
                code_mirror.scrollTo(null, scroll_loc);
                code_mirror.focus();
            }
        }
    });
    xhr.send();
}

$("#prompt-tab").on("shown.bs.tab", function() {
    updateSource(true);
});

$("#editor-tab").on("shown.bs.tab", function() {
    code_mirror.setSize(null, editor_program.clientHeight);
    code_mirror.refresh();
    code_mirror.focus();
});

function showSourceOutput(output) {
    if (output !== "") {
        output_text.parentElement.style.display = "block";
        output_text.parentElement.style.overflow = "auto";
        output_text.classList.remove("html-text");
        output_text.classList.add("mono-text");
        output_text.innerHTML = output;
    }
}

function updateSource(show_update) {
    if (send_update) {
        console.log('update source');
        var xhr = new XMLHttpRequest();
        var fd = new FormData();
        fd.append("source", code_mirror.getValue());
        xhr.open("POST", "/updatesource", true);
        xhr.responseType = "text";
        xhr.addEventListener("readystatechange", function() {
            if (xhr.readyState === xhr.DONE && xhr.status === 200 && show_update) {
                console.log('show update');
                showSourceOutput(xhr.responseText);
            }
        });
        xhr.send(fd);
    }
}

editor_reset.addEventListener("click", function() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/resetsource", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            code_mirror.setValue(xhr.response.display);
            code_mirror.focus();
            showSourceOutput(xhr.response.output);
        }
    });
    xhr.send();
});

editor_diff.addEventListener("click", function() {
    if (editor_diff.innerText === "show diff") {
        cursor_loc = code_mirror.getCursor();
        scroll_loc = code_mirror.getScrollInfo().top;
        editor_diff.innerText = "show python";
        editor_reset.disabled = true;
        send_update = false;
        var xhr = new XMLHttpRequest();
        var fd = new FormData();
        fd.append("source", code_mirror.getValue());
        xhr.open("POST", "/diffsource", true);
        xhr.responseType = "json";
        xhr.addEventListener("readystatechange", function() {
            if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                code_mirror.setOption("mode", "diff");
                code_mirror.setOption("lineNumbers", false);
                code_mirror.setOption("matchBrackets", false);
                code_mirror.setOption("readOnly", "nocursor");
                code_mirror.setOption("styleActiveLine", false);
                code_mirror.setValue(xhr.response.display);
                showSourceOutput(xhr.response.output);
            }
        });
        xhr.send(fd);
    }
    else {
        getSource();
    }
});

timeout.addEventListener("keydown", function(evt) {
    if (evt.keyCode === 13/*Enter*/) {
        timeout.blur();
    }
});

timeout.addEventListener("blur", function() {
    if (timeout.value === "" || timeout.valueAsNumber < 1) {
        timeout.value = 1;
    }
    else if (timeout.valueAsNumber > 400) {
        timeout.value = 400;
    }
    timeout.value = Math.trunc(timeout.valueAsNumber);
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("timeout", timeout.value);
    xhr.open("POST", "/updatetimeout", true);
    xhr.send(fd);
});

function checkSession() {
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("uuid", uuid_value);
    xhr.open("POST", "/checksession", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            if (xhr.responseText === "bad" || xhr.responseText === "missing session") {
                var expire_text = document.getElementById("expire-text");
                expire_text.innerHTML = "Your key, " + uuid_value + ", has expired. Please refresh the page. To recover this session, load this key after refreshing.";
                $("#previous-modal").modal("hide");
                $("#load-modal").modal("hide");
                $("#generate-modal").modal("hide");
                $("#shared-modal").modal("hide");
                $("#exists-modal").modal("hide");
                $("#link-modal").modal("hide");
                $("#file-modal").modal("hide");
                $("#expire-modal").modal("show");
                window.removeEventListener("focus", checkSession);
            }
        }
    });
    xhr.send(fd);
}

window.addEventListener("focus", checkSession);

divider.addEventListener("mousedown", function(evt) {
    evt.preventDefault();
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", setCoreWidth);
    window.addEventListener("mouseup", cleanWindow);
    window.addEventListener("mouseup", resizeTerminal);
});

function setCoreWidth(evt) {
    cores.style.width = Math.max(Math.min(evt.clientX, 500), 100) + "px";
}

function cleanWindow() {
    document.body.removeAttribute("style");
    window.removeEventListener("mousemove", setCoreWidth);
    window.removeEventListener("mouseup", cleanWindow);
}

window.addEventListener("beforeunload", function() {
    updateSource(false);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/quit", true);
    xhr.send();
});

// xterm.js console data event handler
term.onData( (eventData) => {
    if (!enter_just_pressed){
        if (eventData === "\r"){        // Enter
            // Reset command history
            history_pos = -1;

            console_input = console_input.trim();
            if (console_input != ""){
                term.write('\r\n\x1b[1;37m');
                showLoading();
                abort_gdb.disabled = false;
                enter_just_pressed = true;
                var xhr = new XMLHttpRequest();
                var fd = new FormData();
                var coredump = checked;
                fd.append("coredump", checked);
                fd.append("command", console_input);
                exportFile = exportFile.concat(String(console_input));
                exportFile = exportFile.concat('\n');
                xhr.open("POST", "/commandinput", true);
                xhr.responseType = "json";
                xhr.addEventListener("readystatechange", function() {
                    if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                        // Show the output in the Prompt tab also
                        showOutput(xhr.response.output, coredump, xhr.response.timestamp);
                        var output = decodeHtml(xhr.response.output);
                        output = output.replace(/\n/g, "\r\n");
                        exportFile = exportFile.concat(String(output));
                        exportFile = exportFile.concat('\n');
                        term.write(output);
                        term.write('\x1b[1;32m\r\ngdb $ ');
                        abort_gdb.disabled = true;
                    }
                    enter_just_pressed = false;
                });
                xhr.send(fd);
                addCommandToHistory(console_input); // Add the current executed command to the beginning of the array
                console_input = "";
            }
            else{
                term.write('\r\ngdb $ ');
            }
            cursor = 0;
        }
        else if (eventData === "\u007f"){       // Backspace
            if (console_input.length >= 1 && cursor > 0){
                console_input = console_input.substr(0, cursor-1) + console_input.substr(cursor);
                term.write('\x1b[2K\r');
                term.write('\x1b[1;32mgdb $ ');
                term.write(console_input);
                cursor--;
                for (let i = 0 ; i < (console_input.length - cursor) ; i++){
                    term.write("\u001b[D");
                } 
            }
        }
        else if (eventData === "\u000c"){       // Clear Screen
            // TODO: History is lost when the terminal is cleared
            term.clear();
        }
        else if (eventData === "\u001b[A"){ 	// Arrow Up
            // Move to the previous executed command, if exists
            if (history_pos < command_history.length-1){
                history_pos++;

                // Rewrite the prompt
                term.write('\x1b[2K\r');
                term.write('\x1b[1;32mgdb $ ');
                console_input = command_history[history_pos];
                term.write(console_input);
                cursor = console_input.length;
            }
        }
        else if (eventData === "\u001b[B"){         // Arrow Down
            // Move to the next executed command, if exists
            if (history_pos > 0){
                history_pos--;

                // Rewrite the prompt
                term.write('\x1b[2K\r');
                term.write('\x1b[1;32mgdb $ ');
                console_input = command_history[history_pos];
                term.write(console_input);
                cursor = console_input.length;
            }
            else if (history_pos === 0){
                history_pos--;

                // Empty prompt
                term.write('\x1b[2K\r');
                term.write('\x1b[1;32mgdb $ ');
                console_input = "";
                cursor = 0;
            }
        }
        else if (eventData === "\u001b[C") {	// Arrow Right
            if (cursor < console_input.length){
                cursor++;
                term.write(eventData);
            }
        }
        else if (eventData === "\u001b[D") {	// Arrow Left
            if (cursor > 0){
                cursor--;
                term.write(eventData);
            }
        }
        else {          // Printable characters
            console_input = console_input.substr(0, cursor) + eventData + console_input.substr(cursor);
            term.write('\x1b[2K\r');
            term.write('\x1b[1;32mgdb $ ');
            term.write(console_input);
            cursor += eventData.length;
            for (let i = 0 ; i < (console_input.length - cursor) ; i++){
                term.write("\u001b[D");
            }
        }
    }
});

// Add the executed command to the head of the command_history array, 
// if it is not already present there 
function addCommandToHistory(command){
    if (command_history[0] !== command){
        command_history.unshift(console_input);
    }
}

// Resize the console when the window is resized
window.addEventListener("resize", resizeTerminal);

// If window resize happens when a different tab is selected, `fitAddon.fit()` will not work
$('#console-tab').on('shown.bs.tab', function (e) {
    fitAddon.fit();
});

function resizeTerminal() {
    // Resize only if the console tab is the active tab
    if (console_tab.classList.contains("active")){
        fitAddon.fit();
    }
}

function decodeHtml(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

$('#crash-info-general-tab').on('shown.bs.tab', function (e) {
    if (checked !== null && crash_info_text.innerHTML === ""){
            getCrashInfo();
    }
});

function getCrashInfo(){
    showElementLoading(crash_info_text);
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    var coredump = checked;
    fd.append("coredump", checked);
    xhr.open("POST", "/systeminfo", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            showCrashInfo(xhr.response.output, coredump, xhr.response.timestamp);
        }
    });
    xhr.send(fd);
}

var crashinfoinfo;
function showCrashInfo(output, coredump, timestamp) {
    crashinfoinfo = output;
    var coredump_box = document.getElementById(coredump);
    if (coredump_box !== null) {
        var coredate = coredump_box.firstChild.lastChild.lastChild;
        coredate.innerHTML = date(timestamp);
    }
    crash_info_text.innerHTML = output;
    element_loading = false;
}

$('#crash-info-malloc-tab').on('shown.bs.tab', function (e) {
    if (checked !== null && malloc_table.rows().count() === 0){
            getMallocDump();
    }
});

function getMallocDump(){
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    var coredump = checked;
    fd.append("coredump", checked);
    xhr.open("POST", "/mallocdump", true);
    xhr.responseType = "json";
    malloc_loading_alert.style.removeProperty("display");	// show loading
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            if (xhr.response.available === "true") {
                malloc_unavailable_alert.style.setProperty("display", "none");
                $('#malloc-table').parents('div.dataTables_wrapper').first().show();
                showMallocDump(xhr.response.output.toString(), coredump, xhr.response.timestamp);
                malloc_loading_alert.style.setProperty("display", "none");	// hide loading
            }
            else {
                malloc_loading_alert.style.setProperty("display", "none");	// hide loading
                malloc_unavailable_alert.style.removeProperty("display");
                malloc_table.clear().draw();
                $('#malloc-table').parents('div.dataTables_wrapper').first().hide();
            }
        }
    });
    xhr.send(fd);
}

function showMallocDump(output, coredump, timestamp) {
    var coredump_box = document.getElementById(coredump);
    if (coredump_box !== null) {
        var coredate = coredump_box.firstChild.lastChild.lastChild;
        coredate.innerHTML = date(timestamp);
    }

    // Format the malloc dump as a table
    var output_lines = output.split("\n");
    var output_line;
    for (let index = 0 ; index < output_lines.length ; index++) {
        output_line = output_lines[index].split("\t");
        if (output_line.length < 4) {
            continue;
        }
        malloc_table.row.add(output_line);
    };

    malloc_table.draw();
}

function showElementLoading(element) {
    element.parentElement.style.display = "block";
    element.parentElement.style.overflow = "auto";
    element.classList.remove("html-text");
    element.classList.add("mono-text");
    element.innerHTML = "Loading.<span id=\"dots\"><span>.</span><span>.</span></span>";
    element_loading = true;
}

function toggleFullscreen(elem) {
    elem = elem || document.documentElement;

    if (!document.fullscreenElement && !document.mozFullScreenElement &&
        !document.webkitFullscreenElement && !document.msFullscreenElement) {
        if (elem.requestFullscreen) {
        elem.requestFullscreen();
        } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.exitFullscreen) {
        document.exitFullscreen();
        } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        }
    }
}
