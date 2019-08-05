"use strict";

var time = document.getElementById("time");
var coredumps_table = document.getElementById("coredumps-table");
var failed_uploads_table = document.getElementById("failed-uploads-table");

var coredumps;
var failedUploads;

var coredumpsSortedColumn = -1;
var coredumpsDirection = 1;

var failedUploadsSortedColumn = -1;
var failedUploadsDirection = 1;

function humanFileSize(size) {
    if (size === 0) {
        return "0 bytes";
    }
    var i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + " " + ["bytes", "KB", "MB", "GB", "TB"][i];
}

function date(timestamp) {
    var d = new Date(timestamp);
    var year = d.getFullYear();
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var seconds = d.getSeconds();
    var ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    return months[d.getMonth()] + " " + d.getDate() + ", " + year + ", " + hours + ":" + minutes + ":" + seconds + " " + ampm;
}

function timeDiff(startTime) {
    var diff = Math.floor((Date.now() - startTime) / 1000);
    var arr = [];
    if (diff >= 60 * 60 * 24) {
        var days = Math.floor(diff / (60 * 60 * 24));
        diff -= days * 60 * 60 * 24;
        days += (days === 1 ? " day" : " days");
        arr.push(days);
    }
    if (diff >= 60 * 60) {
        var hours = Math.floor(diff / (60 * 60));
        diff -= hours * 60 * 60;
        hours += (hours === 1 ? " hour" : " hours");
        arr.push(hours);
    }
    if (diff >= 60) {
        var minutes = Math.floor(diff / 60);
        diff -= minutes * 60;
        minutes += (minutes === 1 ? " minute" : " minutes");
        arr.push(minutes);
    }
    if (diff >= 1) {
        var seconds = diff;
        seconds += (seconds === 1 ? " second" : " seconds");
        arr.push(seconds);
    }
    if (arr.length === 0) {
        return "0 seconds";
    }
    if (arr.length === 1) {
        return arr[0];
    }
    if (arr.length === 2) {
        return arr[0] + " and " + arr[1];
    }
    var s = "";
    for (var i = 0; i < arr.length - 2; i++) {
        s += arr[i] + ", ";
    }
    s += arr[arr.length - 2] + ", and " + arr[arr.length - 1];
    return s;
}

function loadStartTime(startTime) {
    var s = date(startTime) + " (" + timeDiff(startTime) + " ago)";
    time.innerHTML = s;
}

function loadCoredumpsTable(coredumpsList) {
    coredumps = coredumpsList;
    var s = "";
    for (var i = 0; i < coredumps.length; i++) {
        s += "<tr><th scope=\"row\">" + (coredumps[i][0] + 1) + "</th><td>" + coredumps[i][1] + "</td><td>" + coredumps[i][2] + "</td><td>" + humanFileSize(coredumps[i][3]) + "</td><td>" + date(coredumps[i][4]) + "</td><td>" + date(coredumps[i][5]) + "</td><td>" + coredumps[i][6] + "</td><td>" + coredumps[i][7] + "</td><td>" + coredumps[i][8] + "</td><td>" + coredumps[i][9] + "</td><td>" + coredumps[i][10] + "</td></tr>";
    }
    coredumps_table.innerHTML = s;
}

function loadFailedUploadsTable(failedUploadsList) {
    failedUploads = failedUploadsList;
    var s = "";
    for (var i = 0; i < failedUploads.length; i++) {
        s += "<tr><th scope=\"row\">" + (failedUploads[i][0] + 1) + "</th><td>" + failedUploads[i][1] + "</td><td>" + failedUploads[i][2] + "</td><td>" + date(failedUploads[i][3]) + "</td></tr>";
    }
    failed_uploads_table.innerHTML = s;
}

function sortCoredumpsTable(id) {
    if (coredumpsSortedColumn === id) {
        coredumpsDirection = -1 * coredumpsDirection;
        if (coredumpsDirection === 1) {
            document.getElementsByClassName("coredumps-sort-icon")[id].innerHTML = "<i class=\"fas fa-sort-up\"></i>";
        } else {
            document.getElementsByClassName("coredumps-sort-icon")[id].innerHTML = "<i class=\"fas fa-sort-down\"></i>";
        }
    } else {
        if (coredumpsSortedColumn !== -1) {
            document.getElementsByClassName("coredumps-sort-icon")[coredumpsSortedColumn].innerHTML = "<i class=\"fas fa-sort\"></i>";
        }
        coredumpsSortedColumn = id;
        coredumpsDirection = 1;
        document.getElementsByClassName("coredumps-sort-icon")[id].innerHTML = "<i class=\"fas fa-sort-up\"></i>";
    }
    coredumps.sort(function(a, b) {
        if (id === 0 || id === 3 || id === 4 || id === 5 || id === 10) {
            return coredumpsDirection * (a[id] - b[id]);
        } else {
            if (a[id].toUpperCase() > b[id].toUpperCase()) {
                return (coredumpsDirection === 1) ? 1 : -1;
            } else if (a[id].toUpperCase() < b[id].toUpperCase()) {
                return (coredumpsDirection === 1) ? -1 : 1;
            }
            return 0;
        }
    });
    loadCoredumpsTable(coredumps);
}

function sortFailedUploadsTable(id) {
    if (failedUploadsSortedColumn === id) {
        failedUploadsDirection = -1 * failedUploadsDirection;
        if (failedUploadsDirection === 1) {
            document.getElementsByClassName("failed-uploads-sort-icon")[id].innerHTML = "<i class=\"fas fa-sort-up\"></i>";
        } else {
            document.getElementsByClassName("failed-uploads-sort-icon")[id].innerHTML = "<i class=\"fas fa-sort-down\"></i>";
        }
    } else {
        if (failedUploadsSortedColumn !== -1) {
            document.getElementsByClassName("failed-uploads-sort-icon")[failedUploadsSortedColumn].innerHTML = "<i class=\"fas fa-sort\"></i>";
        }
        failedUploadsSortedColumn = id;
        failedUploadsDirection = 1;
        document.getElementsByClassName("failed-uploads-sort-icon")[id].innerHTML = "<i class=\"fas fa-sort-up\"></i>";
    }
    failedUploads.sort(function(a, b) {
        if (id === 0 || id === 3 || id === 4 || id === 5 || id === 10) {
            return failedUploadsDirection * (a[id] - b[id]);
        } else {
            if (a[id].toUpperCase() > b[id].toUpperCase()) {
                return (failedUploadsDirection === 1) ? 1 : -1;
            } else if (a[id].toUpperCase() < b[id].toUpperCase()) {
                return (failedUploadsDirection === 1) ? -1 : 1;
            }
            return 0;
        }
    });
    loadFailedUploadsTable(failedUploads);
}
