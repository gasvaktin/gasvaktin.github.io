/**
 * A simple script for easily serving a folder containing static website.
 * It's shamelessly snatched from https://gist.github.com/ryanflorence/701407
 * and might be vulnerable to directory traversal attack, yet I've not been
 * able to make such an attack work.
 * 
 * TODO: maybe fix ugly repetitiveness?
 **/
var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    port = process.argv[2] || 8888;

var has404file = false,
    file404 = path.join(process.cwd(), "/404.html");

fs.exists(file404, function(exists) {
  if(exists) {
    console.log("Found 404.html file, will be served on 404 ..");
    has404file = true;
  }
});

http.createServer(function(request, response) {
  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);

  fs.exists(filename, function(exists) {
    if(!exists) {
      if(has404file) {
        fs.readFile(file404, "binary", function(err, filerino) {
          if(err) {
            response.writeHead(500, {"Content-Type": "text/plain"});
            response.write(err + "\n");
            response.end();
            return;
          }
          response.writeHead(404);
          response.write(filerino, "binary");
          response.end();
        });
      }
      else {
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write("404 Not Found\n");
        response.end();
      }
      return;
    }

    if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    fs.exists(filename, function(indexFileExists) {
      if(!indexFileExists) {
        if(has404file) {
          fs.readFile(file404, "binary", function(err, filerino) {
            if(err) {
              response.writeHead(500, {"Content-Type": "text/plain"});
              response.write(err + "\n");
              response.end();
              return;
            }
            response.writeHead(404);
            response.write(filerino, "binary");
            response.end();
          });
        }
        else {
          response.writeHead(404, {"Content-Type": "text/plain"});
          response.write("404 Not Found\n");
          response.end();
        }
        return;
      }

      fs.readFile(filename, "binary", function(err, file) {
        if(err) {
          response.writeHead(500, {"Content-Type": "text/plain"});
          response.write(err + "\n");
          response.end();
          return;
        }
        var contentType = "text/plain";
        if(filename.endsWith(".html")) {
          contentType = "text/html";
        }
        else if(filename.endsWith(".css")) {
          contentType = "text/css";
        }
        response.writeHead(200, {"Content-Type": contentType});
        response.write(file, "binary");
        response.end();
      });
    });
  });
}).listen(parseInt(port, 10), "0.0.0.0");

console.log("Static file server running at");
console.log("  => http://localhost:" + port + "/");
console.log("CTRL + C to shutdown");
