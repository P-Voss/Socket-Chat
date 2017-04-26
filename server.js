
var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;
var uuid = require('node-uuid');
var fs = require('fs');
var _ = require('lodash')._;

var init = require('./init');

var messageService = require('./message/message');
var userService = require('./user/user');
messageService.userService = userService;

var userMapper = require('./database/user');
var messageMapper = require('./database/message');

var clients = [];
var connection = init.getDb();
userMapper.db = connection;
messageMapper.db = connection;

messageService.messageMapper = messageMapper;
userService.userMapper = userMapper;

var wss = init.getWss();
wss.on('connection', function (ws) {
    var client_uuid = uuid.v4();
    clients.push({
        "id": client_uuid,
        "userId": null,
        "ws": ws,
        "nickname": "",
        "isAdmin": false,
        "roomId": 1
    });
    userService.clients = clients;
    
    var updateRoomList = function(roomlist) {
        var client = userService.getClientByUUID(client_uuid);
        if (client !== false) {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({
                    "message": roomlist,
                    "type": "roomlist"
                }));
            }
        }
    };
    var switchRoom = function (message, rooms) {
        var roomId = /^([1-9{1}][\d]*)$/.exec(message);
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].roomId === parseInt(roomId[1]) || rooms[i].roomId === message) {
                var changeRoom = rooms[i];
                for (var i = 0; i < clients.length; i++) {
                    if (clients[i].id === client_uuid) {
                        var oldRoomId = clients[i].roomId;
                        clients[i].roomId = changeRoom.roomId;
                        sendExitMessageRoom(clients[i], oldRoomId);
                        sendJoinMessage(clients[i], changeRoom);
                        updateUserList(changeRoom.roomId);
                        updateUserList(oldRoomId);
                        messageService.sendRoomInfo(clients[i], changeRoom);
                        break;
                    }
                }
                break;
            }
        }
    };
    
    selectRoomlist(updateRoomList);
    
    ws.on('message', function (message) {
        var commandMessage = false;
        var client = userService.getClientByUUID(client_uuid);

        if (message.indexOf('/init') === 0) {
            commandMessage = true;
            var idArray = message.split(" ");
            if (idArray.length >= 2) {
                if (userService.userAlreadyInChat(idArray[1])) {
                    userService.forceExit(client, function(){
                        messageService.systemMessageToClient("You are already connected to the chat.", client);
                    });
                } else {
                    client.userId = idArray[1];
                    initUserData(client);
                    selectRoomlist(function(rooms) {
                        messageService.sendRoomInfo(client, getRoomById(1, rooms));
                    });
                    messageService.systemMessageToClient("Welcome, have fun!", client);
                }
            }
        }

        if (message.indexOf('/nick') === 0) {
            commandMessage = true;
            var oldName = client.nickname;
            userService.changeNickname(client, message);
            if (client.nickname !== oldName) {
                messageService.ackNameChange(client, oldName);
                userService.clients = clients;
                updateUserList(client.roomId);
            }
        }

        if (message.indexOf('/dice') === 0) {
            commandMessage = true;
            rollDice(client, message);
        }

        if (message.indexOf('/coin') === 0) {
            commandMessage = true;
            coinflip(client);
        }

        if (message.indexOf('/msg') === 0) {
            commandMessage = true;
            messageService.whisper(client, message);
        }

        if (message.indexOf('/join') === 0) {
            commandMessage = true;
            var messageArray = message.split(" ");
            if (messageArray.length > 1) {
                selectRoomlist(function(rooms){
                    switchRoom(messageArray[1], rooms);
                });
            }
        }

        if (message.indexOf('@') === 0) {
            commandMessage = true;
            messageService.directMessage(client, message);
        }

        if (message.indexOf('/adminmsg') === 0) {
            commandMessage = true;
            if (client.isAdmin) {
                messageService.broadcastMessage(client.nickname, message.substring(10), 'message');
            }
        }

        if (!commandMessage) {
            messageService.sendMessage(client.nickname, message, 'message', client.roomId);
        }

    });

    ws.on('close', function () {
        var exitClient = null;
        for (var i = 0; i < clients.length; i++) {
            if (clients[i].id === client_uuid) {
                exitClient = clients[i];
                clients.splice(i, 1);
            }
        }
        if (exitClient !== null) {
            updateUserList(exitClient.roomId);
            userService.clients = clients;
            sendExitMessage(exitClient);
        }
    });


});

/**
 * @param {Object} client
 * @returns void
 * 
 * Checks the database for the clients userId
 * Sets clients data to default values if the query fails or returns an empty result
 * 
 * Triggers entry text for new client and update of userlist
 */
