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
  }

  request(serviceName, methodName, args) {
    let authClient = null;
    return of(this).pipe(
      // TODO: let's not authorize each time, re-use JWT token given for 1h
      map(_ => auth.fromJSON(this.conf.jwtAuth)),
      tap(_authClient => authClient = _authClient),
      tap(authClient => authClient.scopes = ['https://www.googleapis.com/auth/dfp']),
      flatMap(authClient => from(authClient.authorize())),
      // TODO: let's cache clients?
      flatMap(_ => from(soap.createClientAsync(`https://ads.google.com/apis/ads/publisher/${this.conf.apiVersion}/${serviceName}?wsdl`))),
      tap(soapClient => {
        soapClient.addSoapHeader(this.formSoapHeaders());
        soapClient.setSecurity(new soap.BearerSecurity(authClient.credentials.access_token));
      }),
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

