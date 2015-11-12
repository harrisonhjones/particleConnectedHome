/**

Particle Alexa Connected Home Adapter for Lambda

Author:         Harrison Jones (harrison@hhj.me)
Date:           9/27/2015
Description:    Handles the disocvery and control of compatible Particle devices
Repository:     TBD

*/

// External Libraries
var https = require('https');                       // We need to make HTTPS calls against the Particle API
var Promise = require("bluebird");                  // We are using promises to make responding to the Lambda context easy
var log = log;                                      // Used for logging. 
var generateControlError = generateControlError;    // Used to tell Alexa about certain issues

// 'DEFINES'
var REMOTE_CLOUD_BASE_PATH = "/";
var REMOTE_CLOUD_HOSTNAME = "api.particle.io";
var SOFTWARE_VERSION = '1.0.0';
var DEVICE_MANUFACTURER_NAME = 'Harrison Jones';
var DEVICE_MODEL_NAME = 'Prototype';

/**
 * Main entry point.
 * Incoming events from Alexa Lighting APIs are processed via this method.
 */
exports.handler = function(event, context) {

    console.log("Particle Connected Home Version " + SOFTWARE_VERSION);

    // Warning! Logging this in production might be a security problem.
    log('Input', event);

    switch (event.header.namespace) {

        /**
         * The namespace of "Discovery" indicates a request is being made to the lambda for
         * discovering all appliances associated with the customer's appliance cloud account.
         * can use the accessToken that is made available as part of the payload to determine
         * the customer.
         */
        case 'Discovery':
            handleDiscovery(event, context);
        break;

        /**
         * The namespace of "Control" indicates a request is being made to us to turn a
         * given device on, off or brighten. This message comes with the "appliance"
         * parameter which indicates the appliance that needs to be acted on.
         */
        case 'Control':
            handleControl(event, context);
        break;

        /**
         * We received an unexpected message
         */
        default:
            // Warning! Logging this in production might be a security problem.
            log('Err', 'No supported namespace: ' + event.header.namespace);
            context.fail('Unexpected namespace');
        break;
    }
};


/**
 * Function:    httpGet
 * Description: Performs a HTTPS GET request.
 * Params:      
 *              basePath    the resource to load
 * Returns:     A Promise. If resolved the GETted response. If rejected the error
 */
function httpGet(basePath)
{
    // Generate a new promise for this function
    var deferred = Promise.defer();

    // Generate a wrapper function so we can effectively assign http timeouts
    var timeout_wrapper = function( req ) {
        return function( ) {
            // If we timeout abort the current http request & reject the promise
            req.abort( );
            deferred.reject('timeout');
        };
    };

    // Define a few important options
    var options = {
        hostname: REMOTE_CLOUD_HOSTNAME,
        port: 443,
        path: basePath,
        headers: {
            accept: '*/*' // Warning! Accepting all headers in production could lead to security problems.
        },
        method: 'GET'
    };

    // Define a callback function for http request
    var callback = function(response) {
        var str = '';

        // Save incoming http data
        response.on('data', function(chunk) {
            str += chunk.toString('utf-8');
            timeout = setTimeout( fn, 100 );
        });

        // When all data has been transmitted call the success callback
        response.on('end', function() {
            clearTimeout( timeout );
            //successCallback(str);
            deferred.resolve(str);
        });

        // On error call the failure callback
        response.on('error', function (e) {
            clearTimeout( timeout );
            deferred.resolve(e);
        });
    };

    // Setup a new http GET request
    var req = https.request(options, callback);

    // If we timeout abort the current http request & reject the promise
    req.on('error', function(e) {req.abort( ); deferred.reject(e);});

    // Create the timeout wrapper function variable
    var fn = timeout_wrapper( req );

    // Set the timeout. If the timeout variable isn't cleared within 2000 ms then abort the http request and reject the promise.
    var timeout = setTimeout( fn, 3000 );

    // Send out the http request.
    req.end();

    // Return the promise for this function.
    return deferred.promise;
}


/**
 * Function:    httpGet
 * Description: Performs a HTTPS POST request. Currently only used to call a function on a device
 * Params:      
 *              basePath    the resource to load
 *              params      the paramers to send in the POST
 * Returns:     A Promise. If resolved the function call's return value. If rejected the error
 */
