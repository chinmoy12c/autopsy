"use strict";
var uuid = document.getElementById("uuid");
var uuids = document.getElementById("uuids");
var previous_button = document.getElementById("previous-button");
var key_group = document.getElementById("key-group");
var load_key = document.getElementById("load-key");
var load_button = document.getElementById("load-button");
var generate_button = document.getElementById("generate-button");
var browse = document.getElementById("browse");
var input = document.getElementById("file-input");
var file_picker = document.getElementById("file-picker");
var file_name = document.getElementById("file-name");
var upload_button = document.getElementById("upload-button");
var downloaded = document.getElementById("downloaded");
var progress = document.getElementById("progress");
var cores = document.getElementById("cores");
var gen_report = document.getElementById("gen-report");
var backtrace = document.getElementById("backtrace");
var siginfo = document.getElementById("siginfo");
var clear_output = document.getElementById("clear-output");
var command_input = document.getElementById("command-input");
var autocomplete = document.getElementById("autocomplete");
var output_text = document.getElementById("output-text");

var uuid_value = uuid.innerHTML;
var checked_uuid = null;
var filename;
var coredump_list;
var checked = null;
var commands = ["asacommands", "checkibuf", "checkoccamframe", "dispak47anonymouspools", "dispak47vols", "dispallactiveawarectx", "dispallactiveuctectx", "dispallactiveucteoutway", "dispallak47instance", "dispallattachedthreads", "dispallawarectx", "dispallpoolsinak47instance", "dispallthreads", "dispalluctectx", "dispallucteoutway", "dispasastate", "dispasathread", "dispawareurls", "dispbacktraces", "dispcacheinfo", "dispclhash", "dispcrashthread", "dispdpthreads", "dispfiberinfo", "dispfiberstacks", "dispfiberstats", "dispgdbthreadinfo", "displuastack", "displuastackbyl", "displuastackbylreverse", "dispmeminfo", "dispmemregion", "dispoccamframe", "dispramfsdirtree", "dispsiginfo", "dispstackforthread", "dispstackfromrbp", "dispthreads", "dispthreadstacks", "disptypes", "dispunmangleurl", "dispurls", "findString", "findmallochdr", "findoccamframes", "generatereport", "searchMem", "searchMemAll", "search_mem", "showak47info", "showak47instances", "showblocks", "showconsolemessage", "unescapestring", "verifyoccaminak47instance", "verifystacks", "walkIntervals", "webvpn_print_block_failures"];
var options = {"checkibuf": "&lt;address&gt;", "checkoccamframe": "&lt;frame&gt;", "dispallthreads": "[&lt;verbosity&gt;]", "dispasathread": "&lt;thread name&gt; [&lt;verbosity&gt;]", "dispcrashthread": "[&lt;verbosity&gt;] [&lt;linux thread id&gt;]", "dispdpthreads": "[&lt;verbosity&gt;]", "dispgdbthreadinfo": "[&lt;verbosity&gt;]", "displuastack": "&lt;stack&gt; &lt;depth&gt;", "displuastackbyl": "&lt;L&gt; &lt;depth&gt;", "displuastackbylreverse": "&lt;L&gt; &lt;depth&gt;", "dispmemregion": "&lt;address&gt; &lt;length&gt;", "dispoccamframe": "&lt;address&gt;", "dispramfsdirtree": "&lt;ramfs node address&gt;", "dispstackforthread": "[&lt;threadname&gt;|&lt;thread address&gt;]", "dispstackfromrbp": "&lt;rbp&gt;", "dispthreads": "[&lt;verbosity&gt;]", "disptypes": "&lt;type&gt; &lt;address&gt;", "dispunmangleurl": "&lt;mangled URL&gt;", "findString": "&lt;string&gt;", "searchMem": "&lt;address&gt; &lt;length&gt; &lt;pattern&gt;", "searchMemAll": "&lt;pattern&gt;", "search_mem": "&lt;address&gt; &lt;length&gt; &lt;pattern&gt;", "unescapestring": "&lt;string&gt;", "verifyoccaminak47instance": "&lt;ak47 instance name&gt;"};
var loading = false;

