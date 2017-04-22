
module.exports = {
    db: null,
    
    saveChatname: function (client) {
        var sql = "UPDATE users SET chatname = ? WHERE userId = ? AND isActive = 1";
        this.db.execute(sql, [client.nickname, client.userId], function (err, result, fields) {
            return !err;
        });
    }
};

