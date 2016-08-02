"use strict";
var uuid = document.getElementById("uuid");
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
var clear_output = document.getElementById("clear-output");
var command_input = document.getElementById("command-input");
var autocomplete = document.getElementById("autocomplete");
var output_text = document.getElementById("output-text");

var filename;
var checked = null;
var commands = ["asacommands", "checkibuf", "checkoccamframe", "dispak47anonymouspools", "dispak47vols", "dispallactiveawarectx", "dispallactiveuctectx", "dispallactiveucteoutway", "dispallak47instance", "dispallattachedthreads", "dispallawarectx", "dispallpoolsinak47instance", "dispallthreads", "dispalluctectx", "dispallucteoutway", "dispasastate", "dispasathread", "dispawareurls", "dispbacktraces", "dispcacheinfo", "dispclhash", "dispcrashthread", "dispdpthreads", "dispfiberinfo", "dispfiberstacks", "dispfiberstats", "dispgdbthreadinfo", "displuastack", "displuastackbyl", "displuastackbylreverse", "dispmeminfo", "dispmemregion", "dispoccamframe", "dispramfsdirtree", "dispsiginfo", "dispstackforthread", "dispstackfromrbp", "dispthreads", "dispthreadstacks", "disptypes", "dispunmangleurl", "dispurls", "findString", "findmallochdr", "findoccamframes", "generatereport", "searchMem", "searchMemAll", "search_mem", "showak47info", "showak47instances", "showblocks", "showconsolemessage", "unescapestring", "verifyoccaminak47instance", "verifystacks", "walkIntervals", "webvpn_print_block_failures"];
var options = {"checkibuf": "&lt;address&gt;", "checkoccamframe": "&lt;frame&gt;", "dispallthreads": "[&lt;verbosity&gt;]", "dispasathread": "&lt;thread name&gt; [&lt;verbosity&gt;]", "dispcrashthread": "[&lt;verbosity&gt;] [&lt;linux thread id&gt;]", "dispdpthreads": "[&lt;verbosity&gt;]", "dispgdbthreadinfo": "[&lt;verbosity&gt;]", "displuastack": "&lt;stack&gt; &lt;depth&gt;", "displuastackbyl": "&lt;L&gt; &lt;depth&gt;", "displuastackbylreverse": "&lt;L&gt; &lt;depth&gt;", "dispmemregion": "&lt;address&gt; &lt;length&gt;", "dispoccamframe": "&lt;address&gt;", "dispramfsdirtree": "&lt;ramfs node address&gt;", "dispstackforthread": "[&lt;threadname&gt;|&lt;thread address&gt;]", "dispstackfromrbp": "&lt;rbp&gt;", "dispthreads": "[&lt;verbosity&gt;]", "disptypes": "&lt;type&gt; &lt;address&gt;", "dispunmangleurl": "&lt;mangled URL&gt;", "findString": "&lt;string&gt;", "searchMem": "&lt;address&gt; &lt;length&gt; &lt;pattern&gt;", "searchMemAll": "&lt;pattern&gt;", "search_mem": "&lt;address&gt; &lt;length&gt; &lt;pattern&gt;", "unescapestring": "&lt;string&gt;", "verifyoccaminak47instance": "&lt;ak47 instance name&gt;"};

var current_commands = [];
var autocomplete_text;
var currently_selected = null;

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
        return '0 bytes';
    }
    var i = Math.floor( Math.log(size) / Math.log(1024) );
    return ( size / Math.pow(1024, i) ).toFixed(2) * 1 + ' ' + ['bytes', 'KB', 'MB', 'GB', 'TB'][i];
}

