//==========================================================
// Mootools  port of jQuery plugin jquery.ws.js  (see http://bloga.jp/ws/jq/ for the original)
// for Web Sockets
//==========================================================
var MooSocket = new Class({
        Implements: [Options],
        options: {
          url            : "ws://"+location.host,
          onopen         : undefined, /*  I think this will auto add the 'events' implementation which I don't really want :( */
          onclose        : undefined,
          onmessage      : undefined,
          data           : null,
          logger         : function(msg) {console.log(msg);},
          loggingEnabled : false,
          hbStr      : "Heartbeat",//if null then no Heartbeat
          hbinterval : 60000,//dafault 60sec, min=5000 
          onheartbeat: function(){}//callback on heartbeatsended 
        }, 
        
        initialize: function(options){
          this.setOptions(options);
          if ("WebSocket" in window) {
            if( this.options.loggingEnabled && this.options.logger ) 
              this._logger= this.options.logger; 
              
            this._onopen= this.options.onopen;
            this._onclose= this.options.onclose;
            this._onmessage= this.options.onmessage; 
            this._onheartbeat= this.options.onheartbeat; 

            //Heartbeat calculations.
            var _MIN_HBINTERVAL=5000,
                _INI_HBINTERVAL=60000;
            this.hbtimer=null;
            this.hbStr  = (this.options.hbStr===null)?null:(typeof this.options.hbStr==='string')?this.options.hbStr:'Heartbeat';
            this.hbinterval = (typeof this.options.hbinterval==='number')? (this.options.hbinterval>=_MIN_HBINTERVAL)?this.options.hbinterval:_INI_HBINTERVAL : _INI_HBINTERVAL;

            
            this.wsoj = new WebSocket( this.options.url );
            
            if( this._logger ) {
              var logger= this._logger   
              var logFirstFunction= function(fnPrefix, fn)  {
                return function(e) {
                  logger(fnPrefix + " : " + JSON.encode(e) );
                  fn(e);
                };
              };
              this.wsoj.onopen= logFirstFunction( "Socket Opened : ", this._socketOpened.bind(this) );
              this.wsoj.onmessage= logFirstFunction( "Message Received : " , this._messageReceived.bind(this) );
              this.wsoj.onclose= logFirstFunction( "Socket Closed : ", this._socketClosed.bind(this) );
              if( this.hbStr!==null && this._onheartbeat ) this.onheartbeat= logFirstFunction( "Heartbeat fired : " + this._onheartbeat.bind(this) );
            }  
            else {
              this.wsoj.onopen= this._socketOpened.bind(this);
              this.wsoj.onmessage= this._messageReceived.bind(this);
              this.wsoj.onclose= this._socketClosed.bind(this);
              if( this.hbStr!==null && this._onheartbeat ) this.onheartbeat= this._onheartbeat.bind(this);
            }
            
            // Send any initial data
            this.wssend(this.options.data);
                        
            //WS auto cloase
           $(window).addEvent("unload", this.wsclose.bind(this));    
          }
          else {
            //no support, message once.
            if(!MooSocket.nosupport){
              if(!MooSocket.nosupportmsg)
                alert("no support, please use Chrome4 (v 4.0.238.0 +) or \n Safari nightly");
              MooSocket.nosupport=true;
            } 
          }
        },
        
        wsclose: function() {
          this.wsoj.close();
          this.wsoj=null;
        },

        //Send to WS Server $(webSocketOj).wssend(data)
        wssend : function(data){
          if(data){ 
             this.wsoj.send(data);
          }
          return this;
        },        
        
        _socketOpened: function(e) { 
          try { 
            if( this._onopen ) this._onopen(e); 
          }
          catch( ex ) {
            if( this._logger ) this._logger("Error in onopen handler: " + ex)
          }
          if(this.hbStr!==null){
            var self= this;
            this.hbtimer = setInterval(function(){
              if(self._onheartbeat){self._onheartbeat(self)}
              self.wssend(self.hbStr);
            }, this.options.hbinterval);
          }          
        },
        
        _socketClosed: function(e) {
          try {
            if( this._onclose ) this._onclose(e);
          }
          catch ( ex ) {
            if( this._logger ) this._logger("Error in onclose handler: " + ex)
          } 
          if( this.hbtimer ) {
            clearInterval( this.hbtimer );
            hbtimer = null;
          }          
          this.wsoj= null;  
        },
        
        _messageReceived: function(e) {
          try {
            if( this._onmessage) this._onmessage(e.data.replace(/<script(.|\s)*?\/script>/g, ""), this);
          }
          catch( ex ) {
            if( this._logger ) this._logger("Error in onmessage handler: " + ex)
          }
        }
});