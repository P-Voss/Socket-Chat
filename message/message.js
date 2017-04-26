
var markdown = require("markdown").markdown;
var WebSocket = require('ws');


module.exports = {
    userService: null,
    systemMessageToClient: function (message, client) {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
                "name": "System",
                "message": message,
                "type": "message"
            }));
        }
    },
    
    sendMessage: function (sendMessageName, message, type, roomId) {
        var clients = this.userService.getClients();
        var markupMessage = addMarkup(message);
        for (var i = 0; i < clients.length; i++) {
            var clientSocket = clients[i].ws;
            if (clientSocket.readyState === WebSocket.OPEN && clients[i].roomId === roomId) {
                clientSocket.send(JSON.stringify({
                    "name": sendMessageName,
                    "message": markupMessage,
                    "type": type
                }));
            }
        }
    },
    broadcastMessage: function (sendMessageName, message, type) {
        var clients = this.userService.getClients();
        for (var i = 0; i < clients.length; i++) {
            var clientSocket = clients[i].ws;
            if (clientSocket.readyState === WebSocket.OPEN) {
                clientSocket.send(JSON.stringify({
                    "name": sendMessageName,
                    "message": message,
                    "type": type
                }));
            }
        }
    },
    directMessage: function (client, message) {
        var clients = this.userService.getClients();
        messageSpecs = /^@(\w*) (.*)/.exec(message);
        if (messageSpecs !== null && messageSpecs.length === 3) {
            var directedClient = null;
            for (var i = 0; i < clients.length; i++) {
                if (clients[i].nickname === messageSpecs[1] 
                        && clients[i].roomId === client.roomId)
                {
                    directedClient = clients[i];
                    break;
                }
            }
            if (directedClient !== null) {
                var markupMessage = addMarkup(messageSpecs[2]);
                var messageToSend = "[an " + clients[i].nickname +"] " + markupMessage;
                var type = "message";
                for (var i = 0; i < clients.length; i++) {
                    var clientSocket = clients[i].ws;
                    if (clients[i].id === directedClient.id) {
                        type = "directTo";
                    } else {
                        type ="message";
                    }
                    if (clientSocket.readyState === WebSocket.OPEN) {
                        clientSocket.send(JSON.stringify({
                            "name": client.nickname,
                            "message": messageToSend,
                            "type": type
                        }));
                    }
                }
            } else {
                this.sendMessage(client.nickname, addMarkup(message), "message", client.roomId);
            }
        } else {
            this.sendMessage(client.nickname, addMarkup(message), "message", client.roomId);
        }
    },
    whisper: function (client, message) {
        var clients = this.userService.getClients();
        var paramArray = message.split(" ");
        if (paramArray.length > 2) {
            var clientToSend = null;
            var nameToWhisper = paramArray[1];
            for (var i = 0; i < clients.length; i++) {
                if (clients[i].nickname === nameToWhisper) {
                    clientToSend = clients[i];
                    break;
                }
            }
            if (clientToSend !== null) {
                paramArray.splice(0, 2);
                messageToSend = paramArray.join(" ");
                whisperToUser(client, clientToSend, messageToSend);
                ackWhisper(client, clientToSend, messageToSend);
            }
        }
    },
    ackNameChange: function (client, oldName) {
        var message = oldName + " ändert den Namen auf '" + client.nickname + "'.";
        this.sendMessage("System", message, "message", client.roomId);
    },
    sendRoomInfo: function (client, room) {
        var clientSocket = client.ws;
        if (room !== false && clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
                "name": "Raum",
                "message": room.description,
                "type": "roominfo"
            }));
        }
    }
    
};

function addMarkup(inMessage) {
    var message = inMessage.replace(/\*{2}/g, "doublestarmarkupshit");
    var message = message.replace(/_{2}/g, "doubleunderscoremarkupshit");
    message = markdown.toHTML(message);
    message = message.replace(/doublestarmarkupshit/g, "*");
    message = message.replace(/doubleunderscoremarkupshit/g, "_");
    return message;
}

function whisperToUser(client, clientToSend, messageToSend) {
    var clientSocket = clientToSend.ws;
    if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
            "name": client.nickname,
            "message": messageToSend,
            "type": "whisper"
        }));
    }
}

function ackWhisper(client, clientToSend, messageToSend) {
    var clientSocket = client.ws;
    if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(JSON.stringify({
            "name": clientToSend.nickname,
            "message": messageToSend,
            "type": "whisperAcc"
        }));
    }
}