function loadCoredumps(coredumps) {
    for (var i = 0; i < coredumps.length; i++) {
        var s = "<div class=\"coredump-box not-clicked\" id=\"" + coredumps[i][1] + "\"><div class=\"coredump-inner\"><p class=\"corename\">" + coredumps[i][1] + "</p><p class=\"coresize\">" + humanFileSize(coredumps[i][2]) + "</p></div><div class=\"delete-box\"><p class=\"delete-icon\">×</p></div></div>";
        var corediv = document.createElement("div");
        corediv.classList.add("coredump-noanim");
        corediv.innerHTML = s;
        cores.insertBefore(corediv, cores.firstChild);
    }
    addCoredumpListeners();
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

$("#load-modal").on("shown.bs.modal", function() {
    $("#load-key").focus();
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
    output_text.innerHTML = "";
    resetFileUpload();
    input.value = "";
    file_name.innerHTML = "Choose file…";
    upload_button.className = "btn btn-primary";
    upload_button.disabled = true;
    checked = null;
    command_input.value = "";
    disableCommandButtons(true);
}

load_button.addEventListener("click", function() {
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("loadkey", load_key.value.toLowerCase());
    xhr.open("POST", "/loadkey", true);
    xhr.responseType = "json";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            $("#load-modal").modal("hide");
            uuid.innerHTML = this.response[0][0];
            console.log(this.response);
            reset();
            loadCoredumps(this.response);
        }
    });
    xhr.send(fd);
});

generate_button.addEventListener("click", function() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/generatekey", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            $("#generate-modal").modal("hide");
            uuid.innerHTML = xhr.responseText;
            reset();
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
        load_button.removeEventListener("click", abort);
        generate_button.removeEventListener("click", abort);
        browse.removeEventListener("click", cancel);
    }
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
            if (xhr.responseText === "finished") {
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
            var s = "<div class=\"coredump-box not-clicked\" id=\"" + new_filename + "\"><div class=\"coredump-inner\"><p class=\"corename\">" + new_filename + "</p><p class=\"coresize\">" + humanFileSize(this.response.filesize) + "</p></div><div class=\"delete-box\"><p class=\"delete-icon\">×</p></div></div>";
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
        }
    });
    xhr.send();
}

gen_report.addEventListener("click", function() {
    output_text.innerHTML = "Loading…";
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("coredump", checked);
    xhr.open("POST", "/getreport", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            output_text.innerHTML = xhr.responseText;
        }
    });
    xhr.send(fd);
});

backtrace.addEventListener("click", function() {
    output_text.innerHTML = "Loading…";
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    fd.append("coredump", checked);
    xhr.open("POST", "/backtrace", true);
    xhr.responseType = "text";
    xhr.addEventListener("readystatechange", function() {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            output_text.innerHTML = xhr.responseText;
        }
    });
    xhr.send(fd);
});

clear_output.addEventListener("click", function() {
    output_text.innerHTML = "";
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
            if (commands[i].startsWith(command_split[0]) && (command_split.length === 1 || commands[i] === command_split[0])) {
                current_commands.push(commands[i]);
                var command_string = command_split[0] + "<b>" + commands[i].substring(command_split[0].length) + "</b>";
                if (commands[i] in options) {
                    command_string += " <span class=\"autocomplete-option\">" + options[commands[i]] + "</span>";
                }
                autocomplete_items += "<div class=\"autocomplete-item\" id=\"" + commands[i] + "\">" + command_string + "</div>";
            }
        }
        if (autocomplete_items === "") {
            autocomplete.innerHTML = "<div class=\"autocomplete-none\"><span class=\"autocomplete-option\">No matching commands</span";
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
    switch (evt.key) {
        case "Tab":
            if (current_commands.length > 0) {
                command_input.value = commonPrefix(current_commands);
                updateAutocomplete();
                if (current_commands.length === 1 && command_input.value in options) {
                    command_input.value += " ";
                }
            }
            break;
        case "Enter":
            if (currently_selected !== null) {
                updateAutocomplete();
                if (current_commands.length === 1 && command_input.value in options) {
                    command_input.value += " ";
                }
            }
            else {
                output_text.innerHTML = "Loading…";
                var xhr = new XMLHttpRequest();
                var fd = new FormData();
                fd.append("coredump", checked);
                fd.append("command", command_input.value);
                xhr.open("POST", "/commandinput", true);
                xhr.responseType = "text";
                xhr.addEventListener("readystatechange", function() {
                    if (xhr.readyState === xhr.DONE && xhr.status === 200) {
                        output_text.innerHTML = xhr.responseText;
                    }
                });
                xhr.send(fd);
                command_input.value = "";
                updateAutocomplete();
            }
            break;
        case "ArrowDown":
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
        case "ArrowUp":
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
