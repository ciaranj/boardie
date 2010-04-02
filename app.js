var sys= require('sys');

require('./lib/ws_server'); // Pull in and start the web socket server
require('./lib/express_server').startServer(__dirname, 8080); // Pull in and start the express http server
sys.puts( 'Server Started' )
