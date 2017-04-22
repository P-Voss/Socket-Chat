
var ssl = false;
var host = "host";
var port = 8181;

if (ssl) {
    var ws = new WebSocket("wss://" + host + ":" + port);
} else {
    var ws = new WebSocket("ws://" + host + ":" + port);
}
var users = [];
ws.onopen = function (e) {
    ws.send("/init " + jQuery("#userId").val());
};

ws.onmessage = function (e) {
    var data = JSON.parse(e.data);
    if (data.type === "message") {
        displayMessage(data.name, data.message);
    }
    if (data.type === "disconnect") {
        displayMessage(data.name, data.message);
        ws.close();
    }
    if (data.type === "userlist") {
        refreshUserList(data.message);
    }
    if (data.type === "roomlist") {
        refreshRoomList(data.message);
    }
    if (data.type === "whisper") {
        displayMessage(data.name + " whispers", data.message, "msg");
    }
    if (data.type === "whisperAcc") {
        displayMessage("Whispered message to " + data.name, data.message);
    }
    if (data.type === "directTo") {
        displayMessage(data.name, data.message, "directed");
    }
    if (data.type === "roominfo") {
        updateRoomInfo(data.message);
    }
};

function updateRoomInfo(desc) {
    jQuery("#roomDescription").text(desc);
}

function refreshUserList(clients) {
    jQuery("#userList").html("");
    for (var i = 0; i < clients.length; i++) {
        if (users.indexOf(clients[i].nickname) === -1) {
            users.push(clients[i]["nickname"]);
        }
        var adminText = (clients[i]["isAdmin"]) ? " (*)" : "";
        jQuery("#userList").append(jQuery("<div class='user'></div>").text(clients[i]["nickname"] + adminText));
    }
}

function refreshRoomList(rooms) {
    jQuery("#roomlist").html("");
    for (var i = 0; i < rooms.length; i++) {
        jQuery("#roomlist").append(jQuery("<option value='"+ rooms[i].roomId +"'></div>").text(rooms[i].name));
    }
}

function sendMessage() {
    var messageText = jQuery("#message").val().trim();
    if (messageText !== "") {
        ws.send(messageText);
    }
    jQuery("#message").val("");
    jQuery("#message").focus();
}

function switchRoom(roomId) {
    ws.send("/join " + roomId);
}

function displayMessage(sender, text, elemClass) {
    elemClass = (typeof elemClass !== 'undefined') ?  elemClass : "";
    var label = jQuery("<span class='label'></span>").text(sender + ": ");
    var message = jQuery("<span class='im " + elemClass + "'></span>").append(text);
    var block = jQuery("<div></div>").append(label).append(message);
    jQuery("#messages").append(block).scrollTop(jQuery("#messages")[0].scrollHeight);
}


