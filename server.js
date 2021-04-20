const { audio } = require('system-control');
const loudness  = require('loudness');
const brightness = require('brightness');
var QRCode = require('qrcode');
var os = require("os");
const si = require('systeminformation');

var fs = require("fs"); //need to read static files
var url = require("url"); //to parse url strings

var counter = 1000; //to count invocations of function(req,res)

var ROOT_DIR = "html"; //dir to serve static files from
var percentageCPU = 0;

var MIME_TYPES = {
    css: "text/css",
    gif: "image/gif",
    htm: "text/html",
    html: "text/html",
    ico: "image/x-icon",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    js: "text/javascript", //should really be application/javascript
    json: "application/json",
    png: "image/png",
    txt: "text/plain"
};

var get_mime = function(filename) {
    var ext, type;
    for (ext in MIME_TYPES) {
        type = MIME_TYPES[ext];
        if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
            return type;
        }
    }
    return MIME_TYPES["txt"];
};

var server = require('http')
    .createServer(function(request, response) {
        var urlObj = url.parse(request.url, true, false);
        //console.log("\n============================");
        //console.log("PATHNAME: " + urlObj.pathname);
        //console.log("REQUEST: " + ROOT_DIR + urlObj.pathname);
        //console.log("METHOD: " + request.method);

        var receivedData = "";

        //attached event handlers to collect the message data
        request.on("data", function(chunk) {
            receivedData += chunk;
        });

        //event handler for the end of the message
        request.on("end", function() {

            //if it is a POST request then echo back the data.
            if (request.method == "POST") {
                var dataObj = JSON.parse(receivedData);

                console.log("USER REQUEST: " + dataObj.text);
                var returnObj = {};

                if(dataObj.text =="QRCode"){
                    var returnObj = {};
                    'use strict';

                    const { networkInterfaces } = require('os');

                    const nets = networkInterfaces();
                    const results = Object.create(null); // Or just '{}', an empty object

                    for (const name of Object.keys(nets)) {
                        for (const net of nets[name]) {
                            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                            if (net.family === 'IPv4' && !net.internal) {
                                if (!results[name]) {
                                    results[name] = [];
                                }
                                results[name].push(net.address);
                            }
                        }
                    }
                    console.log(results["en0"][0]);

                    QRCode.toDataURL("http://"+results["en0"][0] + ":3000/Proformance.html", function (err, url){
                        returnObj.text = url;
                        response.end(JSON.stringify(returnObj));
                    });
                }

                else if(dataObj.text == "cpuUsage"){
                    getCpuUsage(response);

                }
                else if (dataObj.text == "cpuInfo"){
                    getCpuInfo(response);

                }
                else if (dataObj.text == "memoryInfo"){
                    getMemoryInfo(response);
                }
                else if(dataObj.text == "getSoundAndDisplayInfo"){
                    getSoundAndDisplayInfo(response);
                }

                else if(dataObj.text == "setSoundVolume"){
                    setSystemSoundVolume(response, dataObj.value);
                }

                else if(dataObj.text == "setBrightness"){
                    setBrightness(response, dataObj.value);
                }
                else if(dataObj.text == "networkInfo"){
                    getNetworkInfo(response);
                }
                else if(dataObj.text =="networkUsage"){
                    getNetworkUsage(response);
                }
                else if(dataObj.text == "shutdownServer"){
                    shutdownServer();
                }

            }

            if (request.method == "GET") {
                //handle GET requests as static file requests
                var filePath = ROOT_DIR + urlObj.pathname;
                if (urlObj.pathname === "/") filePath = ROOT_DIR + "/index.html";

                fs.readFile(filePath, function(err, data) {
                    if (err) {
                        //report error to console
                        console.log("ERROR: " + JSON.stringify(err));
                        //respond with not found 404 to client
                        response.writeHead(404);
                        response.end(JSON.stringify(err));
                        return;
                    }
                    response.writeHead(200, { "Content-Type": get_mime(filePath) });
                    response.end(data);
                });
            }
        });
    }).listen(3000);






//Create function to get CPU information
function cpuAverage() {

    //Initialise sum of idle and time of cores and fetch CPU info
    var totalIdle = 0, totalTick = 0;
    var cpus = os.cpus();

    //Loop through CPU cores
    for(var i = 0, len = cpus.length; i < len; i++) {

        //Select CPU core
        var cpu = cpus[i];

        //Total up the time in the cores tick
        for(type in cpu.times) {
            totalTick += cpu.times[type];
        }

        //Total up the idle time of the core
        totalIdle += cpu.times.idle;
    }

    //Return the average Idle and Tick times
    return {idle: totalIdle / cpus.length,  total: totalTick / cpus.length};
}

