#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');

var cuRest = require('./cu-rest.js');
var config = require('./cu-chatbot.cfg');

/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           n.kill();
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/test'] = function(req, res) {
            var hatcheryScore = 'Score for Hatchery';

            res.setHeader('Content-Type', 'text/html');
            res.send('test');
        };

        self.routes['/'] = function(req, res) {
            server = {};
            pageContent = "";
            config.servers.forEach(function(s) {
                server[s.name] = s;

                rAPI = new cuRest({server: s.name});
                rAPI.getControlGame(null, function(data, error) {
                    if (! error) {
                        var artScore = data.arthurianScore;
                        var tuaScore = data.tuathaDeDanannScore;
                        var vikScore = data.vikingScore;
                        var timeLeft = data.timeLeft;
                        var minLeft = Math.floor(timeLeft / 60);
                        var secLeft = Math.floor(timeLeft % 60);
                        if (data.gameState === 1) {
                            var gameState = "Waiting For Next Round";                
                        } else if (data.gameState === 2) {
                            var gameState = "Basic Game Active";                
                        } else if (data.gameState === 3) {
                            var gameState = "Advanced Game Active";                
                        }


                        server[s.name].score = "There is currently " + minLeft + " minutes and " + secLeft + " seconds left in the round." + "<br />&nbsp;" +
                            "<br /><b>Game State:</b> " + gameState +
                            "<br /><b>Arthurian Score:</b> " + artScore +
                            "<br /><b>TuathaDeDanann Score:</b> " + tuaScore +
                            "<br /><b>Viking Score:</b> " + vikScore;

                        pageContent = pageContent + '<tr><center><b>' + s.name + '</b></center></tr>'
                                '<tr><td width="50%" bgcolor="#606060" style="border-style:groove; border-color:#C0C0C0">' +
                                '<center><b>Current Score</b></center>' +
                                server[s.name].score +
                                '</td><td width="50%" bgcolor="#606060" style="border-style:groove; border-color:#C0C0C0">' +
                                '<center><b>Leader Board</b></center>' +
                                '##LEADERBOARD##' +
                                '</td></tr>';

                    } else {
                        server[s.name].score = "Error accessing API. Server may be down.";
                    }
                });
            });

            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html').toString().replace('##PAGECONTENT##', pageContent));
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express.createServer();

        self.app.use('/images', express.static(__dirname+'/images'));

        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();

var n = require('child_process').fork(__dirname + '/cu-chatbot.js');
