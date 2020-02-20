'use strict';

const co = require("co");
const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const Mustache = require('mustache');
const http = require('superagent-promise')(require('superagent'), Promise);
const aws4 = require('aws4');
const URL = require('url');
const awscred = Promise.promisifyAll(require('awscred'));

const awsRegion = process.env.AWS_REGION;
const cognitoUserPoolId = process.env.cognito_user_pool_id;
const cognitoClientId = process.env.cognito_client_id;

const restaurantsApiRoot = process.env.restaurants_api;
const days = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

var html;

function* loadHtml() {
  if (!html) {
    html = yield fs.readFileAsync('static/index.html', 'utf-8');
  }

  return html;
}

function* getRestaurants() {
   //This to access to API that it has AWS_IAM authorization
  //we'll create an object with the information we need to sign the request.
  let url = URL.parse(restaurantsApiRoot);
  let opts = {
    host: url.hostname,
    path: url.pathname
  }
  if (!process.env.AWS_ACCESS_KEY_ID) {
      //the AWS 4 library that we used to sign our HTTP request doesn't work with AWS profiles. 
    //So, unfortunately, we have to install another dependency, awscred, and use it to load the credentials from our profile and then set the environment variables manually.
    let cred = (yield awscred.loadAsync()).credentials;

    process.env.AWS_ACCESS_KEY_ID = cred.accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = cred.secretAccessKey;

    if(cred.sessionToken) {
      process.env.AWS_SESSION_TOKEN = cred.sessionToken;
    }
  }


  //we'll sign it with aws4.sign, which adds a bunch of headers to the opts object
  aws4.sign(opts);

  let httpReq = http
  .get(restaurantsApiRoot)
  .set('Host', opts.headers['Host'])
  .set('X-Amz-Date', opts.headers['X-Amz-Date'])
  .set('Authorization', opts.headers['Authorization']);
  //With regard to this last header, 'X-Amz-Security-Token' is only needed if you're using an assumed role with temporary credentials,
  if (opts.headers['X-Amz-Security-Token']) {
    httpReq.set('X-Amz-Security-Token', opts.headers['X-Amz-Security-Token']);
  }
  

  return (yield httpReq).body;
}

module.exports.handler = co.wrap(function* (event, context, callback) {
  let template = yield loadHtml();
  let restaurants = yield getRestaurants();
  let daysOfWeek = days[new Date().getDay()];
  let view = {
    daysOfWeek, 
    restaurants,
    awsRegion,
    cognitoUserPoolId,
    cognitoClientId,
    searchUrl: `${restaurantsApiRoot}/search`
  }
  let html = Mustache.render(template, view);

  const response = {
    statusCode: 200,
    body: html,
    headers: {
      'content-type': 'text/html; charset=UTF-8'
    }
  };

  callback(null, response);
});