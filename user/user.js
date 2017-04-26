
module.exports = {
    userMapper: null,
    clients: [],
    getClients: function () {
        return this.clients;
    },
    getClientsByRoom: function (roomId) {
        var result = [];
        for (var i = 0; i < this.clients.length; i++) {
            if (this.clients[i].roomId === roomId) {
                result.push(this.clients[i]);
            }
        }
        return result;
    },
    getClientByUUID: function (uuid) {
        for (var i = 0; i < this.clients.length; i++) {
            if (this.clients[i].id === uuid) {
                return this.clients[i];
            }
        }
        return false;
    },
    userAlreadyInChat: function (userId) {
        for (var i = 0; i < this.clients.length; i++) {
            if (this.clients[i].userId === userId) {
                return true;
            }
        }
        return false;
    },
    changeNickname: function (client, message) {
        var nicknameArray = message.split(" ");
        if (nicknameArray.length >= 2) {
            if (client !== false) {
                var newName = nicknameArray[1].length > 32 ? nicknameArray[1].substring(0, 32) : nicknameArray[1];
                client.nickname = newName;
                this.userMapper.saveChatname(client);
            }
        }
    },
    forceExit: function (client, messageCallback) {
        for (var i = 0; i < this.clients.length; i++) {
            if (this.clients[i].id === client.id) {
                this.clients.splice(i, 1);
            }
        }
        if (typeof messageCallback === "function") {
            messageCallback();
        }
    }
    
};