function cpuUsage (){
    //Grab first CPU Measure
    var startMeasure = cpuAverage();

//Set delay for second Measure
    setTimeout(function() {

        //Grab second Measure
        var endMeasure = cpuAverage();

        //Calculate the difference in idle and total time between the measures
        var idleDifference = endMeasure.idle - startMeasure.idle;
        var totalDifference = endMeasure.total - startMeasure.total;

        //Calculate the average percentage CPU usage
        percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);

    }, 100);
    return percentageCPU;
}

async function getCpuUsage(response) {
    var returnObj = {};
    cpuTemperObj = await si.cpuTemperature();
    returnObj.text1 = "53";
    returnObj.text0 = cpuUsage();
    response.end(JSON.stringify(returnObj));


}

async function getCpuInfo(response) {
    var returnObj = {};

    var cpuInfoObj = await si.cpu();

    returnObj.text0 = cpuInfoObj.manufacturer;
    returnObj.text1 = cpuInfoObj.brand;
    returnObj.text2 = cpuInfoObj.speed;
    returnObj.text3 = cpuInfoObj.socket;
    returnObj.text4 = cpuInfoObj.physicalCores;
    returnObj.text5 = cpuInfoObj.cores;
    response.end(JSON.stringify(returnObj));

}

async function getMemoryInfo(response) {
    var returnObj = {};
    var memInfoObj = await si.mem();

    returnObj.text0 = memInfoObj.total;
    returnObj.text1 = memInfoObj.active;
    returnObj.text2 = memInfoObj.free;
    returnObj.text3 = memInfoObj.used;
    returnObj.text4 = memInfoObj.swapused;
    returnObj.text5 = memInfoObj.swapfree;
    response.end(JSON.stringify(returnObj));

}

async function getSoundAndDisplayInfo(response) {
    var returnObj = {};
    displayObj = await si.graphics();
    returnObj.text0= await loudness.getVolume();
    returnObj.text1 = await brightness.get()*100;
    returnObj.text2 = displayObj.controllers[0].model;
    returnObj.text3 = displayObj.controllers[0].bus;
    returnObj.text4 = displayObj.displays[0].currentResX + "X" + displayObj.displays[0].currentResY;
    returnObj.text5 = displayObj.displays[0].model;
    returnObj.text6 = displayObj.displays[0].connection;
    response.end(JSON.stringify(returnObj));
}


async function setSystemSoundVolume(response, vol){
    var returnObj = {};
    try{
        await loudness.setVolume(vol);
        returnObj.text = "success"
    }
    catch (e) {
        returnObj.text = "fail"
    }
    response.end(JSON.stringify(returnObj));
}



async function setBrightness(response, vol){
    var returnObj = {};
    vol = vol / 100;
    try{
        await brightness.set(vol)
        returnObj.text = "success"
    }
    catch (e) {
        console.log(e)
        returnObj.text = "fail"
    }
    response.end(JSON.stringify(returnObj));
}

async function getNetworkInfo(response) {
    var defaultInterface = await si.networkInterfaceDefault();
    var networkInfoObj = await si.networkInterfaces();

    var returnObj = {};

    for(let i of networkInfoObj){
        if(i.iface == defaultInterface){
            console.log(i)
            returnObj.text0 = i.ip4;
            returnObj.text1 = i.ip6;
            returnObj.text2 = i.type;
            returnObj.text3 = i.speed;
            returnObj.text4 = i.virtual;
        }
    }
    response.end(JSON.stringify(returnObj));
}

async function getNetworkUsage(response) {
    let networkUsageObj = await si.networkStats();
    let ping = await si.inetChecksite('google.com');
    let returnObj = {};

    returnObj.text0 = networkUsageObj[0].tx_sec;
    returnObj.text1 = networkUsageObj[0].rx_sec;
    returnObj.text2 = ping.ms;
    console.log(returnObj);
    response.end(JSON.stringify(returnObj));

}

function shutdownServer() {
    server.close();
    console.log("server has been successfully shutdwon")
}

require('openurl').open("http://localhost:3000/userGuide.html");


