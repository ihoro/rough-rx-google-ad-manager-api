# Rx Google Ad Manager API

[![Build Status](https://travis-ci.com/ihoro/rough-rx-google-ad-manager-api.svg?branch=master)](https://travis-ci.com/ihoro/rough-rx-google-ad-manager-api)
[![npm version](https://badge.fury.io/js/%40rough%2Frx-google-ad-manager-api.svg)](https://badge.fury.io/js/%40rough%2Frx-google-ad-manager-api)

A rough implementation of rxified Google Ad Manager API client

## Getting started

Installation
```
$ npm i @rough/rx-google-ad-manager-api
```

Create a test network
```js
const AdManager = require('@rough/rx-google-ad-manager-api');

const adManager = new AdManager({
  apiVersion: 'v201808',
  applicationName: 'my-app',
  googleJwtAuth: {
    client_email: 'me@example.com',
    private_key: '-----BEGIN PRIVATE KEY-----...',
    private_key_id: '...',
    project_id: 'my-project'
  }
});

adManager.api.NetworkService.makeTestNetwork().subscribe(
  result => console.log(reslt),
  err => console.log('ERROR' + err)
);
```

Get current user within a network
```js
const AdManager = require('@rough/rx-google-ad-manager-api');

const adManager = new AdManager({
  apiVersion: 'v201808',
  applicationName: 'my-app',
  networkCode: '01234567890',
  googleJwtAuth: {
    client_email: 'me@example.com',
    private_key: '-----BEGIN PRIVATE KEY-----...',
    private_key_id: '...',
    project_id: 'my-project'
  }
});

adManager.api.UserService.getCurrentUser().subscribe(
  result => console.log(reslt),
  err => console.log('ERROR' + err)
);
```