var current_commands = [];
var autocomplete_text;
var currently_selected = null;

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
        var s = "<div class=\"coredump-box not-clicked\" id=\"" + coredumps[i][1] + "\"><div class=\"coredump-inner\"><p class=\"corename\">" + coredumps[i][1] + "</p><p class=\"coresize\">" + humanFileSize(coredumps[i][2]) + "</p><p class=\"coredate\">" + date(coredumps[i][3]) + "</p></div><div class=\"delete-box\"><p class=\"delete-icon\">×</p></div></div>";
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
    command_input.disabled = setting;
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
        checked = id;
        disableCommandButtons(false);
    }
    else {
        id_box.classList.remove("clicked");
        id_box.classList.add("not-clicked");
        checked = null;
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

$("#previous-modal").on("hide.bs.modal", function() {
    $("[data-toggle='popover']").popover("dispose");
});

$("#previous-modal").on("hidden.bs.modal", function() {
    previous_button.innerHTML = "Load";
});

previous_button.addEventListener("click", function() {
    previous_button.disabled = true;
    previous_button.innerHTML = "<i class='fa fa-circle-o-notch fa-spin'></i> Loading…";
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("loadkey", checked_uuid);
    xhr.open("POST", "/loadkey", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            $("#previous-modal").modal("hide");
            uuid.innerHTML = this.response.uuid;
            uuid_value = this.response.uuid;
            reset();
            loadCoredumps(this.response.coredumps);
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

load_key.addEventListener("input", function() {
    if (load_key.value === "") {
        key_group.className = "input-group";
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
                        key_group.className = "input-group has-success";
                        load_key.className = "form-control form-control-success";
                        load_button.disabled = false;
                    }
                    else {
                        key_group.className = "input-group has-danger";
                        load_key.className = "form-control form-control-danger";
                        load_button.disabled = true;
                    }
                }
            });
            xhr.send(fd);
        }
        else {
            key_group.className = "input-group has-warning";
            load_key.className = "form-control form-control-warning";
            load_button.disabled = true;
        }
    }
});

function resetFileUpload() {
    browse.innerHTML = "Browse";
    browse.className = "browse-clickable";
    browse.style.cursor = "pointer";
    input.disabled = false;
    file_picker.style.cursor = "pointer";
    upload_button.innerHTML = "Upload";
    progress.style.transition = "opacity 1s, width 0.5s";
    progress.style.opacity = 0;
    downloaded.innerHTML = "";
}

function reset() {
    cores.innerHTML = "";
    load_key.value = "";
    key_group.className = "input-group";
    load_key.className = "form-control";
    load_button.disabled = true;
    generate_button.disabled = false;
    output_text.innerHTML = "";
    resetFileUpload();
    input.value = "";
    file_name.innerHTML = "Choose file…";
    upload_button.className = "btn btn-primary";
    upload_button.disabled = true;
    checked_uuid = null;
    checked = null;
    command_input.value = "";
    loading = false;
    disableCommandButtons(true);
}

load_button.addEventListener("click", function() {
    load_button.disabled = true;
    load_button.innerHTML = "<i class='fa fa-circle-o-notch fa-spin'></i> Loading…";
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("loadkey", load_key.value.toLowerCase());
    xhr.open("POST", "/loadkey", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            $("#load-modal").modal("hide");
            uuid.innerHTML = this.response.uuid;
            uuid_value = this.response.uuid;
            reset();
            loadCoredumps(this.response.coredumps);
        }
    });
    xhr.send(fd);
});

generate_button.addEventListener("click", function() {
    generate_button.disabled = true;
    generate_button.innerHTML = "<i class='fa fa-circle-o-notch fa-spin'></i> Generating…";
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
        }
    });
    xhr.send();
});

