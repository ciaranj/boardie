$(document).ready(function () { 
  var objectPool = {
    nextId: 0,
    maxId: 0,
    available: false
  };
  
  var getNextObjectId= function() {
    // Really we need to set a time when the object-pool was marked
    // as un-available so we can re-request as appropriate.
    if( objectPool.available ) {
      var result= objectPool.nextId++;
      if( result >= objectPool.maxId ) {
        objectPool.available= false; 
        ws.send(JSON.stringify([2,[2]]))
      }
      return result;
    }
    else {
      return -1; 
    }
  }
  var ws = $.ws.conn({
    url : 'ws://localhost:8080',
    hbStr: null,
    onopen : function () {
      console.log('connected');
    },
    onmessage : function (event) {          
      try {
        var packets=eval(event);
        if( packets[0] == 2 ) {
          for(var i=0;i< packets[1].length;i++)  {
            if( packets[1][i][0] == 1) { //OBJECT_ID_INFORMATION
              objectPool.nextId= packets[1][i][1];
              objectPool.maxId = objectPool.nextId + packets[1][i][2] - 1 ;
              objectPool.available= true;
            }
          }
        }
        else {
          contextr.clearRect(0, 0, canvas.width, canvas.height);
          for(var i=0;i< packets[1].length;i++)  {
              switch(packets[1][i][1]) {
                case 'box':
                  contextr.strokeRect(packets[1][i][2], packets[1][i][3], packets[1][i][4], packets[1][i][5]);
                  break;
                case 'line':
                  contextr.beginPath();
                  contextr.moveTo(packets[1][i][2], packets[1][i][3]);
                  contextr.lineTo(packets[1][i][4], packets[1][i][5]);
                  contextr.stroke();
                  contextr.closePath();
                  break; 
                case 'path':
                  contextr.beginPath();
                  for(var j=0;j< packets[1][i][2].length;j++ ) {
                    var cmd=packets[1][i][2][j]; 
                    if( cmd[0] == 'M' ) {
                      contextr.moveTo(cmd[1], cmd[2])
                    }else if ( cmd[0] == 'L' ) {
                      contextr.lineTo(cmd[1], cmd[2])
                    }
                  }
                  contextr.stroke();
                  break;
              }
          } 
          contexto.drawImage(canvasr, 0, 0);
        }
      }
      catch(e) {
       console.log(e +" : " + event);
      }
    },

    onclose : function (event) {
      console.log('disconnected');
    }
  });
  /* Borrowing heavily from: http://dev.opera.com/articles/view/html5-canvas-painting/ */
  
    var canvas, context;
    var canvaso, contexto;
    var canvasr, contextr;

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
          $(ws).wssend(JSON.stringify([1,[getNextObjectId(), 'path', tool.path_commands]]));
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
          $(ws).wssend(JSON.stringify([1,[tool.id, 'box', tool.x, tool.y, tool.w,tool.h]]));
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
          $(ws).wssend(JSON.stringify([1,[getNextObjectId(), 'line', tool.x0, tool.y0, tool.x1,tool.y1]]));
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
});
