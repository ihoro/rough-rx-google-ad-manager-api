'use strict';

const soap = require('soap');
const { auth } = require('google-auth-library');
const { of, from } = require('rxjs');
const { map, flatMap, tap } = require('rxjs/operators');

module.exports = class AdManager {
  constructor(conf) {
    this.conf = conf;
    this.api = new Proxy({}, {
      get: (_, serviceName) => {
        return new Proxy({}, {
          get: (_, methodName) => {
            return (...args) => this.request(serviceName, methodName, args);
          }
        });
      }
    });
    this.credentials = null;
    this.soapClients = {};
  }

  _authorize() {
    if (this.credentials !== null)
      if (this.credentials.expiry_date > Date.now()) {
        return of(this.credentials);
      }

    return of(this).pipe(
      map(_ => auth.fromJSON(this.conf.jwtAuth)),
      tap(authClient => authClient.scopes = ['https://www.googleapis.com/auth/dfp']),
      flatMap(authClient => from(authClient.authorize())),
      tap(r => this.credentials = r),
    );
  }

  _getSoapClient(serviceName) {
    const soapClient = this.soapClients[serviceName];
    if (soapClient) {
      soapClient.setSecurity(new soap.BearerSecurity(this.credentials.access_token));
      return of(soapClient);
    }

    return of(this).pipe(
      flatMap(_ => from(soap.createClientAsync(`https://ads.google.com/apis/ads/publisher/${this.conf.apiVersion}/${serviceName}?wsdl`))),
      tap(soapClient => {
        soapClient.addSoapHeader(this.formSoapHeaders());
        soapClient.setSecurity(new soap.BearerSecurity(this.credentials.access_token));
        this.soapClients[serviceName] = soapClient;
      }),
    );
  }

  request(serviceName, methodName, args) {
    let credentials = null;
    return of(this).pipe(
      flatMap(_ => this._authorize()),
      tap(r => credentials = r),
      flatMap(_ => this._getSoapClient(serviceName)),
      flatMap(soapClient => from(soapClient[methodName + 'Async'](...args))), // TODO: add error verbosity to understand what methodName failed
      map(result => result[0]),
    );
  }

  formSoapHeaders() {
    return {
      RequestHeader: {
        attributes: {
          'soapenv:actor': 'http://schemas.xmlsoap.org/soap/actor/next',
          'soapenv:mustUnderstand': 0,
          'xsi:type': 'ns1:SoapRequestHeader',
          'xmlns:ns1': `https://www.google.com/apis/ads/publisher/${this.conf.apiVersion}`,
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xmlns:soapenv': 'http://schemas.xmlsoap.org/soap/envelope/'
        },
        'ns1:networkCode': this.conf.networkCode,
        'ns1:applicationName': this.conf.applicationName
      }
    };
  }

};

