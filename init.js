
var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;
var fs = require('fs');
var config = require('./config/config');
var mysql = require('mysql2');

module.exports = {
    db: null,
    wss: null,
    getWss: function (){
        if (this.wss === null) {
            this.wss = initWss();
        }
        return this.wss;
    },
    getDb: function (){
        if (this.db === null) {
            this.db = initDb();
        }
        return this.db;
    }
};

function initWss() {
    if (config.serverConfig.ssl) {
        var httpsServ = require('https');
        var express = require('express');

        var privateKey = fs.readFileSync(config.serverConfig.ssl_key, 'utf8');
        var certificate = fs.readFileSync(config.serverConfig.ssl_cert, 'utf8');
        var credentials = {key: privateKey, cert: certificate};
        var app = express();

        var httpsServer = httpsServ.createServer(credentials, app);
        httpsServer.listen(config.serverConfig.port);
        var wss = new WebSocketServer({
            server: httpsServer
        });
    } else {
        var wss = new WebSocketServer({port: config.serverConfig.port});
    }
    return wss;
}

function initDb() {
    return mysql.createConnection(config.mysqlConfig);
}