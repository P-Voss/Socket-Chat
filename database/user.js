
module.exports = {
    db: null,
    
    saveChatname: function (client) {
        var sql = "UPDATE benutzerdaten SET chatname = ? WHERE benutzerdaten.userId = ? AND benutzerdaten.active = 1";
        this.db.execute(sql, [client.nickname, client.userId], function (err, result, fields) {
            return !err;
        });
    }
};

