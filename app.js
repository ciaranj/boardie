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
const CONTROL_PACKET= 2;

const OBJECT_ID_INFORMATION= 1;  // Shared State packet operations 
const REQUEST_OBJECT_ID_INFORMATION= 2;

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

var options= {
  max_connections: 1000,
  hilo_range: 10
};

var next_range= 1;
var getCurrentRange= function() {
  var current_range= next_range;
  next_range+= options.hilo_range;
  return current_range 
}

ws.createServer(function (websocket) {
  var connection_id = 0,
      control_messages=[];
        
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
     if( control_messages && control_messages.length > 0 ) { 
       packet_data= [];
       while ((msg = control_messages.shift())) {       
         packet_data.push(JSON.stringify( msg ));
       }
       control_messages= [];
       var dataOnTheWire= '[' + CONTROL_PACKET + ',[' + packet_data.join(',') + ']]';
       this.write(dataOnTheWire);
     }
  }

    /**
     * Forces a connection to be disconnected.
     */
    websocket.kill = function(reason) {
      var disconnect_reason = reason || 'Unknown Reason';
      delete control_messages;
      this.close();
    }        

     /**
      * Stringify speicified object and sends it to remote part.
      */
     websocket.send_control = function(msg) {
       control_messages[control_messages.length]= msg;
     }
     
     websocket.fetch_new_object_ids= function() {
       websocket.send_control([OBJECT_ID_INFORMATION,getCurrentRange(),options.hilo_range]);
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
          websocket.fetch_new_object_ids();
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
    sys.debug("connect: " + resource); 
    websocket.set_state(CONNECTED);
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
     if( packet[0] == DEFAULT_PACKET ) {
       operations[operations.length] = packet[1];
     }
     else {
        if( packet[1][0] == REQUEST_OBJECT_ID_INFORMATION ) {
          websocket.fetch_new_object_ids();  
        }
     }
    }).addListener("close", function () { 
      // emitted when server or client closes connection
      sys.debug("close");
  });
}).listen(8080);