function initUserData(client) {
    var sql = "SELECT chatname AS nickname, usergroup \n\
                FROM users\n\
                WHERE userId = ? AND isActive = 1";
    connection.execute(sql, [client.userId], function (err, result, fields) {
        if (!err) {
            if (result[0] == null) {
                client.nickname = "Guest";
                client.isAdmin = false;
            } else {
                client.nickname = result[0].nickname;
                client.isAdmin = result[0].usergruppe === "Admin";
            }
        } else {
            client.nickname = "Guest";
            client.isAdmin = false;
            console.log("Error in: initUserData");
        }
        sendIntroMessage(client);
        updateUserList(1);
    });
}

/**
 * @param {function} cbFunction
 * @returns void
 * 
 * Checks the database for rooms
 * Creates a default room if the query fails or returns an empty result
 * 
 * Triggers callback with the rooms as argument
 */
function selectRoomlist(cbFunction) {
    var sql = "SELECT * FROM chatRooms";
    var rooms = [];
    connection.query(sql, function(err, result, fields) {
        if (!err) {
            if (result[0] == null) {
                rooms.push(getDefaultRoom());
            } else {
                for (var i = 0; i < result.length; i++) {
                    rooms.push({
                        "roomId": result[i].roomId,
                        "name": result[i].name,
                        "isHidden": result[i].isHidden === 1,
                        "creator": result[i].creator,
                        "description": result[i].description,
                        "entryMessage": result[i].entryMessage
                    });
                }
            }
        } else {
            rooms.push(getDefaultRoom());
        }
        if (typeof cbFunction === "function") {
            cbFunction(rooms);
        }
    });
}

function getDefaultRoom() {
    return {"roomId": 1, "name": "Lobby", "isHidden": false, "creator": 0, 
            "description": "Currently this is the only room in this chat.", "entryMessage": "Hello"};
}

function getRoomById(roomId, rooms) {
    for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].roomId === roomId) {
            return rooms[i];
        }
    }
    return false;
}

function sendIntroMessage(client) {
    var message = "User " + client.nickname + " entered the chat";
    messageService.sendMessage("System", message, "message", client.roomId);
}

function sendExitMessage(client) {
    var message = "User " + client.nickname + " left the chat";
    messageService.sendMessage("System", message, "message", client.roomId);
}

function sendExitMessageRoom(client, oldRoomId) {
    var message = "User " + client.nickname + " left the room";
    messageService.sendMessage("System", message, "message", oldRoomId);
}

function sendJoinMessage(client, changeRoom) {
    var message = client.nickname + " entered the room " + changeRoom.name;
    messageService.sendMessage("System", message, "message", changeRoom.roomId);
}

function updateUserList(roomId) {
    var clientList = [];
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].roomId === roomId) {
            clientList.push({
                "nickname": clients[i].nickname,
                "isAdmin": clients[i].isAdmin
            });
        }
    }
    for (var i = 0; i < clients.length; i++) {
        var clientSocket = clients[i].ws;
        if (clientSocket.readyState === WebSocket.OPEN
                && clients[i].roomId === roomId) {
            clientSocket.send(JSON.stringify({
                "message": clientList,
                "type": "userlist"
            }));
        }
    }
}


// --------------------------------------
// --- functions called by user input ---
// --------------------------------------


/**
 * @param {Object} client
 * @param {String} inMessage
 * @returns {void}
 */
function rollDice(client, inMessage) {
    var diceSpecs = /(\d*)w(\d*)/.exec(inMessage);
    if (diceSpecs !== null) {
        var maxPoints = diceSpecs[2] < 2 ? 2 : diceSpecs[2];
        if (diceSpecs[1] > 1 && diceSpecs[1] < 10) {
            var sum = 0;
            var message = client.nickname + " rolls " + diceSpecs[1] + " " + maxPoints + "-sided dices: ";
            for (var i = 0; i < diceSpecs[1]; i++) {
                var points = dice(maxPoints);
                sum += points;
                message += points;
                if (i < diceSpecs[1] - 1) {
                    message += ", ";
                } else {
                    message += ".";
                }
            }
            message += " Sum: " + sum;
        } else {
            var message = client.nickname + " rolls a " + maxPoints + "-sided dice: " + dice(maxPoints);
        }
    } else {
        var message = client.nickname + " rolls a dice: " + dice(6);
    }
    messageService.sendMessage("System", message, "message", client.roomId);
}

function dice(maxPoints) {
    return Math.floor(Math.random() * maxPoints) + 1;
}

function coinflip(client) {
    var headsTails = dice(2) === 1 ? "Head" : "Tail";
    var message = client.nickname + " throws a coin... : " + headsTails;
    messageService.sendMessage("System", message, "message", client.roomId);
}