function httpPost(basePath, params)
{
    console.log("HTTPS POSTing to ", basePath, "With params", params);

    var querystring = require('querystring');
    var postData = querystring.stringify(params);

    // Generate a new promise for this function
    var deferred = Promise.defer();

    // Generate a wrapper function so we can effectively assign http timeouts
    var timeout_wrapper = function( req ) {
        return function( ) {
            // If we timeout abort the current http request & reject the promise
            req.abort( );
            deferred.reject('timeout');
        };
    };

    // Define a few important options
    var options = {
        hostname: REMOTE_CLOUD_HOSTNAME,
        port: 443,
        path: basePath,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        },
        method: 'POST'
    };

    // Define a callback function for http request
    var callback = function(response) {
        var str = '';

        // Save incoming http data
        response.on('data', function(chunk) {str += chunk.toString('utf-8');});

        // When all data has been transmitted call the success callback
        response.on('end', function() {
            clearTimeout( timeout );
            //successCallback(str);

            // console.log("HTTP POST. Response = ", str);

            var parsedResponse = JSON.parse(str);

            if('return_value' in parsedResponse)
            {
                deferred.resolve(parsedResponse['return_value']);
            }
            else
            {
                deferred.reject("Bad return value: " + str);
            }
            
        });

        // On error call the failure callback
        response.on('error', function (e) {
            clearTimeout( timeout );
            deferred.reject(e);
        });
    };

    // Setup a new http GET request
    var req = https.request(options, callback);

    // If we timeout abort the current http request & reject the promise
    req.on('error', function(e) {req.abort( ); deferred.reject(e);});

    // Create the timeout wrapper function variable
    var fn = timeout_wrapper( req );

    // Set the timeout. If the timeout variable isn't cleared within 2000 ms then abort the http request and reject the promise.
    var timeout = setTimeout( fn, 2000 );

    // Send out the http request.
    req.write(postData);
    req.end();

    // Return the promise for this function.
    return deferred.promise;
}

/**
 * Function:    getDevices
 * Description: Gets all compatible devices (appliances) on the account. First gets the raw devices then gets and parses the 'achStr' variable on the device
 * Params:      
 * Returns:     A Promise. Resolves to be the appliance array
 */
function getDevices(accessToken)
{
    // Define a function for grabbing device variables
    var getDeviceVariable = function (deviceID, variableName)
    {
        // Generate a new promise for this function
        var deferred = Promise.defer();

        var successCB = function(str) {
            console.log("\tGetting '" + variableName + "' for '" + deviceID + "' - SUCCESS:");
            
            console.log(str);
            //console.log(JSON.parse(str));

            var response = JSON.parse(str);

            if(response.cmd)
            {

                var responseVal = JSON.parse(response.result);
                var responseDevices = responseVal.devices;
                //console.log(responseDevices.length);
                //console.log(responseDevices[0]);

                console.log("Found " + responseDevices.length + " devices");

                for (var i = 0; i < responseDevices.length; i++)
                {
                    var applianceDiscovered = {
                        applianceId: deviceID + '-' + (responseDevices[i].n || ("MISSING-" + i.toString())),
                        manufacturerName: responseVal.mfn || "Missing Manufacturer Name",
                        modelName: responseVal.mdn || "Missing Model Name",
                        version: responseVal.v || "Missing Version String",
                        friendlyName: responseDevices[i].fn || "Missing Friendly Name",
                        friendlyDescription: responseDevices[i].fd || 'Missing Description',
                        isReachable: true,
                        additionalApplianceDetails: {}
                    };
                    appliances.push(applianceDiscovered);
                    console.log("Device #" + i, applianceDiscovered);
                    
                }
                //console.log(appliances);
            }
            deferred.resolve();
        };

        var failureCB = function(e) {
            console.log("\tGetting '" + variableName + "' for '" + deviceID + "' - FAILURE:");
            console.log(e);
            //console.error(e.stack);

            deferred.resolve(e);
        };

        var basePath = REMOTE_CLOUD_BASE_PATH + 'v1/devices/' + deviceID + '/' + variableName + '?access_token=' + accessToken;
        
        console.log("URL: " + REMOTE_CLOUD_HOSTNAME + basePath);

        httpGet(basePath).then(successCB).catch(failureCB);

        return deferred.promise;
    }

    // Create a new promise for this function
    var deferred = Promise.defer();
    
    // Create a variable to hold all the appliances
    var appliances = [];

    // Create a variable to hold the promises for reach variable getting function
    var deviceVarPromises = [];

    // A function when the http function is called successfully. Should probably be a promise in the future
    var successCB = function(str) {
        //console.log("Success");
        //console.log(str);

        var devices = JSON.parse(str);

        //deferred.resolve(str);

        for (var i = 0; i < devices.length; i++) {
            // Push all the variable getting functions into a function array.   
            //deviceVarPromises.push(function () {console.log("Getting var for " + devices[i].id)});
            //deviceVarPromises.push(getDeviceVariable(devices[i].id, "achStr"));

            if(devices[i].connected == true)
            {
                deviceVarPromises.push(getDeviceVariable(devices[i].id, "achStr"));
            }
            //{
            //    console.log("Device # " + i);
            //    console.log(devices[i]);
            //    getDeviceVariable(devices[i].id, 'achStr');
            
        }

        Promise.all(deviceVarPromises).then(function() {
            console.log("GET VARIABLES - SUCCESS");
            console.log("Appliances", appliances);
            deferred.resolve(appliances);
        });

        
    };

    // A function when the http function fails. Should probably be a promise in the future
    var failureCB = function(e) {
        console.log("GET VARIABLES - FAILURE");
        deferred.reject(e);
    };

    var basePath = REMOTE_CLOUD_BASE_PATH + 'v1/devices?access_token=' + accessToken;
    
    httpGet(basePath).then(successCB).catch(failureCB);

    // Return the promise so it can be tracked
    return deferred.promise;
}

