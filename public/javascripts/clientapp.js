function domReady() { 
  var canvas, context;
  var canvaso, contexto;
  var canvasr, contextr;
  
	MochaUI.Desktop = new MochaUI.Desktop();
	MochaUI.Dock = new MochaUI.Dock();

	new MochaUI.Column({
	  id: 'mainColumn',
		placement: 'main',	
		width: null,
		resizeLimit: [100, 300]
	});

	var column=new MochaUI.Column({
		id: 'sideColumn2',
		placement: 'right',	
		width: 220,		
		resizeLimit: [195, 300]
	});

	var panel= new MochaUI.Panel({
		id: 'doodle-panel',
		title: 'Doodle',
		contentURL: 'pages/file-view.html',
		column: 'mainColumn',
		content: document.getElementById('container'),
		padding: { top: 0, right: 0, bottom: 0, left: 0 }  
	});

    MochaUI.NewWindowsFromHTML = new MochaUI.NewWindowsFromHTML();
  	
  	MochaUI.Modal = new MochaUI.Modal();
  	MochaUI.Desktop.desktop.setStyles({
  		'background': '#fff',
  		'visibility': 'visible'
  	});
  var clientConfig = {
    id: 0,
    ready: false,
    nextId: 1
  };
  
  var getNextObjectId= function() {
    if( clientConfig.ready ) {
      return clientConfig.id + "-" + clientConfig.nextId++;
    }
    else {
      return -1; 
    }
  }
  var ws_address= window.location.host;
  ws_address= "ws://"+ ws_address.replace(/:8080/, ":8081");
  var dispatcher = new EventsDispatcher( ws_address );

  // bind to server events
  dispatcher
    .bind( Protocol.NEW_PRIMITIVE, function(primitive) {
      switch(primitive[1]) {
        case 'box':
          contextr.strokeRect(primitive[2], primitive[3], primitive[4], primitive[5]);
          break;
        case 'line':
          contextr.beginPath();
          contextr.moveTo(primitive[2], primitive[3]);
          contextr.lineTo(primitive[4], primitive[5]);
          contextr.stroke();
          contextr.closePath();
          break; 
        case 'path':
          contextr.beginPath();
          for(var j=0;j< primitive[2].length;j++ ) {
            var cmd=primitive[2][j]; 
            if( cmd[0] == 'M' ) {
              contextr.moveTo(cmd[1], cmd[2])
            }else if ( cmd[0] == 'L' ) {
              contextr.lineTo(cmd[1], cmd[2])
            }
          }
          contextr.stroke();
          break;
      }

      contexto.drawImage(canvasr, 0, 0);
      contextr.clearRect(0, 0, canvas.width, canvas.height);
    })
    .bind( Protocol.WIPE, function(id) { 
      contexto.clearRect(0, 0, canvas.width, canvas.height);
    })
    .bind( Protocol.CLIENT_ID, function(id) { 
      clientConfig.id= id;
      clientConfig.ready= true;      
    })
    .bind( Protocol.OPENED, function(){
      console.log( "OPENED" )
    })
    .bind( Protocol.CLOSED, function() { 
      console.log( "CLOSED" )
    });

  /* Borrowing heavily from: http://dev.opera.com/articles/view/html5-canvas-painting/ */
  


     // The active tool instance.
    var tool = false;
    var tool_default = 'rect';

    // Initialization sequence.
    function init () {
      // Find the canvas element.
        canvaso = document.getElementById('imageView');
        if (!canvaso) {
          alert('Error: I cannot find the canvas element!');
          return;
        }

        if (!canvaso.getContext) {
          alert('Error: no canvas.getContext!');
          return;
        }

        // Get the 2D canvas context.
        contexto = canvaso.getContext('2d');
        if (!contexto) {
          alert('Error: failed to getContext!');
          return;
        }

        // Add the temporary canvas.
        var container = canvaso.parentNode;


        canvasr = document.createElement('canvas');
        if (!canvasr) {
          alert('Error: I cannot create a new canvas element!');
          return;
        }

        canvasr.id     = 'imageRemote';
        canvasr.width  = canvaso.width;
        canvasr.height = canvaso.height;
        container.appendChild(canvasr);

        contextr = canvasr.getContext('2d');

            canvas = document.createElement('canvas');
        if (!canvas) {
          alert('Error: I cannot create a new canvas element!');
          return;
        }

        canvas.id     = 'imageTemp';
        canvas.width  = canvaso.width;
        canvas.height = canvaso.height;
        container.appendChild(canvas);

        context = canvas.getContext('2d');

       // Get the tool select input.
       var tool_select = document.getElementById('dtool');
       if (!tool_select) {
         alert('Error: failed to get the dtool element!');
         return;
       }
       tool_select.addEventListener('change', ev_tool_change, false);

       // Activate the default tool.
       if (tools[tool_default]) {
         tool = new tools[tool_default]();
         tool_select.value = tool_default;
       }     

      // Attach the mousedown, mousemove and mouseup event listeners.
      canvas.addEventListener('mousedown', ev_canvas, false);
      canvas.addEventListener('mousemove', ev_canvas, false);
      canvas.addEventListener('mouseup',   ev_canvas, false);
    }

    // This function draws the #imageTemp canvas on top of #imageView,
    // after which #imageTemp is cleared. This function is called each time when the
    // user completes a drawing operation.
    function img_update () {
//        contexto.drawImage(canvas, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // The event handler for any changes made to the tool selector.
    function ev_tool_change (ev) {
      if (tools[this.value]) {
        tool = new tools[this.value]();
      }
    }

    var tools = {};    

    // This painting tool works like a drawing pencil which tracks the mouse 
    // movements.
    tools.pencil= function() {
      var tool = this;
      this.started = false;
      
      // This is called when you start holding down the mouse button.
      // This starts the pencil drawing.
      this.mousedown = function (ev) {
        if( tool.id != -1 ) {
          tool.started = true;
          context.beginPath();
          context.moveTo(ev._x, ev._y);
          tool.path_commands=[];
          tool.path_commands[tool.path_commands.length] = ['M', ev._x, ev._y]
        }
        else { tool.started= false;}
      };

      // This function is called every time you move the mouse. Obviously, it only 
      // draws if the tool.started state is set to true (when you are holding down 
      // the mouse button).
      this.mousemove = function (ev) {
        if (tool.started) {
          context.lineTo(ev._x, ev._y);
          tool.path_commands[tool.path_commands.length] = ['L', ev._x, ev._y]
          context.stroke();
        }
      };

      // This is called when you release the mouse button.
      this.mouseup = function (ev) {
        if (tool.started) {
          tool.mousemove(ev);
          tool.started = false;
          dispatcher.trigger( Protocol.NEW_PRIMITIVE, [getNextObjectId(), 'path', tool.path_commands] )
          img_update();
        }
      };
    }

    tools.rect = function () {
      var tool = this;
      this.started = false;

      this.mousedown = function (ev) {
        tool.id= getNextObjectId();
        if( tool.id != -1 ) {
          tool.started = true;
          tool.x0 = ev._x;
          tool.y0 = ev._y; 
          tool.w= 1;
          tool.h= 1;
        } else {
          this.started= false;
        }
      };

      this.mousemove = function (ev) {
        if (!tool.started) {
          return;
        }

        tool.x = Math.min(ev._x,  tool.x0);
        tool.y = Math.min(ev._y,  tool.y0);
        tool.w = Math.abs(ev._x - tool.x0);
        tool.h = Math.abs(ev._y - tool.y0);

        context.clearRect(0, 0, canvas.width, canvas.height);

        if (!tool.w || !tool.h) {
          return;
        }

        context.strokeRect(tool.x, tool.y, tool.w, tool.h);
      };

      this.mouseup = function (ev) {
        if (tool.started) {
          tool.mousemove(ev);
          tool.started = false;
          dispatcher.trigger( Protocol.NEW_PRIMITIVE, [tool.id, 'box', tool.x, tool.y, tool.w,tool.h])
          img_update();
        }
      };
    };
    tools.line = function () {
      var tool = this;
      this.started = false;

      this.mousedown = function (ev) {
        if( tool.id != -1 ) {
          tool.started = true;
          tool.x0 = tool.x1= ev._x;
          tool.y0 = tool.y1 = ev._y;
        }
        else {
          tool.started= false;
        }
      };

      this.mousemove = function (ev) {
        if (!tool.started) {
          return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        tool.x1= ev._x;
        tool.y1= ev._y;
        context.beginPath();
        context.moveTo(tool.x0, tool.y0);
        context.lineTo(tool.x1, tool.y1);
        context.stroke();
        context.closePath();
      };

      this.mouseup = function (ev) {
        if (tool.started) {
          tool.mousemove(ev);
          tool.started = false;
          dispatcher.trigger( Protocol.NEW_PRIMITIVE, [getNextObjectId(), 'line', tool.x0, tool.y0, tool.x1,tool.y1])
          img_update();
        }
      };
    };  

    // The general-purpose event handler. This function just determines the mouse 
    // position relative to the canvas element.
    function ev_canvas (ev) {
      if (ev.layerX || ev.layerX == 0) { // Firefox
        ev._x = ev.layerX;
        ev._y = ev.layerY;
      } else if (ev.offsetX || ev.offsetX == 0) { // Opera
        ev._x = ev.offsetX;
        ev._y = ev.offsetY;
      }

      // Call the event handler of the tool.
      var func = tool[ev.type];
      if (func) {
        func(ev);
      }
    }
    init();

    var resizeFunction= function(noRefresh) {
      var newWidth= panel.panelEl.getSize().x - 1;
      var newHeight= panel.panelEl.getSize().y - 1;
      if( newWidth > canvas.width ) {
        canvaso.width= newWidth;
        canvasr.width= newWidth;
         canvas.width= newWidth;
      }
  	  if( newHeight > canvas.height ) {
  	    canvaso.height= newHeight;
  	    canvasr.height= newHeight;
  	     canvas.height= newHeight;
	    }
	    if( noRefresh !== false )  {
	      dispatcher.trigger( Protocol.REFRESH );
	    }
    }
    resizeFunction(false); // Call initially.
  	window.addEvent( 'resize',   resizeFunction );
  	column.addEvent( 'resize',   resizeFunction );
  	column.addEvent( 'collapse', resizeFunction );
}
(function(){
  if(document.body && document.body.lastChild) {
    domReady();
  } 
  else {
    return setTimeout(arguments.callee,0);
  }
})();

