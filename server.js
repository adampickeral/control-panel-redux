var app, express, request, httpServer, bodyParser, cookieParser, session;

express = require('express');
request = require('request');
httpServer = require('http');
bodyParser = require('body-parser');
cookieParser = require('cookie-parser');
session = require('express-session');

app = express();

app.set('title', 'Region List');

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.use(
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }),
  cookieParser('weoiajsdlkA(*UDlk3j'),
  session(),
  express.static(__dirname + '/css'),
  express.static(__dirname + '/js')
);

app.post('/login', function (req, res) {
  var username, password, options, formData;

  username = req.body.username;
  password = req.body.password;

  formData = {
    "auth": {
      "passwordCredentials": {
        "username": username,
        "password": password
      }
    }
  };

  options = {
    uri: 'https://identity.api.rackspacecloud.com/v2.0/tokens',
    headers: {
      'content-type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(formData)
  };


  request.post(options, function (error, response, body) {
    if (response.statusCode == 200) {
      req.session.regenerate(function () {
        var responseBody = JSON.parse(body);
        req.session.id = responseBody['access']['token']['tenant']['id'];
        req.session.token = responseBody['access']['token']['id'];
        req.session.serviceCatalog = responseBody['access']['serviceCatalog'];
        res.redirect('/servers');  
      })
    } else {
      res.redirect('/?loginFailed=true');
    }
  });
});

app.get('/', function (req, res) {
  res.render('login.ejs');
});

app.get('/servers', function (req, res) {
  res.render('index.ejs');
});

app.get('/heat', function (req, res) {
  res.render('index.ejs');
});

function getRegionEndpoints(serviceCatalog, productName, region) {
  var endpoints, computeRegions;

  computeRegions = serviceCatalog.filter(function (catalog) {
    return catalog['name'] === productName;
  });
  endpoints = [];
  computeRegions.forEach(function (computeRegion) {
    computeRegion['endpoints'].forEach(function(endpoint) {
      if (endpoint['region'] === region || region === 'US') {
        endpoints.push({
          'publicURL': endpoint['publicURL'],
          'region': endpoint['region']
        });
      }
    });
  });
  return endpoints;
};

app.get('/compute-servers', function (req, res) {
  var region, servers, finishRequest, requests, serverEndpoints;

  region = req.query.region;

  servers = [];
  requests = 0;

  serverEndpoints = getRegionEndpoints(
    req.session.serviceCatalog,
    'cloudServersOpenStack',
    region
  );

  finishRequest = function () {
    requests++;
    if (requests === serverEndpoints.length) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(servers));
    }
  };

  serverEndpoints.forEach(function (endpoint) {
    options = {
      uri: endpoint['publicURL'] + '/servers/detail',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': req.session.token
      }
    };
    request.get(options, function (error, response, body) {
      var serversResponse;
      if (error) {
        console.log(error);
        console.log(body);
        throw 'failed getting servers';
      }
      serversResponse = JSON.parse(body);
      serversResponse['servers'].forEach(function (server) {
        server['region'] = endpoint['region'];
      });
      servers.push.apply(servers, serversResponse['servers']);
      finishRequest();
    }.bind(this));
  }.bind(this));
});

app.get('/heat-stacks', function (req, res) {
  var region, stacks, finishRequest, requests, stackEndpoints;

  region = req.query.region;

  stacks = [];
  requests = 0;

  stackEndpoints = getRegionEndpoints(
    req.session.serviceCatalog,
    'cloudOrchestration',
    region
  );

  finishRequest = function () {
    requests++;
    if (requests === stackEndpoints.length) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(stacks));
    }
  };

  stackEndpoints.forEach(function (endpoint) {
    options = {
      uri: endpoint['publicURL'] + '/stacks',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': req.session.token
      }
    };
    request.get(options, function (error, response, body) {
      var stacksResponse;
      if (error) {
        console.log(error);
        console.log(body);
        throw 'failed getting stacks';
      }
      stacksResponse = JSON.parse(body);
      stacksResponse['stacks'].forEach(function (stack) {
        stack['region'] = endpoint['region'];
      });
      stacks.push.apply(stacks, stacksResponse['stacks']);
      finishRequest();
    }.bind(this));
  }.bind(this));
});

app.get('/heat-stacks/templates', function (req, res) {
  var region, templates, finishRequest, requests, templateEndpoints;

  region = req.query.region;

  templates = [];
  requests = 0;

  templateEndpoints = getRegionEndpoints(
    req.session.serviceCatalog,
    'cloudOrchestration',
    region
  );

  finishRequest = function () {
    requests++;
    if (requests === templateEndpoints.length) {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(templates));
    }
  };

  templateEndpoints.forEach(function (endpoint) {
    options = {
      uri: endpoint['publicURL'] + '/templates',
      headers: {
        'Accept': 'application/json',
        'X-Auth-Token': req.session.token
      }
    };
    request.get(options, function (error, response, body) {
      var templatesResponse;
      if (error) {
        console.log(error);
        console.log(body);
        throw 'failed getting templates';
      }
      templatesResponse = JSON.parse(body);
      templatesResponse['templates'].forEach(function (template) {
        template['region'] = endpoint['region'];
      });
      templates.push.apply(templates, templatesResponse['templates']);
      finishRequest();
    }.bind(this));
  }.bind(this));
});

function getRegionEndpoint(serviceCatalog, productName, region) {
  var computeRegions, regionEndpoint;

  computeRegions = serviceCatalog.filter(function (catalog) {
    return catalog['name'] === productName;
  });

  computeRegions[0]['endpoints'].forEach(function (endpoint) {
    if (endpoint['region'] === region) {
      regionEndpoint = endpoint;
    }
  });
  return regionEndpoint;
};

app.get('/heat-stacks/:region/:stackId', function (req, res) {
  var region, options, stackEndpoint;

  region = req.params.region;
  stackId = req.params.stackId;

  stackEndpoint = getRegionEndpoint(
    req.session.serviceCatalog,
    'cloudOrchestration',
    region
  );

  options = {
    uri: stackEndpoint['publicURL'] + '/stacks/' + stackId,
    headers: {
      'Accept': 'application/json',
      'X-Auth-Token': req.session.token
    }
  };
  request.get(options, function (error, response, body) {
    var stackResponse;
    if (error) {
      console.log(error);
      console.log(body);
      throw 'failed getting stacks';
    }
    stackResponse = JSON.parse(body);
    stackResponse['stack']['region'] = stackEndpoint['region'];
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(stackResponse));
  }.bind(this));
});

server = httpServer.createServer(app);
server.listen(3000);
console.log('Listening on port 3000');
