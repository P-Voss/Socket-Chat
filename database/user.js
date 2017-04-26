
module.exports = {
    db: null,
    
    saveChatname: function (client) {
        if (this.db === null) {
            console.log("usermapper missing.");
        }
        var sql = "UPDATE users SET chatname = ? WHERE userId = ?";
        this.db.execute(sql, [client.nickname, client.userId], function (err, result, fields) {
            if (err) {
                console.log("Failed to update the chatname.");
            }
        });
    }
};

