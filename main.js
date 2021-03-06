var redis = require('redis')
var multer  = require('multer')
var express = require('express')
var fs      = require('fs')
var http = require('http')
var httpProxy = require('http-proxy')
var app = express()
// REDIS

var REDISPORT = args[0];

var client = redis.createClient(REDISPORT, '127.0.0.1', {});

var MIRROR_TO = args[1];

var mirrorClient = undefined;
if (MIRROR_TO) {
  mirrorClient = redis.createClient(MIRROR_TO, '127.0.0.1', {}) ; 
}


///////////// WEB ROUTES

// Add hook to make it easier to get all visited URLS.
app.use(function(req, res, next) 
{
	console.log(req.method, req.url);

	client.lpush("urllist", req.url);
    client.ltrim("urllist", 0, 4);

	next(); // Passing the request to the next handler in the stack.
});


 app.post('/upload',[ multer({ dest: './uploads/'}), function(req, res){
    console.log(req.body) // form fields
    console.log(req.files) // form files

    if( req.files.image )
    {
 	   fs.readFile( req.files.image.path, function (err, data) {
 	  		if (err) throw err;
 	  		var img = new Buffer(data).toString('base64');
 	  		console.log("Pushing image");
            client.rpush("imageList", img);
            if (mirrorClient) {
                mirrorClient.rpush("imageList",img);
            }
 		});
 	}

    res.status(204).end()
 }]);

 app.get('/meow', function(req, res) {
     client.rpop("imageList", function(err, imagedata)   {
 		if (err) throw err
 		res.writeHead(200, {'content-type':'text/html'});
        res.write("<h1>\n<img src='data:my_pic.jpg;base64,"+imagedata+"'/>");
    	res.end();
 	});
 });

app.get('/', function(req, res) {
    client.get("number of visits", function(err, value) {
        res.send('hello world '+value+'<form action="upload" method="post" enctype="multipart/form-data">Select image to upload:<br/><input type="file" name="image" id="image"><input type="submit" value="Upload Image" name="submit"></form>');
        client.incr("number of visits");
    });
  
})

app.get('/recent', function(req, res) {
    client.lrange("urllist", 0,10, function(err, value) {
        res.send('hello world '+value);
    });
  
})

app.get('/get', function(req, res) {
    client.get("mykey", function(err, value) {
        if (err) {
            console.log(err);
        }
        
        if (value) {
            client.ttl("mykey", function(err, value){   
                if (err) {
                    console.log(err);
                }
                res.send("This message will self-destruct in "+value +" seconds");
            });
            
        } else {
            res.send('The clock has begun');
            client.set("mykey", "SOMETHING");
            client.expire("mykey", 10);
        }
    });
  
})

// HTTP SERVER
 var server = app.listen(3000, function () {

   var host = server.address().address
   var port = server.address().port

   console.log('Example app listening at http://%s:%s', host, port)
 });
 
 // HTTP SERVER
 var server2 = app.listen(3001, function () {

   var host = server.address().address
   var port = server.address().port

   console.log('Example app listening at http://%s:%s', host, port)
 })

 var addresses = [
  {
    host: '127.0.0.1',
    port: 3000
  },
  {
    host: '127.0.0.1',
    port: 3001
  }
];
 
 var proxy = httpProxy.createServer();

http.createServer(function (req, res) {
    //
    // On each request, get the index of which address to use
    // and increment it
    client.incr("addressIndex", function(err, value){
        console.log(value);
        var target = { target: addresses[value % addresses.length] };

        //
        // ...then proxy to the server whose 'turn' it is...
        //
        console.log('balancing request to: ', target);
        proxy.web(req, res, target);
    });


}).listen(80);
