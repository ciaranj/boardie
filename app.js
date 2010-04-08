var sys= require('sys');

require('./lib/express_server').startServer(__dirname, 8080, null); // Pull in and start the express http server
require('./lib/ws_server'); // Pull in and start the web socket server
sys.puts( 'Server Started' )