var sys = require("sys"),
  ws = require("./ws"); 
  
const CONNECTED= 1,
      DISCONNECTED  = -1;

var operations= [];
var connections= {};
var no_connections= 0;
var disconnect_reason = 'Closed by client';
var outstanding_flushes= 0;

//Packet types:
const DEFAULT_PACKET= 1;

/**
 * Flushes all connection queues.
 * @return {undefined} Nothing
 */
function flush_queues() {
  if( outstanding_flushes <= 0 ) {
    for (var id in connections) {             
      var connection = connections[id];
      if (connection.state != CONNECTED) {
        continue;
      }
      ;(function(conn) { 
        outstanding_flushes++;
          process.nextTick(
            function() {
              try { 
                conn.flush_queue();
              }catch(e) {
                sys.debug(e);
              }
              finally {
                outstanding_flushes--;
              }
            }); 
       })(connection)
    }
  }
}

setInterval(flush_queues, 10);


ws.createServer(function (websocket) {
  var connection_id = 0,
        message_queue = [],
        options= {
          max_connections: 1000
        };
        
  websocket.flush_queue= function() {
    var  msg = null,
         packet_data = [];
    
     if( websocket.operationsSeen < operations.length ) {
        for( var i = websocket.operationsSeen; i < operations.length; i++ ) {
          var data = JSON.stringify( operations[i] );
          packet_data.push(data);
        }

        websocket.operationsSeen= operations.length; 
        var dataOnTheWire= '[' + DEFAULT_PACKET + ',[' + packet_data.join(',') + ']]';
        this.write(dataOnTheWire);
     }
  }

    /**
     * Forces a connection to be disconnected.
     */
    websocket.kill = function(reason) {
      var disconnect_reason = reason || 'Unknown Reason';
      this.close();
      message_queue = [];
    }        

     /**
      * Stringify speicified object and sends it to remote part.
      */
     websocket.post = function(data) {
       var packet = JSON.stringify(data);
       this.write(packet);
     }
    /**
     * Sets the state of the connection
     */
    websocket.set_state = function(new_state) {
      switch (new_state) {
        case CONNECTED:
          if (no_connections++ > options.max_connections) {
            websocket.kill('server busy');
            return;
          }
          sys.debug('Active connections: ' + no_connections)
          while (connections[++connection_id]);
          websocket.id = connection_id;
          websocket.operationsSeen=0;
          connections[websocket.id] = websocket;  
          websocket.flush_queue();
          break;
        case DISCONNECTED:
         if (websocket.id && connections[websocket.id]) {
           delete connections[websocket.id];
           no_connections--;
         }
         sys.debug('Active connections: ' + no_connections)
         break;
      }
      websocket.state = new_state; 
  };
  websocket.addListener('close', function() {
    websocket.set_state(DISCONNECTED);
  }).addListener("connect", function (resource) { 
    // emitted after handshake
    sys.debug(sys.inspect(resource))
    sys.debug("connect: " + resource); 
    websocket.write("welcome\r\n");
    websocket.set_state(CONNECTED);

//    setTimeout(websocket.close, 10 * 1000); // server closes connection after 10s, will also get "close" event

  }).addListener("data", function (data) { 
    var packet = null;

     try {
       packet = JSON.parse(data);
     } catch(e) {
       sys.debug('Malformed message recieved');
       sys.debug(sys.inspect(data));
       websocket.kill('Malformed message sent by client');
       return;
     }
      operations[operations.length] = packet[1];
    }).addListener("close", function () { 

    // emitted when server or client closes connection
    sys.debug("close");

  });
}).listen(8080);
