'use strict';

const co = require('co');
const Promise = require('bluebird');
const aws4 = require('../../lib/aws4');

let initialized = false;

let init = co.wrap(function* () {
    if (initialized) {
        return;
    }

    process.env.restaurants_api = "https://8vbn7q18j4.execute-api.us-east-1.amazonaws.com/dev/restaurants";
    process.env.restaurants_table = "restaurants";
    process.env.AWS_REGION = "us-east-1";
    process.env.cognito_client_id = "test_cognito_client_id";
    process.env.cognito_user_pool_id = "us-east-1_SsqleMcdd";
    process.env.cognito_server_client_id = "3im4jk8rd0ct5lv45gpkv1bpgd";

    yield aws4.init();
 
    console.log("AWS credentials loaded");
    console.log("AWS access key id " + process.env.AWS_ACCESS_KEY_ID);
    console.log("AWS secret access key " + process.env.AWS_SECRET_ACCESS_KEY);
    console.log("AWS region " + process.env.AWS_REGION);

    initialized = true;
});

module.exports.init = init;