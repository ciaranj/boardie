/* Based on the ideas of Ismael Celis 2010 (http://gist.github.com/299789)

 Higher level web sockets event dispatcher

*/

var EventsDispatcher = function(s_url) {
  var callbacks = {};

  var dispatch = function(event_name, message){
    var chain = callbacks[event_name];
    if(typeof chain == 'undefined') return; // no callbacks for this event
    for(var i = 0; i < chain.length; i++){
      chain[i]( message )
    }
  }
  
  var ms= new MooSocket({
     url : s_url,
     hbStr: null,
     loggingEnabled: false, 
     onclose : function (event) {
       dispatch( Protocol.CLOSED, null );
     },     
     onopen : function () {
       dispatch( Protocol.OPENED, null );
     },    

     onmessage : function (message) { 
       try {
         var data = eval(message);
         for( var i=0;i< data.length; i++ ) {
           dispatch(data[i][0], data[i][1]);
         }
       }
       catch(e) {
        console.log(e +" : " + event);
       }
     }                       
   });
    
  this.bind = function(event_name, callback){
    callbacks[event_name] = callbacks[event_name] || [];
    callbacks[event_name].push(callback);
    return this;// chainable
  };
  
  this.trigger = function(event_name, data){
    var payload = JSON.encode([event_name, data]);
    ms.wssend( payload );
    return this;
  };
}