function handleDiscovery(event, context) {

    var accessToken = event.payload.accessToken.trim();
    log('access_token', accessToken);

    getDevices(accessToken).then(function (val) {
        console.log('GET DEVICE - SUCCESS');
        /**
         * Crafting the response header. Required.
         */
        var headers = {
            namespace: 'Discovery',
            name: 'DiscoverAppliancesResponse',
            payloadVersion: '1'
        };
        /**
         * Response body will be an array of discovered devices.
         */
        //var appliances = val;
        var appliances = val;

        // Add a dummy appliance
        /*var applianceDiscovered = {
            applianceId: 'e145-4062-b31d-7ec2c146c5ea',
            manufacturerName: 'DummyInfo',
            modelName: 'ST01',
            version: 'VER01',
            friendlyName: 'Dummy light',
            friendlyDescription: 'the light in kitchen',
            isReachable: true,
            additionalApplianceDetails: {}
        };
        appliances.push(applianceDiscovered);*/

        console.log('Appliances', appliances);
        /**
         * Craft the final response back to Alexa Connected Home Skill. This will include all the 
         * discovered appliances.
         */
        var payloads = {
            discoveredAppliances: appliances
        };
        var result = {
            header: headers,
            payload: payloads
        };

        // Warning! Logging this in production might be a security problem.
        log('Discovery', result);

        console.log(payloads);

        context.succeed(result);

    }).catch(function (val) {
        console.log('GET DEVICE - FAILED');
        console.log(val);
        context.fail(val);
    });
}

/**
 * Control events are processed here.
 * This is called when Alexa requests an action (IE turn off appliance).
 */
function handleControl(event, context) {

    /**
     * Fail the invocation if the header is unexpected. This example only demonstrates
     * turn on / turn off, hence we are filtering on anything that is not SwitchOnOffRequest.
     */
    if (event.header.namespace !== 'Control' || event.header.name !== 'SwitchOnOffRequest') {
        context.fail(generateControlError('SwitchOnOffRequest', 'UNSUPPORTED_OPERATION', 'Unrecognized operation'));
    }

    if (event.header.namespace === 'Control' && event.header.name === 'SwitchOnOffRequest') {

        /**
         * Retrieve the appliance id and accessToken from the incoming message.
         */
        var applianceId = event.payload.appliance.applianceId.split("-");
        var accessToken = event.payload.accessToken;
        
        if ((typeof accessToken !== "string")||(applianceId.length != 2)) {
            log("event payload is invalid");
            context.fail(generateControlError('SwitchOnOffRequest', 'UNEXPECTED_INFORMATION_RECEIVED', 'Input is invalid'));
        }

        accessToken = accessToken.trim();
        var deviceID = applianceId[0];
        var deviceSubId = applianceId[1];
        var deviceState = '-1';

        if (event.payload.switchControlAction === 'TURN_ON')
            deviceState = '1';
        else
            deviceState = '0';

        log('applianceId', applianceId);
        log('access_token', accessToken);
        log('deviceID', deviceID);
        log('deviceSubId', deviceSubId);
        log('deviceState', deviceState);

        httpPost("/v1/devices/" + deviceID + "/control", {access_token:accessToken,arg:deviceSubId + '.' + deviceState}).then(function (val) {
            console.log('POST DEVICE - SUCCESS');
            var headers = {
                namespace: 'Control',
                name: 'SwitchOnOffResponse',
                payloadVersion: '1'
            };
            var payloads = {
                success: true
            };
            var result = {
                header: headers,
                payload: payloads
            };
            
            // Warning! Logging this with production data might be a security problem.
            log('Done with result', result);
            context.succeed(result);
        }).catch(function (val) {
            console.log('POST DEVICE - FAILED');
            log('Error', val);
            /**
             * Craft an error response back to Alexa Connected Home Skill
             */
            context.fail(generateControlError('SwitchOnOffRequest', 'DEPENDENT_SERVICE_UNAVAILABLE', 'Unable to connect to server'));
        });
    }
}

/**
 * Utility functions.
 */
function log(title, msg) {
    console.log('*************** ' + title + ' *************');
    console.log(msg);
    console.log('*************** ' + title + ' End*************');
}

function generateControlError(name, code, description) {
    var headers = {
        namespace: 'Control',
        name: name,
        payloadVersion: '1'
    };

    var payload = {
        exception: {
            code: code,
            description: description
        }
    };

    var result = {
        header: headers,
        payload: payload
    };

    return result;
}