upload_button.addEventListener("click", function() {
    browse.style.cursor = "pointer";
    input.disabled = true;
    file_picker.style.cursor = "not-allowed";
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
            if (xhr.responseText === "duplicate") {
                browse.className = "browse-clickable";
                browse.style.cursor = "pointer";
                input.disabled = false;
                file_picker.style.cursor = "pointer";
                upload_button.className = "btn btn-danger";
                upload_button.innerHTML = "Duplicate File";
            }
            else if (xhr.responseText === "type") {
                browse.className = "browse-clickable";
                browse.style.cursor = "pointer";
                input.disabled = false;
                file_picker.style.cursor = "pointer";
                upload_button.className = "btn btn-danger";
                upload_button.innerHTML = "Invalid File";
            }
            else {
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
            //technically not needed
            if (xhr.responseText === "duplicate") {
                browse.innerHTML = "Browse";
                input.disabled = false;
                file_picker.style.cursor = "pointer";
                upload_button.className = "btn btn-danger";
                upload_button.innerHTML = "Duplicate File";
                downloaded.innerHTML = "";
                progress.style.opacity = 0;
            }
            else if (xhr.responseText === "not gzip") {
                browse.innerHTML = "Browse";
                input.disabled = false;
                file_picker.style.cursor = "pointer";
                upload_button.className = "btn btn-danger";
                upload_button.innerHTML = "Invalid File";
                downloaded.innerHTML = "";
                progress.style.opacity = 0;
            }
            else {
                browse.innerHTML = "Browse";
                browse.className = "browse-unclickable";
                browse.style.cursor = "not-allowed";
                upload_button.innerHTML = "Unzipping…";
                unzip();
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
        resetFileUpload();
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
            if (xhr.responseText === "unzip failed") {
                input.disabled = false;
                file_picker.style.cursor = "pointer";
                upload_button.className = "btn btn-danger";
                upload_button.innerHTML = "Unzip Failed";
                downloaded.innerHTML = "";
                progress.style.opacity = 0;
            }
            else {
                upload_button.innerHTML = "Building…";
                build();
            }
        }
    });
    xhr.send();
}

function build() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/build", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            resetFileUpload();
            input.value = "";
            file_name.innerHTML = "Choose file…";
            upload_button.disabled = true;
            var new_filename = this.response.filename;
            var s = "<div class=\"coredump-box not-clicked\" id=\"" + new_filename + "\"><div class=\"coredump-inner\"><p class=\"corename\">" + new_filename + "</p><p class=\"coresize\">" + humanFileSize(this.response.filesize) + "</p><p class=\"coredate\">" + date(this.response.timestamp) + "</p></div><div class=\"delete-box\"><p class=\"delete-icon\">×</p></div></div>";
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
    });
    xhr.send();
}

function showLoading() {
    output_text.innerHTML = "Loading.<span id=\"dots\"><span>.</span><span>.</span></span>";
    loading = true;
}

function showOutput(output, coredump, timestamp) {
    var coredump_box = document.getElementById(coredump);
    if (coredump_box !== null) {
        var coredate = coredump_box.firstChild.lastChild;
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
            showOutput(this.response.output, coredump, this.response.timestamp);
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
            showOutput(this.response.output, coredump, this.response.timestamp);
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
            showOutput(this.response.output, coredump, this.response.timestamp);
        }
    });
    xhr.send(fd);
});

clear_output.addEventListener("click", function() {
    if (!loading) {
        output_text.innerHTML = "";
    }
});

function updateAutocomplete() {
    autocomplete_text = command_input.value;
    var command = autocomplete_text.toLowerCase();
    current_commands = [];
    currently_selected = null;
    if (command === "") {
        autocomplete.style.display = "none";
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
    if (evt.defaultPrevented) {
        return;
    }
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
            if (currently_selected !== null) {
                updateAutocomplete();
                if (current_commands.length === 1 && command_input.value in options) {
                    command_input.value += " ";
                }
            }
            else if (command_input.value !== "") {
                showLoading();
                var xhr = new XMLHttpRequest();
                var fd = new FormData();
                var coredump = checked;
                fd.append("coredump", checked);
                fd.append("command", command_input.value);
                xhr.open("POST", "/commandinput", true);
                xhr.responseType = "json";
                xhr.addEventListener("readystatechange", function() {
                    if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                        showOutput(this.response.output, coredump, this.response.timestamp);
                    }
                });
                xhr.send(fd);
                command_input.value = "";
                updateAutocomplete();
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

window.addEventListener("focus", function() {
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("uuid", uuid_value);
    xhr.open("POST", "/checksession", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            if (xhr.responseText === "bad") {
                var expire_text = document.getElementById("expire-text");
                expire_text.innerHTML = "Your key, " + uuid_value + ", has expired. Please refresh the page. To recover this session, load this key after refreshing.";
                $("#previous-modal").modal("hide");
                $("#load-modal").modal("hide");
                $("#generate-modal").modal("hide");
                $("#expire-modal").modal("show");
            }
        }
    });
    xhr.send(fd);
});

window.addEventListener("beforeunload", function() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/quit", true);
    xhr.send();
});
